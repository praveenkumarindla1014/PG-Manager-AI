/**
 * WhatsApp Message Generator (Feature #30)
 */

import { getCompletion } from './openaiClient.js';

export async function generateProfessionalWhatsApp(purpose, recipientName = '', context = '') {
  try {
    const result = await getCompletion(
      `Generate a professional WhatsApp message for a PG management system.

Purpose: ${purpose}
Recipient: ${recipientName || 'Tenant'}
Context: ${context || 'General communication'}

Return ONLY valid JSON:
{
  "message": "the WhatsApp message with appropriate emojis, keep it concise and mobile-friendly",
  "isUrgent": boolean
}`,
      'You are a communication specialist. Write concise, professional WhatsApp messages with appropriate emojis. Keep messages short and mobile-friendly.',
      { temperature: 0.6, maxTokens: 500 }
    );
    
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid response');
    
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    return { message: `Hi ${recipientName || 'there'}, this is a message from SmartPG regarding ${purpose}.`, isUrgent: false };
  }
}
