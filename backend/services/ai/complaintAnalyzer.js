/**
 * Complaint Analyzer (Features #5, #6, #9, #26)
 *
 * - Auto-categorise, prioritise, estimate repair time, suggest staff
 * - Sentiment with emoji
 * - Emergency detection (keyword safety net + AI)
 * - Duplicate grouping
 *
 * Works without AI too: a keyword classifier provides sensible defaults.
 */

import { getJSON, isAIConfigured } from './openaiClient.js';
import { isEmergencyComplaint } from './emergencyDetector.js';
import Complaint from '../../models/Complaint.js';

const SENTIMENT_EMOJIS = { happy: '😊', neutral: '😐', angry: '😠', emergency: '🚨' };
const CATEGORIES = ['electrical', 'plumbing', 'furniture', 'cleaning', 'pest-control', 'wifi-internet', 'ac-cooling', 'water-supply', 'security', 'noise', 'food', 'other'];

const RULES = [
  { category: 'ac-cooling', words: ['ac ', ' ac', 'air condition', 'cooling', 'aircon'], staff: 'AC Technician', time: '1 Day', priority: 'high' },
  { category: 'wifi-internet', words: ['wifi', 'wi-fi', 'internet', 'network', 'router', 'net slow'], staff: 'IT Support', time: '2 Hours', priority: 'high' },
  { category: 'plumbing', words: ['leak', 'tap', 'drain', 'flush', 'toilet', 'pipe', 'clog', 'blocked'], staff: 'Plumber', time: '3 Hours', priority: 'medium' },
  { category: 'water-supply', words: ['no water', 'water supply', 'water not coming', 'hot water', 'water pressure'], staff: 'Plumber', time: '2 Hours', priority: 'high' },
  { category: 'electrical', words: ['fan', 'light', 'bulb', 'switch', 'socket', 'power', 'geyser', 'current', 'electric', 'wiring', 'plug'], staff: 'Electrician', time: '4 Hours', priority: 'medium' },
  { category: 'pest-control', words: ['cockroach', 'rat', 'mice', 'mouse', 'bed bug', 'bedbug', 'mosquito', 'insect', 'ants', 'pest', 'lizard'], staff: 'Pest Control', time: '2 Days', priority: 'high' },
  { category: 'cleaning', words: ['dirty', 'clean', 'dust', 'garbage', 'smell', 'trash', 'washroom', 'bathroom dirty'], staff: 'Housekeeping', time: '4 Hours', priority: 'low' },
  { category: 'furniture', words: ['bed', 'chair', 'table', 'cupboard', 'door', 'window', 'mattress', 'lock', 'broken', 'hinge', 'wardrobe'], staff: 'Carpenter', time: '1 Day', priority: 'low' },
  { category: 'food', words: ['food', 'meal', 'breakfast', 'lunch', 'dinner', 'rice', 'curry', 'taste', 'stale', 'cold food', 'undercooked'], staff: 'Kitchen Manager', time: '1 Day', priority: 'medium' },
  { category: 'noise', words: ['noise', 'loud', 'music', 'party', 'shouting', 'disturb'], staff: 'Warden', time: '1 Day', priority: 'low' },
  { category: 'security', words: ['theft', 'stolen', 'stranger', 'unsafe', 'security', 'cctv', 'missing'], staff: 'Security', time: '2 Hours', priority: 'high' }
];

const ANGRY_WORDS = ['again', 'still', 'worst', 'terrible', 'fed up', 'frustrat', 'angry', 'pathetic', 'useless', 'days', 'since', 'not working', '!!', 'immediately', 'urgent'];
const HAPPY_WORDS = ['thank', 'thanks', 'great', 'appreciate', 'please when convenient', 'no hurry'];

function keywordAnalysis(description) {
  const text = ` ${description.toLowerCase()} `;
  const rule = RULES.find(r => r.words.some(w => text.includes(w))) || { category: 'other', staff: 'General Maintenance', time: '1 Day', priority: 'medium' };
  const emergency = isEmergencyComplaint(description);

  let sentiment = 'neutral';
  if (emergency.isEmergency) sentiment = 'emergency';
  else if (ANGRY_WORDS.some(w => text.includes(w))) sentiment = 'angry';
  else if (HAPPY_WORDS.some(w => text.includes(w))) sentiment = 'happy';

  const priority = emergency.isEmergency ? 'emergency' : sentiment === 'angry' && rule.priority === 'medium' ? 'high' : rule.priority;
  const urgency = { low: 3, medium: 5, high: 7, emergency: 10 }[priority];
  const staffLower = rule.staff.toLowerCase();

  return {
    category: emergency.isEmergency && emergency.emergencyType === 'security' ? 'security' : rule.category,
    priority,
    estimatedTime: emergency.isEmergency ? 'Immediate' : rule.time,
    suggestedStaff: emergency.isEmergency ? 'Owner / Emergency services' : rule.staff,
    generatedReply: emergency.isEmergency
      ? 'We have raised an emergency alert and the owner has been notified right now. Please move to a safe place and call 112 if anyone is in danger.'
      : `Thanks for letting us know — sorry about the trouble. We've logged this and a ${staffLower} will look into it within ${rule.time.toLowerCase()}.`,
    sentiment,
    urgencyScore: urgency,
    isEmergency: emergency.isEmergency,
    emergencyType: emergency.emergencyType
  };
}

/**
 * Analyze a complaint (Features #5, #9, #26)
 */
export async function analyzeComplaint(description) {
  const base = keywordAnalysis(description);
  if (!isAIConfigured()) return { ...base, emoji: SENTIMENT_EMOJIS[base.sentiment] };

  try {
    const ai = await getJSON(
      `Analyse this complaint from a PG (paying-guest hostel) resident in India.

Complaint: """${description}"""

Return ONLY JSON:
{
  "category": one of ${JSON.stringify(CATEGORIES)},
  "priority": "low" | "medium" | "high" | "emergency",
  "estimatedTime": realistic fix time like "2 Hours", "1 Day",
  "suggestedStaff": e.g. "Electrician", "Plumber", "Housekeeping",
  "generatedReply": a warm, human 1-2 sentence reply to the resident (no corporate jargon, address the actual problem),
  "sentiment": "happy" | "neutral" | "angry" | "emergency",
  "urgencyScore": 0-10,
  "isEmergency": true ONLY for fire, gas leak, medical emergency, electrocution risk, break-in or immediate danger,
  "emergencyType": "gas-leak" | "fire" | "medical" | "security" | "other" | null
}`,
      'You triage maintenance complaints for a PG hostel. Respond with valid JSON only.',
      { temperature: 0.2, maxTokens: 500 }
    );

    const result = {
      category: CATEGORIES.includes(ai.category) ? ai.category : base.category,
      priority: ['low', 'medium', 'high', 'emergency'].includes(ai.priority) ? ai.priority : base.priority,
      estimatedTime: ai.estimatedTime || base.estimatedTime,
      suggestedStaff: ai.suggestedStaff || base.suggestedStaff,
      generatedReply: ai.generatedReply || base.generatedReply,
      sentiment: SENTIMENT_EMOJIS[ai.sentiment] ? ai.sentiment : base.sentiment,
      urgencyScore: Math.max(0, Math.min(10, Number(ai.urgencyScore) || base.urgencyScore)),
      // Keyword safety net: never downgrade a clear emergency.
      isEmergency: !!ai.isEmergency || base.isEmergency,
      emergencyType: ai.emergencyType || base.emergencyType
    };
    if (result.isEmergency) {
      result.priority = 'emergency';
      result.sentiment = 'emergency';
      result.urgencyScore = 10;
      if (!['gas-leak', 'fire', 'medical', 'security', 'other'].includes(result.emergencyType)) result.emergencyType = 'other';
    }
    result.emoji = SENTIMENT_EMOJIS[result.sentiment];
    return result;
  } catch (error) {
    console.warn('Complaint analysis fell back to keywords:', error.message);
    return { ...base, emoji: SENTIMENT_EMOJIS[base.sentiment] };
  }
}

/**
 * Detect duplicate complaints (Feature #6) — same issue reported again
 * (often by a roommate or neighbour) within the last 7 days.
 */
export async function detectDuplicateComplaint(description, roomId, category) {
  try {
    const query = {
      status: { $in: ['open', 'in-progress'] },
      isDuplicate: { $ne: true },
      createdAt: { $gte: new Date(Date.now() - 7 * 86400000) }
    };
    if (category && category !== 'other') query.aiCategory = category;
    const recent = await Complaint.find(query).populate('room', 'roomNumber floor').limit(15).lean();
    if (!recent.length) return { isDuplicate: false };

    if (!isAIConfigured()) {
      // Without AI: same room + same category is a duplicate.
      const match = roomId && recent.find(c => String(c.room?._id) === String(roomId));
      return match ? { isDuplicate: true, masterComplaintId: match._id, confidence: 70 } : { isDuplicate: false };
    }

    const result = await getJSON(
      `New complaint: "${description}"

Existing open complaints:
${recent.map((c, i) => `${i}. [Room ${c.room?.roomNumber || '?'}] "${c.description}"`).join('\n')}

Is the new complaint about the SAME underlying problem as one of these (e.g. the same broken AC, the building-wide WiFi outage)? Different rooms with separate faults are NOT duplicates.
Return ONLY JSON: {"isDuplicate": boolean, "index": number or -1, "confidence": 0-100}`,
      'You detect duplicate maintenance tickets. Be strict.',
      { temperature: 0, maxTokens: 120 }
    );

    if (result.isDuplicate && result.index >= 0 && result.index < recent.length && result.confidence >= 75) {
      return { isDuplicate: true, masterComplaintId: recent[result.index]._id, confidence: result.confidence };
    }
    return { isDuplicate: false };
  } catch (error) {
    console.warn('Duplicate detection skipped:', error.message);
    return { isDuplicate: false };
  }
}

export { SENTIMENT_EMOJIS };
