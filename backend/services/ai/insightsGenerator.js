/**
 * Insights Generator (Features #12, #25, #32, #33)
 * - Daily business insights
 * - Daily summary generation
 * - Dashboard narrative insights
 * - Smart to-do list
 */

import { getCompletion } from './openaiClient.js';
import Room from '../../models/Room.js';
import User from '../../models/User.js';
import Payment from '../../models/Payment.js';
import Complaint from '../../models/Complaint.js';
import Expense from '../../models/Expense.js';
import Visitor from '../../models/Visitor.js';
import DailySummary from '../../models/DailySummary.js';
import MaintenanceSchedule from '../../models/MaintenanceSchedule.js';

/**
 * Generate daily summary (Feature #25)
 */
export async function generateDailySummary(dateStr = null) {
  try {
    const date = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Check if summary already exists for today
    const existing = await DailySummary.findOne({
      date: { $gte: startOfDay, $lte: endOfDay }
    });
    if (existing) return existing;
    
    // Gather all data
    const rooms = await Room.find();
    const totalRooms = rooms.length;
    const occupiedRooms = rooms.filter(r => r.status !== 'available').length;
    const availableRooms = totalRooms - occupiedRooms;
    
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    const payments = await Payment.find({ month: currentMonth, year: currentYear });
    const todayPayments = payments.filter(p => p.paidDate >= startOfDay && p.paidDate <= endOfDay);
    const todayIncome = todayPayments.reduce((s, p) => s + p.amount, 0);
    const totalMonthlyIncome = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
    const pendingPayments = payments.filter(p => p.status === 'pending' || p.status === 'overdue');
    const pendingRent = pendingPayments.reduce((s, p) => s + p.amount, 0);
    
    const complaints = await Complaint.find({
      status: { $in: ['open', 'in-progress'] }
    });
    const newComplaints = await Complaint.countDocuments({
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });
    
    const visitors = await Visitor.countDocuments({
      checkIn: { $gte: startOfDay, $lte: endOfDay }
    });
    
    const newTenants = await User.countDocuments({
      role: 'tenant',
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });
    
    const expenses = await Expense.find({ month: currentMonth, year: currentYear });
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    
    const latePayments = payments.filter(p => p.status === 'overdue');
    
    // Generate AI insights
    const insights = await generateInsightsFromData({
      totalRooms, occupiedRooms, availableRooms,
      todayIncome, totalMonthlyIncome, pendingRent,
      pendingComplaints: complaints.length, newComplaints,
      visitors, newTenants, totalExpenses,
      latePayments: latePayments.length
    });
    
    // Generate AI to-do list
    const todos = await generateSmartTodoFromData({
      pendingPayments,
      complaints,
      rooms: rooms.filter(r => r.status === 'maintenance')
    });
    
    const summary = await DailySummary.create({
      date: startOfDay,
      totalRooms,
      occupiedRooms,
      availableRooms,
      occupancyRate: totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toFixed(1) : 0,
      todayIncome,
      expectedIncome: rooms.reduce((s, r) => s + r.rent, 0),
      pendingRent,
      totalExpenses,
      newTenants,
      totalTenants: await User.countDocuments({ role: 'tenant', isActive: true }),
      newComplaints,
      pendingComplaints: complaints.length,
      emergencyComplaints: complaints.filter(c => c.isEmergency).length,
      todayVisitors: visitors,
      latePayments: latePayments.length,
      latePaymentAmount: latePayments.reduce((s, p) => s + p.amount, 0),
      aiInsights: insights,
      aiSuggestions: insights.slice(0, 3),
      todoList: todos
    });
    
    return summary;
  } catch (error) {
    console.error('Daily summary error:', error);
    return null;
  }
}

/**
 * Generate AI insights from data (Feature #32)
 */
async function generateInsightsFromData(data) {
  try {
    const prompt = `Based on this PG daily data, generate 5-7 concise business insights:

- Occupancy: ${data.occupiedRooms}/${data.totalRooms} rooms (${((data.occupiedRooms/data.totalRooms)*100).toFixed(1)}%)
- Today's income: ₹${data.todayIncome}
- Monthly income so far: ₹${data.totalMonthlyIncome}
- Pending rent: ₹${data.pendingRent}
- Pending complaints: ${data.pendingComplaints} (${data.newComplaints} new today)
- Today's visitors: ${data.visitors}
- New tenants today: ${data.newTenants}
- Total expenses: ₹${data.totalExpenses}
- Late payments: ${data.latePayments}

Return a JSON array of insight strings. Each insight should be actionable and specific.
Example: ["Occupancy increased by 15% this week", "3 tenants have overdue payments totaling ₹21,000"]`;

    const result = await getCompletion(prompt, 'You are a business intelligence AI for property management. Generate clear, actionable insights.', {
      temperature: 0.5
    });
    
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
  } catch (error) {
    return ['AI insights temporarily unavailable'];
  }
}

/**
 * Generate business insights (Feature #12)
 */
export async function generateInsights() {
  const rooms = await Room.find();
  const now = new Date();
  const payments = await Payment.find({ month: now.getMonth() + 1, year: now.getFullYear() });
  const complaints = await Complaint.find({ status: { $in: ['open', 'in-progress'] } });
  
  const data = {
    totalRooms: rooms.length,
    occupiedRooms: rooms.filter(r => r.status !== 'available').length,
    todayIncome: 0,
    totalMonthlyIncome: payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0),
    pendingRent: payments.filter(p => p.status !== 'paid').reduce((s, p) => s + p.amount, 0),
    pendingComplaints: complaints.length,
    newComplaints: 0,
    visitors: 0,
    newTenants: 0,
    totalExpenses: 0,
    latePayments: payments.filter(p => p.status === 'overdue').length
  };
  
  const insights = await generateInsightsFromData(data);
  return { insights, data };
}

/**
 * Generate smart to-do list from data (Feature #33)
 */
async function generateSmartTodoFromData(data) {
  try {
    const tasks = [];
    
    // Auto-generate todos from pending items
    if (data.pendingPayments?.length > 0) {
      for (const payment of data.pendingPayments.slice(0, 5)) {
        const tenant = await User.findById(payment.tenant).populate('roomId');
        tasks.push({
          task: `Collect rent from ${tenant?.name || 'Tenant'} - Room ${tenant?.roomId?.roomNumber || '?'} (₹${payment.amount})`,
          priority: payment.status === 'overdue' ? 'high' : 'medium',
          category: 'payment',
          completed: false
        });
      }
    }
    
    if (data.complaints?.length > 0) {
      for (const complaint of data.complaints.slice(0, 5)) {
        tasks.push({
          task: `Resolve ${complaint.aiCategory || 'complaint'} issue in Room ${complaint.room?.roomNumber || '?'}: ${complaint.description?.substring(0, 50)}...`,
          priority: complaint.aiPriority || 'medium',
          category: 'complaint',
          completed: false
        });
      }
    }
    
    if (data.rooms?.length > 0) {
      for (const room of data.rooms) {
        tasks.push({
          task: `Complete maintenance for Room ${room.roomNumber}`,
          priority: 'medium',
          category: 'maintenance',
          completed: false
        });
      }
    }
    
    return tasks;
  } catch (error) {
    return [];
  }
}

/**
 * Generate smart to-do (standalone call) (Feature #33)
 */
export async function generateSmartTodo() {
  const pendingPayments = await Payment.find({ status: { $in: ['pending', 'overdue'] } })
    .populate('tenant', 'name roomId').populate('room', 'roomNumber');
  const complaints = await Complaint.find({ status: { $in: ['open', 'in-progress'] } })
    .populate('room', 'roomNumber');
  const maintenanceRooms = await Room.find({ status: 'maintenance' });
  
  return generateSmartTodoFromData({
    pendingPayments,
    complaints,
    rooms: maintenanceRooms
  });
}
