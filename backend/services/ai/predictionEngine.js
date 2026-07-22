/**
 * Prediction Engine (Features #10, #11, #16, #18)
 * - Rent payment prediction
 * - Occupancy prediction
 * - Maintenance prediction
 * - Expense prediction
 */

import { getCompletion } from './openaiClient.js';
import User from '../../models/User.js';
import Room from '../../models/Room.js';
import Payment from '../../models/Payment.js';
import Complaint from '../../models/Complaint.js';
import Expense from '../../models/Expense.js';

/**
 * Predict rent payment behavior (Feature #10)
 */
export async function predictRentPayments() {
  try {
    const tenants = await User.find({ role: 'tenant', isActive: true })
      .select('name paymentBehavior roomId')
      .populate('roomId', 'roomNumber rent');
    
    const payments = await Payment.find({
      createdAt: { $gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) }
    }).populate('tenant', 'name');
    
    // Build payment history per tenant
    const tenantPaymentData = {};
    payments.forEach(p => {
      const tid = p.tenant?._id?.toString();
      if (!tid) return;
      if (!tenantPaymentData[tid]) tenantPaymentData[tid] = [];
      tenantPaymentData[tid].push({
        daysLate: p.daysLate,
        month: p.month,
        status: p.status
      });
    });
    
    const predictions = tenants.map(tenant => {
      const history = tenantPaymentData[tenant._id.toString()] || [];
      const lateCount = history.filter(h => h.daysLate > 0).length;
      const totalPayments = history.length || 1;
      const avgDaysLate = history.reduce((s, h) => s + h.daysLate, 0) / totalPayments;
      const lateProbability = Math.min(100, Math.round((lateCount / totalPayments) * 100));
      
      return {
        tenantName: tenant.name,
        roomNumber: tenant.roomId?.roomNumber,
        rent: tenant.roomId?.rent,
        totalPayments,
        latePayments: lateCount,
        averageDaysLate: Math.round(avgDaysLate),
        lateProbability,
        behavior: lateProbability > 60 ? 'Frequently Late' : lateProbability > 30 ? 'Sometimes Late' : 'Usually On-time',
        risk: lateProbability > 60 ? 'high' : lateProbability > 30 ? 'medium' : 'low'
      };
    });
    
    return {
      predictions: predictions.sort((a, b) => b.lateProbability - a.lateProbability),
      summary: {
        totalTenants: tenants.length,
        highRisk: predictions.filter(p => p.risk === 'high').length,
        mediumRisk: predictions.filter(p => p.risk === 'medium').length,
        lowRisk: predictions.filter(p => p.risk === 'low').length
      }
    };
  } catch (error) {
    console.error('Rent prediction error:', error);
    return { predictions: [], summary: {} };
  }
}

/**
 * Predict occupancy (Feature #11)
 */
export async function predictOccupancy(period = 'next-month') {
  try {
    const rooms = await Room.find();
    const totalRooms = rooms.length;
    const occupiedRooms = rooms.filter(r => r.status !== 'available').length;
    const currentRate = totalRooms > 0 ? (occupiedRooms / totalRooms * 100) : 0;
    
    // Get tenants with move-out dates
    const tenants = await User.find({ role: 'tenant', isActive: true, moveOutDate: { $exists: true } });
    const movingOutSoon = tenants.filter(t => {
      const daysUntilMoveOut = (new Date(t.moveOutDate) - new Date()) / (1000 * 60 * 60 * 24);
      return daysUntilMoveOut > 0 && daysUntilMoveOut <= 30;
    });
    
    const prompt = `Based on this PG data, predict occupancy:

Current occupancy: ${currentRate.toFixed(1)}% (${occupiedRooms}/${totalRooms} rooms)
Tenants moving out in 30 days: ${movingOutSoon.length}
Period to predict: ${period}

Return JSON:
{
  "predictedOccupancy": percentage number,
  "trend": "increasing" or "decreasing" or "stable",
  "reasoning": "brief explanation",
  "recommendations": ["actionable suggestion 1", "suggestion 2"]
}`;

    const result = await getCompletion(prompt, 'You are a business analytics AI for a PG hostel. Make reasonable predictions.', {
      temperature: 0.3
    });
    
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    const prediction = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    
    return {
      currentOccupancy: currentRate.toFixed(1),
      occupiedRooms,
      totalRooms,
      movingOutSoon: movingOutSoon.length,
      period,
      ...prediction
    };
  } catch (error) {
    console.error('Occupancy prediction error:', error);
    return { currentOccupancy: 0, message: 'Prediction unavailable' };
  }
}

/**
 * Predict maintenance needs (Feature #16)
 */
export async function predictMaintenance(type = null) {
  try {
    const complaints = await Complaint.find({
      createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }
    }).populate('room', 'roomNumber floor hasAC maintenanceHistory');
    
    // Group complaints by room and category
    const roomComplaints = {};
    complaints.forEach(c => {
      const roomNum = c.room?.roomNumber || 'unknown';
      if (!roomComplaints[roomNum]) roomComplaints[roomNum] = {};
      const cat = c.aiCategory || 'other';
      roomComplaints[roomNum][cat] = (roomComplaints[roomNum][cat] || 0) + 1;
    });
    
    const prompt = `Based on complaint history for a PG, predict maintenance needs:

Complaint data by room:
${Object.entries(roomComplaints).map(([room, cats]) => 
  `Room ${room}: ${Object.entries(cats).map(([c, n]) => `${c}(${n})`).join(', ')}`
).join('\n')}

${type ? `Focus on: ${type}` : 'Cover all maintenance types.'}

Return JSON:
{
  "predictions": [
    {
      "roomNumber": "room",
      "type": "maintenance type",
      "probability": percentage,
      "estimatedDate": "approximate date",
      "estimatedCost": cost in INR,
      "reason": "why this is predicted"
    }
  ],
  "generalRecommendations": ["recommendation 1", "recommendation 2"]
}`;

    const result = await getCompletion(prompt, 'You are a maintenance prediction AI for property management.', {
      temperature: 0.3
    });
    
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { predictions: [], generalRecommendations: [] };
  } catch (error) {
    console.error('Maintenance prediction error:', error);
    return { predictions: [], generalRecommendations: [] };
  }
}

/**
 * Predict expenses (Feature #18)
 */
export async function predictExpenses() {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const expenses = await Expense.find({
      date: { $gte: sixMonthsAgo }
    }).sort({ date: 1 });
    
    // Group by category and month
    const categoryMonthly = {};
    expenses.forEach(e => {
      if (!categoryMonthly[e.category]) categoryMonthly[e.category] = [];
      categoryMonthly[e.category].push({ month: e.month, year: e.year, amount: e.amount });
    });
    
    const predictions = {};
    for (const [category, data] of Object.entries(categoryMonthly)) {
      const amounts = data.map(d => d.amount);
      const avg = amounts.reduce((s, a) => s + a, 0) / amounts.length;
      const trend = amounts.length >= 2 
        ? (amounts[amounts.length - 1] - amounts[0]) / amounts.length 
        : 0;
      predictions[category] = {
        averageMonthly: Math.round(avg),
        predictedNextMonth: Math.round(avg + trend),
        trend: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable',
        dataPoints: amounts.length
      };
    }
    
    const totalPredicted = Object.values(predictions).reduce((s, p) => s + p.predictedNextMonth, 0);
    
    return {
      byCategory: predictions,
      totalPredictedNextMonth: totalPredicted,
      message: `Predicted total expenses next month: ₹${totalPredicted.toLocaleString('en-IN')}`
    };
  } catch (error) {
    console.error('Expense prediction error:', error);
    return { byCategory: {}, totalPredictedNextMonth: 0 };
  }
}
