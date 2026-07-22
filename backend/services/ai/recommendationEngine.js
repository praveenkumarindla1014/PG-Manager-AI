/**
 * Recommendation Engine (Feature #34)
 */

import { getCompletion } from './openaiClient.js';
import Room from '../../models/Room.js';
import Menu from '../../models/Menu.js';
import MaintenanceSchedule from '../../models/MaintenanceSchedule.js';

export async function getRecommendations(type = 'all') {
  try {
    const rooms = await Room.find().lean();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const menu = await Menu.findOne({ date: { $gte: today } });
    
    const prompt = `As a PG management AI, provide recommendations:

${type === 'all' || type === 'room' ? `Rooms: ${rooms.map(r => `${r.roomNumber}(${r.type},₹${r.rent},${r.status})`).join(', ')}` : ''}
${type === 'all' || type === 'menu' ? `Today's Menu available: ${menu ? 'Yes' : 'No'}` : ''}

Return JSON:
{
  "bestRoom": {"recommendation": "text", "reason": "why"},
  "bestMaintenanceDay": {"recommendation": "text", "reason": "why"},
  "bestMenu": {"recommendation": "text", "reason": "why"},
  "bestPricing": {"recommendation": "text", "reason": "why"},
  "bestOffers": {"recommendation": "text", "reason": "why"}
}`;

    const result = await getCompletion(prompt, 'You are a PG business advisor.', { temperature: 0.5 });
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
  } catch (error) {
    return { message: 'Recommendations unavailable' };
  }
}
