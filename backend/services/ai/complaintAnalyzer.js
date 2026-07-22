/**
 * Complaint Analyzer (Features #5, #6, #9, #26)
 * 
 * - Auto-categorize complaints
 * - Assign priority
 * - Estimate repair time
 * - Suggest maintenance staff
 * - Detect duplicates
 * - Sentiment analysis with emoji
 * - Emergency detection
 */

import { getCompletion } from './openaiClient.js';
import Complaint from '../../models/Complaint.js';

const SENTIMENT_EMOJIS = {
  happy: '😊',
  neutral: '😐',
  angry: '😠',
  emergency: '🚨'
};

/**
 * Analyze a complaint using AI (Feature #5, #9)
 */
export async function analyzeComplaint(description) {
  try {
    const prompt = `Analyze this PG/hostel complaint and return a JSON object:

Complaint: "${description}"

Return ONLY valid JSON with these fields:
{
  "category": one of ["electrical", "plumbing", "furniture", "cleaning", "pest-control", "wifi-internet", "ac-cooling", "water-supply", "security", "noise", "food", "other"],
  "priority": one of ["low", "medium", "high", "emergency"],
  "estimatedTime": estimated repair time as string like "2 Hours", "1 Day",
  "suggestedStaff": type of staff needed like "Electrician", "Plumber",
  "generatedReply": a professional, empathetic response to the tenant (2-3 sentences),
  "sentiment": one of ["happy", "neutral", "angry", "emergency"],
  "urgencyScore": number from 0-10,
  "isEmergency": boolean - true ONLY for gas leak, fire, medical emergency, or immediate safety threats,
  "emergencyType": if isEmergency is true, one of ["gas-leak", "fire", "medical", "security", "other"], else null
}`;

    const result = await getCompletion(prompt, 'You are a complaint analysis AI for a PG management system. Always return valid JSON.', {
      temperature: 0.3,
      maxTokens: 500
    });
    
    // Parse JSON from response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid JSON response');
    
    const analysis = JSON.parse(jsonMatch[0]);
    analysis.emoji = SENTIMENT_EMOJIS[analysis.sentiment] || '😐';
    
    return analysis;
  } catch (error) {
    console.error('Complaint analysis error:', error);
    return {
      category: 'other',
      priority: 'medium',
      estimatedTime: 'To be assessed',
      suggestedStaff: 'General Maintenance',
      generatedReply: 'Thank you for reporting this issue. Our team will look into it and resolve it as soon as possible.',
      sentiment: 'neutral',
      emoji: '😐',
      urgencyScore: 5,
      isEmergency: false,
      emergencyType: null
    };
  }
}

/**
 * Detect duplicate complaints (Feature #6)
 */
export async function detectDuplicateComplaint(description, roomId) {
  try {
    // Find recent open complaints with similar category
    const recentComplaints = await Complaint.find({
      status: { $in: ['open', 'in-progress'] },
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    }).lean();
    
    if (recentComplaints.length === 0) {
      return { isDuplicate: false };
    }
    
    const existingDescriptions = recentComplaints.map(c => ({
      id: c._id,
      desc: c.description,
      category: c.aiCategory,
      room: c.room?.toString()
    }));
    
    const prompt = `Compare this new complaint with existing complaints and determine if it's a duplicate (same issue, possibly different reporter).

New complaint: "${description}"

Existing complaints:
${existingDescriptions.map((c, i) => `${i + 1}. [ID: ${c.id}] "${c.desc}" (Category: ${c.category})`).join('\n')}

Return ONLY valid JSON:
{
  "isDuplicate": boolean,
  "masterComplaintIndex": index of the matching complaint (0-based) or -1 if not duplicate,
  "confidence": confidence score 0-100
}`;

    const result = await getCompletion(prompt, 'You are a duplicate detection system. Be strict - only mark as duplicate if the core issue is the same.', {
      temperature: 0.1,
      maxTokens: 200
    });
    
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { isDuplicate: false };
    
    const analysis = JSON.parse(jsonMatch[0]);
    
    if (analysis.isDuplicate && analysis.masterComplaintIndex >= 0 && analysis.confidence > 70) {
      const masterComplaint = recentComplaints[analysis.masterComplaintIndex];
      return {
        isDuplicate: true,
        masterComplaintId: masterComplaint._id,
        confidence: analysis.confidence
      };
    }
    
    return { isDuplicate: false };
  } catch (error) {
    console.error('Duplicate detection error:', error);
    return { isDuplicate: false };
  }
}

export { SENTIMENT_EMOJIS };
