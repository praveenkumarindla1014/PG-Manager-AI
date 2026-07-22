/**
 * Revenue Optimizer (Feature #31)
 * Suggest rent adjustments, discounts, identify underpriced rooms.
 */

import { getCompletion } from './openaiClient.js';
import Room from '../../models/Room.js';
import Payment from '../../models/Payment.js';

export async function getRevenueOptimizationSuggestions() {
  try {
    const rooms = await Room.find().lean();
    const now = new Date();
    const payments = await Payment.find({ year: now.getFullYear() });
    
    const roomData = rooms.map(r => ({
      number: r.roomNumber,
      floor: r.floor,
      type: r.type,
      rent: r.rent,
      hasAC: r.hasAC,
      status: r.status,
      occupancyRate: r.currentOccupants?.length > 0 ? 
        ((r.currentOccupants.length / r.maxOccupants) * 100) : 0
    }));
    
    const prompt = `Analyze these PG rooms and suggest revenue optimization:

Rooms:
${roomData.map(r => `Room ${r.number} (Floor ${r.floor}, ${r.type}, ${r.hasAC ? 'AC' : 'Non-AC'}): ₹${r.rent}/month, ${r.status}, ${r.occupancyRate}% occupied`).join('\n')}

Total monthly revenue: ₹${payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0)}

Return JSON:
{
  "underpricedRooms": [{"roomNumber": "X", "currentRent": X, "suggestedRent": X, "reason": "why"}],
  "discountSuggestions": [{"target": "who", "discount": "how much", "reason": "why"}],
  "rentIncreaseSuggestions": [{"roomNumber": "X", "suggestedIncrease": X, "reason": "why"}],
  "generalSuggestions": ["suggestion 1", "suggestion 2"],
  "estimatedRevenueIncrease": number
}`;

    const result = await getCompletion(prompt, 'You are a revenue optimization AI for property management in India.', {
      temperature: 0.4
    });
    
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { generalSuggestions: ['Insufficient data for optimization'] };
  } catch (error) {
    console.error('Revenue optimization error:', error);
    return { generalSuggestions: ['Revenue analysis temporarily unavailable'] };
  }
}
