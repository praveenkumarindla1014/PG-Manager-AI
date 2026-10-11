/**
 * Shared business metrics — one source of truth for the dashboard, reports,
 * AI insights and the AI assistant, so every screen shows the same numbers.
 */

import Room from '../models/Room.js';
import User from '../models/User.js';
import Payment from '../models/Payment.js';
import Complaint from '../models/Complaint.js';
import Expense from '../models/Expense.js';
import Visitor from '../models/Visitor.js';
import MaintenanceSchedule from '../models/MaintenanceSchedule.js';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export async function getOccupancy() {
  const rooms = await Room.find().lean();
  const totalBeds = rooms.reduce((s, r) => s + r.maxOccupants, 0);
  const occupiedBeds = rooms.reduce((s, r) => s + (r.currentOccupants?.length || 0), 0);
  const byFloor = {};
  for (const r of rooms) {
    byFloor[r.floor] ??= { floor: r.floor, beds: 0, occupied: 0, rooms: 0 };
    byFloor[r.floor].beds += r.maxOccupants;
    byFloor[r.floor].occupied += r.currentOccupants?.length || 0;
    byFloor[r.floor].rooms += 1;
  }
  return {
    totalRooms: rooms.length,
    fullRooms: rooms.filter(r => r.status === 'occupied').length,
    emptyRooms: rooms.filter(r => (r.currentOccupants?.length || 0) === 0 && r.status !== 'maintenance').length,
    partialRooms: rooms.filter(r => r.status === 'partially-occupied').length,
    totalBeds,
    occupiedBeds,
    vacantBeds: totalBeds - occupiedBeds,
    occupancyRate: totalBeds ? Math.round((occupiedBeds / totalBeds) * 1000) / 10 : 0,
    potentialRent: rooms.reduce((s, r) => s + r.rent * r.maxOccupants, 0),
    byFloor: Object.values(byFloor).sort((a, b) => a.floor - b.floor)
  };
}

export async function getMonthFinance(month, year) {
  const [payments, expenses] = await Promise.all([
    Payment.find({ month, year }).lean(),
    Expense.find({ month, year }).lean()
  ]);
  const collected = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount + (p.lateFee || 0), 0);
  const pendingList = payments.filter(p => ['pending', 'overdue', 'partial'].includes(p.status));
  const pending = pendingList.reduce((s, p) => s + p.amount, 0);
  const expenseTotal = expenses.reduce((s, e) => s + e.amount, 0);
  const expenseByCategory = {};
  for (const e of expenses) expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount;

  return {
    month,
    year,
    label: `${MONTH_NAMES[month - 1]} ${year}`,
    expected: collected + pending,
    collected,
    pending,
    pendingCount: pendingList.length,
    overdueCount: payments.filter(p => p.status === 'overdue').length,
    paidCount: payments.filter(p => p.status === 'paid').length,
    expenses: expenseTotal,
    expenseByCategory,
    profit: collected - expenseTotal,
    collectionRate: collected + pending ? Math.round((collected / (collected + pending)) * 100) : 0
  };
}

export async function getTrend(months = 6) {
  const now = new Date();
  const out = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const f = await getMonthFinance(d.getMonth() + 1, d.getFullYear());
    out.push({
      label: MONTH_NAMES[d.getMonth()],
      month: f.month,
      year: f.year,
      income: f.collected,
      expenses: f.expenses,
      profit: f.profit,
      pending: f.pending
    });
  }
  return out;
}

export async function getDashboardStats() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const today = startOfDay(now);

  const [occupancy, finance, trend, openComplaints, todayVisitors, pendingVisitors, tenants, upcomingMaintenance, todayPayments] = await Promise.all([
    getOccupancy(),
    getMonthFinance(month, year),
    getTrend(6),
    Complaint.find({ status: { $in: ['open', 'in-progress'] } }).lean(),
    Visitor.countDocuments({ checkIn: { $gte: today, $lte: endOfDay(now) } }),
    Visitor.countDocuments({ status: 'pending' }),
    User.countDocuments({ role: 'tenant', isActive: true }),
    MaintenanceSchedule.find({ status: { $in: ['scheduled', 'in-progress'] }, scheduledDate: { $lte: new Date(now.getTime() + 7 * 86400000) } })
      .sort({ scheduledDate: 1 }).limit(5).lean(),
    Payment.find({ status: 'paid', paidDate: { $gte: today } }).lean()
  ]);

  const complaintsByCategory = {};
  for (const c of openComplaints) complaintsByCategory[c.aiCategory] = (complaintsByCategory[c.aiCategory] || 0) + 1;

  return {
    generatedAt: now,
    occupancy,
    finance,
    trend,
    tenants,
    todayIncome: todayPayments.reduce((s, p) => s + p.amount, 0),
    complaints: {
      open: openComplaints.length,
      emergency: openComplaints.filter(c => c.isEmergency).length,
      highPriority: openComplaints.filter(c => ['high', 'emergency'].includes(c.aiPriority)).length,
      byCategory: complaintsByCategory
    },
    visitors: { today: todayVisitors, pendingApproval: pendingVisitors },
    upcomingMaintenance
  };
}

export { MONTH_NAMES };
