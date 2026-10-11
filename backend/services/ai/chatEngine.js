/**
 * AI Chat Engine
 *
 * user message → context (who, where, when, recent chat) → LLM with tool calling →
 * tools run against the real database → friendly answer + structured "cards"
 * the UI can render (rooms, payments, reminders…).
 *
 * If no AI provider is reachable, a rule-based intent engine answers instead,
 * so the assistant keeps working offline.
 */

import { callOpenAI, isAIConfigured } from './openaiClient.js';
import { getFunctionsByRole } from './functionRegistry.js';
import { executeFunction } from './functionExecutor.js';
import { detectLanguage } from './languageDetector.js';
import ChatHistory from '../../models/ChatHistory.js';
import User from '../../models/User.js';
import { v4 as uuidv4 } from 'uuid';

const PG_NAME = process.env.PG_NAME || 'SmartPG';
const MAX_TOOL_ROUNDS = 6;
const MAX_TOOL_RESULT_CHARS = 7000;

function systemPrompt(user, role) {
  const now = new Date();
  const today = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const iso = now.toISOString().slice(0, 10);
  const first = user?.name?.split(' ')[0] || 'there';

  const shared = `
Today is ${today}, ${time} (ISO date ${iso}). Convert relative dates ("tomorrow", "next Monday") using this.

How to talk:
- Sound like a friendly, competent human manager — warm, natural, never robotic. Use the person's first name occasionally, not in every message.
- Be concise: lead with the answer. Use short bullet lists or a small markdown table when listing several items. Bold key numbers.
- Money is Indian Rupees: write ₹12,500 (Indian digit grouping).
- ALWAYS use the tools to fetch real data. Never invent rooms, people, amounts or rules. If a tool fails, say so briefly and suggest a next step.
- For actions that change data (recording payments, updating complaints, publishing notices, adding expenses, scheduling), just do it when the request is clear; confirm what you did in one line. If something essential is missing (which tenant? which date?), ask one short question.
- If the user reports an emergency (fire, gas leak, medical, break-in), create the complaint immediately, then give clear safety steps and tell them to call 112.
- Reply in the same language the user writes in (English, Hindi, Telugu, Tamil, Kannada, or Hinglish/mixed). Keep numbers and room numbers as digits.
- Never mention "functions", "tools", "JSON" or internal IDs unless the owner asks.
- End with a short helpful follow-up suggestion only when it genuinely helps.`;

  if (role === 'owner') {
    return `You are "PG Buddy", the AI operations manager for ${PG_NAME}, talking to the owner ${user?.name || ''}.
You can see and act on everything: rooms & vacancy, tenants, rent collection, reminders, complaints, visitors, notices, food menu, maintenance, expenses, reports and forecasts.
Be proactive: when you show a problem (unpaid rent, urgent complaint), offer the next action (e.g. "Want me to send WhatsApp reminders?").${shared}`;
  }
  if (role === 'tenant') {
    const room = user?.roomId?.roomNumber ? `They live in Room ${user.roomId.roomNumber} (floor ${user.roomId.floor}, rent ₹${user.roomId.rent?.toLocaleString('en-IN')}).` : 'They have no room assigned yet.';
    return `You are "PG Buddy", the friendly AI assistant of ${PG_NAME}, helping resident ${user?.name || ''} (call them ${first}). ${room}
You can help with: their rent status and how to pay, raising and tracking complaints, today's food menu and diet tips, notices, roommates, pre-registering visitors, and PG rules (use search_knowledge_base for any rule/policy question).
You can only see this resident's own data — never reveal other residents' personal details or payments.${shared}`;
  }
  return `You are the friendly AI receptionist of ${PG_NAME}. Help visitors find rooms and learn about facilities and rules.${shared}`;
}

function truncateResult(result) {
  const text = JSON.stringify(result);
  if (text.length <= MAX_TOOL_RESULT_CHARS) return text;
  // Keep the message/summary and as many data rows as fit.
  if (Array.isArray(result.data)) {
    const rows = [];
    let size = 200;
    for (const row of result.data) {
      const s = JSON.stringify(row).length;
      if (size + s > MAX_TOOL_RESULT_CHARS) break;
      rows.push(row);
      size += s;
    }
    return JSON.stringify({ ...result, data: rows, note: `Showing ${rows.length} of ${result.data.length} records.` });
  }
  return text.slice(0, MAX_TOOL_RESULT_CHARS) + '…';
}

function safeParseArgs(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch { return {}; }
}

/* ------------------------------------------------------------------ */
/*  Offline intent engine                                              */
/* ------------------------------------------------------------------ */

const inr = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

function detectIntent(message, role) {
  const m = ` ${message.toLowerCase()} `;
  const has = (...words) => words.some(w => m.includes(w));
  const budget = m.match(/(?:under|below|less than|within|upto|up to|₹|rs\.?|inr)\s*₹?\s*(\d{4,5})/);

  if (role === 'owner') {
    const paid = message.match(/^\s*([a-z]+(?:\s+[a-z]+)?)\s+(?:has\s+|just\s+)?paid\b(?:[^\d]*(\d{3,6}))?/i);
    if (paid && !/^(who|has|have|which|how)\b/i.test(paid[1])) {
      const method = ['upi', 'cash', 'card'].find(x => m.includes(x)) || (has('bank', 'neft', 'imps', 'transfer') ? 'bank-transfer' : 'cash');
      return ['record_payment', { tenantName: paid[1], ...(paid[2] && { amount: Number(paid[2]) }), method }];
    }
  }
  if (has('fire', 'gas leak', 'smoke', 'emergency', 'unconscious', 'theft', 'intruder', 'not working', 'broken', 'leak', 'complain', 'issue with', 'problem with', 'stopped',
    'pani cheyatledu', 'pani cheyyatledu', 'cheyatledu', 'raavatledu', 'ravatledu', 'kaam nahi', 'kharab', 'band ho', 'nahi chal', 'not cooling', 'no water', 'dirty', 'cockroach')
      && !has('pending complaint', 'open complaint', 'show complaint', 'list complaint', 'which complaint')) {
    return ['create_complaint', { description: message }];
  }
  if (role === 'owner') {
    if (has('remind')) return ['send_rent_reminders', {}];
    if (has('not paid', 'unpaid', 'pending rent', 'defaulter', "hasn't paid", 'havent paid', "haven't paid", 'due list')) return ['get_unpaid_tenants', {}];
    if (has('income', 'revenue', 'earning', 'collected', 'collection')) return ['get_income_report', { period: has('today') ? 'today' : has('last month') ? 'last-month' : 'this-month' }];
    if (has('expense', 'spent', 'spending', 'cost')) return ['get_expense_summary', {}];
    if (has('to-do', 'todo', 'to do', 'tasks', 'what should i do')) return ['get_smart_todo_list', {}];
    if (has('visitor', 'guest')) return ['get_today_visitors', {}];
    if (has('complaint', 'issues', 'pending issue')) return ['get_pending_complaints', {}];
    if (has('risky', 'risk', 'late payer', 'violation')) return ['get_risky_tenants', {}];
    if (has('predict', 'forecast')) return ['get_rent_prediction', {}];
    if (has('report')) return ['generate_monthly_report', {}];
    if (has('notice', 'announce') && has('create', 'make', 'write', 'publish', 'post', 'tomorrow')) return ['generate_notice', { rawInput: message }];
    if (has('summary', 'dashboard', 'how is', "how's", 'overview', 'status of pg', 'today')) return ['get_dashboard_stats', {}];
  }
  if (has('empty', 'vacant', 'vacancy', 'free bed', 'available room')) return ['get_empty_rooms', {}];
  if (has('menu', 'food', 'breakfast', 'lunch', 'dinner', 'snack', 'eat')) {
    if (has('protein', 'diet', 'weight', 'healthy', 'recommend', 'gym')) return ['get_food_recommendation', { dietaryNeed: message }];
    const day = ['tomorrow', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].find(d => m.includes(d));
    const meal = ['breakfast', 'lunch', 'snacks', 'dinner'].find(x => m.includes(x.replace('snacks', 'snack')));
    return ['get_menu', { ...(day && { day }), ...(meal && { meal }) }];
  }
  if (has('rent', 'due', 'my payment', 'pay ')) return role === 'owner' ? ['get_unpaid_tenants', {}] : ['get_rent_status', {}];
  if (has('upi', 'how to pay', 'bank')) return ['get_payment_info', {}];
  if (has('roommate', 'room mate')) return ['get_roommate_info', {}];
  if (has('my complaint', 'complaint status')) return ['get_complaints_by_tenant', {}];
  if (has('notice', 'announcement')) return ['get_notices', {}];
  if (has('facilit', 'amenit', 'wifi', 'laundry')) return ['get_facilities', {}];
  if (has('rule', 'policy', 'allowed', 'timing', 'gate', 'deposit', 'notice period', 'smok', 'alcohol', 'late fee', 'parking')) return ['search_knowledge_base', { query: message }];
  if (has('room', ' ac ', 'sharing', 'single', 'double', 'triple', 'floor') || budget) {
    const args = {};
    if (budget) args.maxRent = Number(budget[1]);
    if (has(' ac ', ' ac,', 'air condition')) args.hasAC = true;
    if (has('non ac', 'non-ac')) args.hasAC = false;
    for (const t of ['single', 'double', 'triple']) if (m.includes(t)) args.type = t;
    const floor = m.match(/(\d)(?:st|nd|rd|th)? floor/) || (m.includes('first floor') && ['', '1']) || (m.includes('second floor') && ['', '2']) || (m.includes('third floor') && ['', '3']);
    if (floor) args.floor = Number(floor[1]);
    if (has('girl', 'female', 'women', 'ladies')) args.genderPreference = 'female';
    if (has('boy', 'male', ' men ', 'gents')) args.genderPreference = 'male';
    return ['search_rooms', args];
  }
  return [null, {}];
}

function formatOffline(fnName, result, role) {
  if (!result.success) return result.message || "I couldn't complete that just now.";
  const d = result.data;
  switch (fnName) {
    case 'search_rooms':
    case 'get_empty_rooms':
      if (!d?.length) return result.message;
      return `${result.message}\n\n| Room | Type | Rent | Free beds | Features |\n|---|---|---|---|---|\n` +
        d.slice(0, 8).map(r => `| ${r.roomNumber} | ${r.type} | ${inr(r.rent)} | ${r.freeBeds} | ${r.features.slice(0, 3).join(', ')} |`).join('\n');
    case 'get_unpaid_tenants':
      if (!d?.length) return result.message;
      return `${result.message}\n\n` + d.map(p => `• **${p.tenant}** (Room ${p.room}) — ${inr(p.amount)} · ${p.status}${p.daysOverdue ? `, ${p.daysOverdue} days` : ''}`).join('\n') + '\n\nSay **"send reminders"** and I\'ll prepare WhatsApp messages for all of them.';
    case 'get_rent_status': {
      const t = d.thisMonth;
      return t.status === 'paid'
        ? `You're all set ✅ — rent of **${inr(t.amount)}** for this month is paid.`
        : `Your rent of **${inr(t.amount)}** for this month is **${t.status === 'overdue' ? 'overdue' : 'due on the 5th'}**. You can pay by UPI — ask me "how to pay" for details.`;
    }
    case 'get_menu': {
      const meals = ['breakfast', 'lunch', 'snacks', 'dinner'].filter(m => d[m]);
      return `🍽️ **Menu for ${d.day}**\n\n` + meals.map(m => `**${m[0].toUpperCase() + m.slice(1)}** (${d[m].timing || ''})\n${d[m].items.map(i => `• ${i}`).join('\n')}`).join('\n\n');
    }
    case 'create_complaint':
      return d.isEmergency
        ? `🚨 **Emergency alert raised.** The owner has been notified right now.\n\n${d.emergencySteps?.immediateAction || 'Move to a safe place.'}\n\nCall **112** if anyone is in danger.`
        : `Got it — I've logged your complaint. ✅\n\n• Category: **${d.category}**\n• Priority: **${d.priority}**\n• Expected fix: **${d.estimatedResolution}**\n\n${d.replyToTenant || ''}`;
    case 'get_dashboard_stats':
    case 'get_income_report':
    case 'generate_monthly_report':
      return (result.message ? `${result.message}\n\n` : '📊 Here\'s the snapshot:\n\n') +
        Object.entries(d).filter(([, v]) => typeof v !== 'object').map(([k, v]) => `• ${k.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())}: **${typeof v === 'number' && v > 999 ? inr(v) : v}**`).join('\n');
    case 'get_smart_todo_list':
      return d.length ? `Here's your to-do list for today:\n\n${d.map((t, i) => `${i + 1}. ${t.task}`).join('\n')}` : 'Nothing urgent today. 🎉';
    case 'get_pending_complaints':
      return d.length ? `${result.message}\n\n${d.slice(0, 10).map(c => `• Room ${c.room || '?'} — ${c.issue} (**${c.priority}**, ${c.status})`).join('\n')}` : 'No open complaints right now. 🎉';
    case 'send_rent_reminders':
      return `${result.message}\n\n${(d || []).map(r => `• **${r.tenant}** (Room ${r.room}) — ${inr(r.amount)}`).join('\n')}`;
    case 'search_knowledge_base':
      return d.answer;
    case 'get_notices':
      return d.length ? d.map(n => `📢 **${n.title}**\n${n.content}`).join('\n\n') : 'No notices right now.';
    case 'get_roommate_info':
    case 'get_payment_info':
    case 'get_facilities':
      return result.message || Object.entries(d).map(([k, v]) => `• ${k.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())}: ${Array.isArray(v) ? v.map(x => x.name || x).join(', ') || '—' : v}`).join('\n');
    default:
      return result.message || 'Done ✅';
  }
}

async function offlineAnswer(message, ctx) {
  const [fnName, args] = detectIntent(message, ctx.userRole);
  if (!fnName) {
    const hints = ctx.userRole === 'owner'
      ? '• "How many rooms are empty?"\n• "Who hasn\'t paid rent?"\n• "Send rent reminders"\n• "Show pending complaints"\n• "Today\'s summary"'
      : '• "Is my rent due?"\n• "What\'s for dinner?"\n• "My fan is not working"\n• "What time does the gate close?"';
    return {
      response: `I'm running in offline mode right now, so I understand simpler requests best. Try:\n\n${hints}`,
      functionsExecuted: [],
      cards: []
    };
  }
  const result = await executeFunction(fnName, args, ctx);
  return {
    response: formatOffline(fnName, result, ctx.userRole),
    functionsExecuted: [{ name: fnName, args, success: result.success }],
    cards: result.display && result.success ? [{ type: result.display, name: fnName, data: result.data }] : []
  };
}

/* ------------------------------------------------------------------ */
/*  Main pipeline                                                      */
/* ------------------------------------------------------------------ */

export async function processMessage(message, userId, userRole, sessionId = null, io = null) {
  sessionId = sessionId || uuidv4();
  const ctx = { userId, userRole, io };
  const language = await detectLanguage(message).catch(() => 'en');

  const [user, history] = await Promise.all([
    User.findById(userId).select('name roomId role').populate('roomId', 'roomNumber floor rent type'),
    ChatHistory.findOne({ userId, sessionId, isActive: true })
  ]);

  let chat = history;
  if (!chat) {
    chat = new ChatHistory({ userId, role: userRole, sessionId, messages: [], detectedLanguage: language, title: message.slice(0, 60) });
  }

  let response = '';
  let functionsExecuted = [];
  let cards = [];
  let mode = 'ai';

  if (isAIConfigured()) {
    try {
      const messages = [{ role: 'system', content: systemPrompt(user, userRole) }];
      for (const m of chat.messages.slice(-12)) {
        if (m.role === 'user' || m.role === 'assistant') messages.push({ role: m.role, content: m.content || '' });
      }
      messages.push({ role: 'user', content: message });

      const tools = getFunctionsByRole(userRole);
      let reply = (await callOpenAI(messages, tools, 'auto', { temperature: 0.4 })).choices[0].message;

      for (let round = 0; reply.tool_calls?.length && round < MAX_TOOL_ROUNDS; round++) {
        // Push the assistant turn back verbatim (Gemini needs its thought signatures).
        messages.push(reply);
        for (const call of reply.tool_calls) {
          const name = call.function.name;
          const args = safeParseArgs(call.function.arguments);
          console.log(`🔧 ${userRole} → ${name}`, JSON.stringify(args));
          const result = await executeFunction(name, args, ctx);
          functionsExecuted.push({ name, args, success: !!result.success });
          if (result.display && result.success) cards.push({ type: result.display, name, data: result.data });
          messages.push({ role: 'tool', tool_call_id: call.id, content: truncateResult(result) });
        }
        reply = (await callOpenAI(messages, tools, 'auto', { temperature: 0.4 })).choices[0].message;
      }

      response = reply.content?.trim() || (functionsExecuted.length ? 'Done ✅' : "Sorry, I didn't quite get that — could you rephrase?");
    } catch (error) {
      console.warn('⚡ AI unavailable, using offline intent engine:', error.message);
      mode = 'offline';
    }
  } else {
    mode = 'offline';
  }

  if (mode === 'offline') {
    const offline = await offlineAnswer(message, ctx);
    response = offline.response;
    functionsExecuted = offline.functionsExecuted;
    cards = offline.cards;
  }

  // Keep only the last card of each type so the UI isn't cluttered.
  const seen = new Set();
  cards = cards.reverse().filter(c => !seen.has(c.type) && seen.add(c.type)).reverse();

  chat.messages.push(
    { role: 'user', content: message, timestamp: new Date() },
    { role: 'assistant', content: response, timestamp: new Date(), cards, functionsExecuted }
  );
  if (chat.messages.length > 60) chat.messages = chat.messages.slice(-60);
  chat.detectedLanguage = language;
  chat.lastActivity = new Date();
  await chat.save().catch(e => console.warn('Chat history save failed:', e.message));

  return { success: true, response, sessionId, language, mode, functionsExecuted, cards };
}

export async function clearChatHistory(userId, sessionId) {
  await ChatHistory.updateOne({ userId, sessionId }, { $set: { isActive: false } }).catch(() => {});
}

export async function getChatHistory(userId, sessionId) {
  const history = await ChatHistory.findOne({ userId, sessionId, isActive: true }).lean().catch(() => null);
  return history?.messages || [];
}

export async function listSessions(userId) {
  return ChatHistory.find({ userId, isActive: true })
    .select('sessionId title lastActivity messages')
    .sort({ lastActivity: -1 })
    .limit(20)
    .lean()
    .then(rows => rows.map(r => ({
      sessionId: r.sessionId,
      title: r.title || r.messages?.find(m => m.role === 'user')?.content?.slice(0, 60) || 'Conversation',
      lastActivity: r.lastActivity,
      messageCount: r.messages?.length || 0
    })));
}
