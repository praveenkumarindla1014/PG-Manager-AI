/**
 * AI Chat Engine
 * 
 * Main orchestration: user message → context building → OpenAI with function calling → 
 * function execution → response generation.
 * Includes intelligent fallback parsing for offline/API-key fallback mode.
 * Implements chat memory (Feature #27) and multi-language support (Feature #28).
 */

import { callOpenAI } from './openaiClient.js';
import { getFunctionsByRole } from './functionRegistry.js';
import { executeFunction } from './functionExecutor.js';
import { detectLanguage, translateText } from './languageDetector.js';
import ChatHistory from '../../models/ChatHistory.js';
import { v4 as uuidv4 } from 'uuid';

const SYSTEM_PROMPTS = {
  owner: `You are an AI-powered PG (Paying Guest) Management Assistant. You serve as a virtual PG manager for the OWNER.

Your capabilities:
- Search and manage rooms, tenants, and payments
- Analyze complaints and predict maintenance needs
- Generate reports, notices, and communications
- Provide business insights and revenue optimization
- Track expenses and predict future costs
- Detect fraud and risky tenants
- Schedule maintenance and meetings

Rules:
- Always be professional, helpful, and proactive
- When you have data, present it in a clear, structured format using tables or bullet points
- If asked about something you can look up, USE THE FUNCTIONS to get real data — don't make up numbers
- Provide actionable suggestions, not just data
- Respond in the same language the user writes in`,

  tenant: `You are an AI-powered PG Assistant for TENANTS.
Your capabilities: check rent, complaints, menu, roommate info, notices, rules.
- Respond in the same language the user writes in`,

  visitor: `You are an AI-powered PG Information Assistant for VISITORS.`
};

/**
 * Fallback Intent Matcher when OpenAI API fails or is unconfigured
 */
async function fallbackIntentExecution(message, userId, userRole, io) {
  const msgLower = message.toLowerCase();
  let fnName = null;
  let fnArgs = {};

  if (msgLower.includes('empty') || msgLower.includes('vacant') || msgLower.includes('available room')) {
    fnName = 'get_empty_rooms';
  } else if (msgLower.includes('income') || msgLower.includes('revenue') || msgLower.includes('earnings') || msgLower.includes('money collected')) {
    fnName = 'get_income_report';
    fnArgs = { period: 'this-month' };
  } else if (msgLower.includes('not paid') || msgLower.includes('unpaid') || msgLower.includes('pending rent') || msgLower.includes('defaulter') || msgLower.includes('who hasn\'t paid')) {
    fnName = 'get_unpaid_tenants';
  } else if (msgLower.includes('complaint') || msgLower.includes('pending issue') || msgLower.includes('broken') || msgLower.includes('open issue')) {
    fnName = 'get_pending_complaints';
  } else if (msgLower.includes('visitor') || msgLower.includes('guest')) {
    fnName = 'get_today_visitors';
  } else if (msgLower.includes('menu') || msgLower.includes('food') || msgLower.includes('breakfast') || msgLower.includes('lunch') || msgLower.includes('dinner')) {
    if (msgLower.includes('protein') || msgLower.includes('diet') || msgLower.includes('health') || msgLower.includes('recommend')) {
      fnName = 'get_food_recommendation';
      fnArgs = { dietaryNeed: message };
    } else {
      fnName = 'get_menu';
    }
  } else if (msgLower.includes('notice') || msgLower.includes('announcement') || msgLower.includes('water problem')) {
    if (userRole === 'owner' && (msgLower.includes('create') || msgLower.includes('water problem') || msgLower.includes('tomorrow'))) {
      fnName = 'generate_notice';
      fnArgs = { rawInput: message, priority: 'medium', category: 'general' };
    } else {
      fnName = 'get_notices';
    }
  } else if (msgLower.includes('rent') || msgLower.includes('due date') || msgLower.includes('my payment')) {
    fnName = 'get_rent_status';
  } else if (msgLower.includes('roommate')) {
    fnName = 'get_roommate_info';
  } else if (msgLower.includes('facility') || msgLower.includes('amenities')) {
    fnName = 'get_facilities';
  } else if (msgLower.includes('room') || msgLower.includes('ac') || msgLower.includes('sharing') || msgLower.includes('floor') || msgLower.includes('under')) {
    fnName = 'search_rooms';
    if (msgLower.includes('ac')) fnArgs.hasAC = true;
    if (msgLower.includes('7000')) fnArgs.maxRent = 7000;
    if (msgLower.includes('5000')) fnArgs.maxRent = 5000;
    if (msgLower.includes('6000')) fnArgs.maxRent = 6000;
    if (msgLower.includes('8000')) fnArgs.maxRent = 8000;
    if (msgLower.includes('triple')) fnArgs.type = 'triple';
    if (msgLower.includes('double')) fnArgs.type = 'double';
    if (msgLower.includes('single')) fnArgs.type = 'single';
    if (msgLower.includes('second floor') || msgLower.includes('2nd floor')) fnArgs.floor = 2;
    if (msgLower.includes('first floor') || msgLower.includes('1st floor')) fnArgs.floor = 1;
    if (msgLower.includes('third floor') || msgLower.includes('3rd floor')) fnArgs.floor = 3;
  } else if (msgLower.includes('todo') || msgLower.includes('to-do') || msgLower.includes('tasks')) {
    fnName = 'get_smart_todo_list';
  } else if (msgLower.includes('summary') || msgLower.includes('dashboard') || msgLower.includes('today')) {
    fnName = 'get_daily_summary';
  } else {
    // Default search rooms or facilities
    fnName = 'search_rooms';
  }

  const result = await executeFunction(fnName, fnArgs, { userId, userRole, io });
  
  let formattedText = result.message || 'Action executed successfully.';
  if (result.data) {
    if (Array.isArray(result.data)) {
      if (result.data.length === 0) {
        formattedText += ' No matching records found.';
      } else {
        formattedText += '\n\nHere are the details:\n' + result.data.slice(0, 5).map((item, idx) => {
          if (item.roomNumber) return `• Room ${item.roomNumber} (${item.type || 'standard'}, ₹${item.rent}/mo, Floor ${item.floor})`;
          if (item.name) return `• ${item.name} (${item.phone || item.email || item.role})`;
          if (item.title) return `• ${item.title}: ${item.content}`;
          if (item.description) return `• Issue: "${item.description}" [Status: ${item.status || 'open'}]`;
          return `• Record ${idx + 1}: ${JSON.stringify(item).substring(0, 100)}`;
        }).join('\n');
      }
    } else if (typeof result.data === 'object') {
      if (result.data.totalIncome !== undefined) {
        formattedText = `📊 Financial Report:\n• Total Income: ₹${(result.data.totalIncome || 0).toLocaleString('en-IN')}\n• Payments Received: ${result.data.paymentsReceived}\n• Pending Rent Amount: ₹${(result.data.pendingAmount || 0).toLocaleString('en-IN')} (${result.data.pendingCount} tenants pending)`;
      } else if (result.data.occupancyRate !== undefined) {
        formattedText = `📊 Daily Summary:\n• Occupancy: ${result.data.occupancyRate}%\n• Total Income Today: ₹${result.data.todayIncome}\n• Pending Complaints: ${result.data.pendingComplaints}\n• Visitors Today: ${result.data.todayVisitors}`;
      }
    }
  }

  return {
    functionsExecuted: [{ name: fnName, args: fnArgs, success: result.success }],
    response: formattedText,
    data: result.data
  };
}

/**
 * Process a chat message through the AI pipeline
 */
export async function processMessage(message, userId, userRole, sessionId = null, io = null) {
  try {
    if (!sessionId) sessionId = uuidv4();
    
    // Detect language (Feature #28)
    const detectedLang = await detectLanguage(message).catch(() => 'en');
    
    // Get chat history for context (Feature #27)
    let chatHistory = await ChatHistory.findOne({
      userId,
      sessionId,
      isActive: true
    }).catch(() => null);
    
    if (!chatHistory) {
      try {
        chatHistory = await ChatHistory.create({
          userId,
          role: userRole,
          sessionId,
          messages: [],
          detectedLanguage: detectedLang,
          context: {}
        });
      } catch (e) {
        console.warn('Chat history creation notice:', e.message);
      }
    }
    
    let finalResponse = '';
    let executedFunctions = [];
    let responseData = null;

    // Try OpenAI Function Calling first
    try {
      const messages = [
        { role: 'system', content: SYSTEM_PROMPTS[userRole] || SYSTEM_PROMPTS.visitor }
      ];
      
      if (chatHistory && chatHistory.messages) {
        const recentMessages = chatHistory.messages.slice(-6);
        for (const msg of recentMessages) {
          if (msg.role !== 'function' && msg.role !== 'tool') {
            messages.push({ role: msg.role, content: msg.content });
          }
        }
      }
      
      messages.push({ role: 'user', content: message });
      const functions = getFunctionsByRole(userRole);
      
      let response = await callOpenAI(messages, functions, 'auto');
      let assistantMessage = response.choices[0].message;
      
      let iterations = 0;
      const MAX_ITERATIONS = 5;
      
      while (assistantMessage.tool_calls && iterations < MAX_ITERATIONS) {
        iterations++;
        messages.push(assistantMessage);
        
        for (const toolCall of assistantMessage.tool_calls) {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);
          
          console.log(`🔧 AI Executing function: ${functionName}`, functionArgs);
          
          const result = await executeFunction(functionName, functionArgs, {
            userId,
            userRole,
            io
          });
          
          executedFunctions.push({
            name: functionName,
            args: functionArgs,
            success: result.success,
            result: result
          });

          responseData = result.data || responseData;
          
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result)
          });
        }
        
        response = await callOpenAI(messages, functions, 'auto');
        assistantMessage = response.choices[0].message;
      }
      
      finalResponse = assistantMessage.content || 'I performed the requested action successfully.';

    } catch (openAiError) {
      console.warn('⚡ OpenAI Call failed or invalid key, switching to Smart Intent Engine:', openAiError.message);
      
      // Execute smart fallback intent parsing
      const fallbackResult = await fallbackIntentExecution(message, userId, userRole, io);
      finalResponse = fallbackResult.response;
      executedFunctions = fallbackResult.functionsExecuted;
      responseData = fallbackResult.data;
    }

    // Multi-language translation if needed
    if (detectedLang && detectedLang !== 'en') {
      try {
        finalResponse = await translateText(finalResponse, detectedLang);
      } catch (e) {
        console.warn('Translation fallback notice:', e.message);
      }
    }
    
    // Save to chat history (Feature #27)
    if (chatHistory && chatHistory.messages) {
      chatHistory.messages.push(
        { role: 'user', content: message, timestamp: new Date() },
        { role: 'assistant', content: finalResponse, timestamp: new Date() }
      );
      chatHistory.detectedLanguage = detectedLang;
      chatHistory.lastActivity = new Date();
      if (chatHistory.messages.length > 50) {
        chatHistory.messages = chatHistory.messages.slice(-50);
      }
      await chatHistory.save().catch(() => {});
    }
    
    return {
      success: true,
      response: finalResponse,
      sessionId,
      language: detectedLang,
      functionsExecuted: executedFunctions.map(f => ({
        name: f.name,
        args: f.args,
        success: f.success
      })),
      data: responseData
    };
    
  } catch (error) {
    console.error('Chat engine critical error:', error);
    // Last-resort fallback to ensure the user NEVER sees an error message
    const fallback = await fallbackIntentExecution(message, userId, userRole, io);
    return {
      success: true,
      response: fallback.response,
      sessionId: sessionId || uuidv4(),
      language: 'en',
      functionsExecuted: fallback.functionsExecuted,
      data: fallback.data
    };
  }
}

/**
 * Clear chat history for a session
 */
export async function clearChatHistory(userId, sessionId) {
  await ChatHistory.updateOne(
    { userId, sessionId },
    { $set: { isActive: false } }
  ).catch(() => {});
}

/**
 * Get chat history
 */
export async function getChatHistory(userId, sessionId) {
  const history = await ChatHistory.findOne({ userId, sessionId, isActive: true }).catch(() => null);
  return history?.messages || [];
}
