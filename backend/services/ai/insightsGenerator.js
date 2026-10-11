/**
 * Insights Generator (Features #12, #25, #32, #33)
 * - Daily summary with business insights
 * - Smart to-do list
 *
 * Insights always work: rule-based observations are computed from live data,
 * and when AI is available it rewrites/extends them into sharper advice.
 */

import { getJSON, isAIConfigured } from './openaiClient.js';
import Payment from '../../models/Payment.js';
import Complaint from '../../models/Complaint.js';
import Visitor from '../../models/Visitor.js';
import MaintenanceSchedule from '../../models/MaintenanceSchedule.js';
import DailySummary from '../../models/DailySummary.js';
import { getDashboardStats, startOfDay } from '../stats.js';

const inr = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

function ruleBasedInsights(s) {
  const out = [];
  const { occupancy: o, finance: f, trend } = s;

  if (o.vacantBeds > 0) {
    const lost = Math.round(o.vacantBeds * (o.potentialRent / Math.max(1, o.totalBeds)));
    out.push(`${o.vacantBeds} vacant bed(s) — roughly ${inr(lost)}/month of untapped rent. Filling them is the fastest way to grow revenue.`);
  } else {
    out.push('The PG is fully occupied — a good moment to review rents on the most in-demand rooms.');
  }

  if (f.pendingCount > 0) {
    out.push(`${f.pendingCount} rent payment(s) worth ${inr(f.pending)} are still pending this month (${f.collectionRate}% collected so far).`);
  } else if (f.paidCount > 0) {
    out.push(`All rent for ${f.label} is collected — ${inr(f.collected)} in the bank. 🎉`);
  }

  const last = trend[trend.length - 2];
  if (last && last.expenses > 0) {
    const change = Math.round(((f.expenses - last.expenses) / last.expenses) * 100);
    if (Math.abs(change) >= 10 && new Date().getDate() > 20) {
      out.push(`Expenses are ${change > 0 ? 'up' : 'down'} ${Math.abs(change)}% versus ${last.label}.`);
    }
    const topCat = Object.entries(f.expenseByCategory).sort((a, b) => b[1] - a[1])[0];
    if (topCat) out.push(`Biggest cost this month is ${topCat[0]} at ${inr(topCat[1])} (${Math.round((topCat[1] / Math.max(1, f.expenses)) * 100)}% of spend).`);
  }

  if (s.complaints.emergency) out.push(`⚠️ ${s.complaints.emergency} emergency complaint(s) are open — handle these first.`);
  else if (s.complaints.highPriority) out.push(`${s.complaints.highPriority} high-priority complaint(s) are waiting; quick fixes keep reviews and renewals healthy.`);

  const [topComplaint] = Object.entries(s.complaints.byCategory).sort((a, b) => b[1] - a[1]);
  if (topComplaint && topComplaint[1] >= 2) out.push(`${topComplaint[1]} open complaints are about ${topComplaint[0].replace('-', ' ')} — this may be one root cause worth fixing once.`);

  if (s.visitors.pendingApproval) out.push(`${s.visitors.pendingApproval} visitor(s) are waiting for approval at the gate.`);

  const avgProfit = trend.reduce((a, t) => a + t.profit, 0) / Math.max(1, trend.length);
  if (trend.length >= 3) out.push(`Average monthly profit over the last ${trend.length} months: ${inr(avgProfit)}.`);

  return out.slice(0, 6);
}

async function aiInsights(stats, baseline) {
  if (!isAIConfigured()) return baseline;
  try {
    const result = await getJSON(
      `You are the business advisor of an Indian PG (paying-guest hostel). Here is today's live data:

${JSON.stringify({
  occupancy: { beds: stats.occupancy.totalBeds, occupied: stats.occupancy.occupiedBeds, rate: stats.occupancy.occupancyRate, byFloor: stats.occupancy.byFloor },
  thisMonth: stats.finance,
  last6Months: stats.trend,
  complaints: stats.complaints,
  visitors: stats.visitors
})}

Observations already computed:
${baseline.map(b => `- ${b}`).join('\n')}

Write 5 short, specific, actionable insights for the owner (max 25 words each, use ₹ and real numbers, no fluff). Return ONLY JSON: {"insights": ["...", "..."]}`,
      'You are a sharp, practical property-business analyst. JSON only.',
      { temperature: 0.4, maxTokens: 700 }
    );
    return Array.isArray(result.insights) && result.insights.length ? result.insights.slice(0, 6) : baseline;
  } catch (error) {
    console.warn('AI insights fell back to rules:', error.message);
    return baseline;
  }
}

/**
 * Daily summary (Feature #25). AI text is cached per day; numbers are always live.
 */
export async function generateDailySummary(dateStr = null, { refresh = false } = {}) {
  const stats = await getDashboardStats();
  const day = startOfDay(dateStr ? new Date(dateStr) : new Date());

  let cached = await DailySummary.findOne({ date: day });
  const stale = !cached || refresh || Date.now() - new Date(cached.updatedAt).getTime() > 3 * 3600 * 1000;

  if (stale) {
    const baseline = ruleBasedInsights(stats);
    const insights = await aiInsights(stats, baseline);
    const todoList = await generateSmartTodo();
    const doc = {
      date: day,
      totalRooms: stats.occupancy.totalRooms,
      occupiedRooms: stats.occupancy.totalRooms - stats.occupancy.emptyRooms,
      availableRooms: stats.occupancy.emptyRooms,
      occupancyRate: stats.occupancy.occupancyRate,
      todayIncome: stats.todayIncome,
      expectedIncome: stats.finance.expected,
      pendingRent: stats.finance.pending,
      totalExpenses: stats.finance.expenses,
      totalTenants: stats.tenants,
      pendingComplaints: stats.complaints.open,
      emergencyComplaints: stats.complaints.emergency,
      todayVisitors: stats.visitors.today,
      latePayments: stats.finance.overdueCount,
      aiInsights: insights,
      aiSuggestions: insights.slice(0, 3),
      todoList: todoList.map(t => ({ task: t.task, priority: t.priority, category: t.category }))
    };
    cached = await DailySummary.findOneAndUpdate({ date: day }, doc, { upsert: true, new: true });
  }

  return { ...cached.toObject(), stats };
}

/**
 * Business insights (Feature #12)
 */
export async function generateInsights() {
  const stats = await getDashboardStats();
  const insights = await aiInsights(stats, ruleBasedInsights(stats));
  return { insights, data: { occupancyRate: stats.occupancy.occupancyRate, collected: stats.finance.collected, pending: stats.finance.pending, openComplaints: stats.complaints.open } };
}

/**
 * Smart to-do list (Feature #33): what the owner should do today, most urgent first.
 */
export async function generateSmartTodo() {
  const now = new Date();
  const [unpaid, complaints, visitors, maintenance] = await Promise.all([
    Payment.find({ status: { $in: ['pending', 'overdue'] } }).populate('tenant', 'name').populate('room', 'roomNumber').sort({ dueDate: 1 }).limit(8).lean(),
    Complaint.find({ status: { $in: ['open', 'in-progress'] } }).populate('room', 'roomNumber').sort({ isEmergency: -1, urgencyScore: -1 }).limit(8).lean(),
    Visitor.find({ status: 'pending' }).limit(5).lean(),
    MaintenanceSchedule.find({ status: { $in: ['scheduled', 'in-progress'] }, scheduledDate: { $lte: new Date(now.getTime() + 2 * 86400000) } }).sort({ scheduledDate: 1 }).limit(5).lean()
  ]);

  const tasks = [];
  for (const c of complaints.filter(c => c.isEmergency)) {
    tasks.push({ task: `🚨 Handle emergency in Room ${c.room?.roomNumber || '?'}: ${c.description.slice(0, 60)}`, priority: 'urgent', category: 'complaint', link: '/complaints' });
  }
  for (const v of visitors) {
    tasks.push({ task: `Approve or reject visitor ${v.name} (${v.purpose})`, priority: 'high', category: 'visitor', link: '/visitors' });
  }
  for (const p of unpaid.filter(p => p.status === 'overdue')) {
    const days = Math.max(1, Math.floor((now - new Date(p.dueDate)) / 86400000));
    tasks.push({ task: `Collect overdue rent from ${p.tenant?.name || 'tenant'} — Room ${p.room?.roomNumber || '?'} (${inr(p.amount)}, ${days} day(s) late)`, priority: 'high', category: 'payment', link: '/payments' });
  }
  for (const c of complaints.filter(c => !c.isEmergency)) {
    tasks.push({ task: `Fix ${c.aiCategory.replace('-', ' ')} issue in Room ${c.room?.roomNumber || '?'}: ${c.description.slice(0, 50)}`, priority: c.aiPriority === 'high' ? 'high' : c.aiPriority === 'low' ? 'low' : 'medium', category: 'complaint', link: '/complaints' });
  }
  for (const m of maintenance) {
    tasks.push({ task: `${m.type.replace('-', ' ')} ${new Date(m.scheduledDate) < now ? 'is due' : 'on ' + new Date(m.scheduledDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}: ${m.description}`, priority: 'medium', category: 'maintenance', link: '/maintenance' });
  }
  for (const p of unpaid.filter(p => p.status === 'pending')) {
    tasks.push({ task: `Remind ${p.tenant?.name || 'tenant'} about rent due on the 5th (${inr(p.amount)})`, priority: 'low', category: 'payment', link: '/payments' });
  }

  const order = { urgent: 0, high: 1, medium: 2, low: 3 };
  return tasks.sort((a, b) => order[a.priority] - order[b.priority]).slice(0, 12);
}
