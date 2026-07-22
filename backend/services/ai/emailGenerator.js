/**
 * Email Generator (Feature #29)
 * Generate professional emails for various PG scenarios.
 */

import { getCompletion } from './openaiClient.js';

/**
 * Generate a professional email
 */
export async function generateProfessionalEmail(type, recipientName = 'Resident', context = '') {
  const templates = {
    welcome: `Generate a warm, professional welcome email for a new PG resident named ${recipientName}. ${context}. Include PG rules overview, facilities, and contact info.`,
    'rent-reminder': `Generate a polite rent reminder email for ${recipientName}. ${context}. Be firm but friendly. Include payment methods and deadline.`,
    'move-out': `Generate a move-out email for ${recipientName} who is leaving the PG. ${context}. Include checkout process, security deposit refund info, and farewell.`,
    'complaint-response': `Generate a professional complaint response email to ${recipientName}. ${context}. Acknowledge the issue, provide timeline, and assure resolution.`,
    notice: `Generate a formal notice email to PG residents. ${context}. Keep it professional and clear.`,
    custom: `Generate a professional email for a PG management context. Recipient: ${recipientName}. ${context}.`
  };

  const prompt = templates[type] || templates.custom;

  try {
    const result = await getCompletion(
      `${prompt}\n\nReturn ONLY valid JSON:\n{\n  "subject": "email subject line",\n  "body": "full HTML email body with proper formatting, paragraphs, and signature",\n  "plainText": "plain text version of the body"\n}`,
      'You are a professional email writer for a PG management company called "SmartPG". Sign emails as "SmartPG Management".',
      { temperature: 0.6 }
    );
    
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid response');
    
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Email generation error:', error);
    return {
      subject: `PG Management - ${type}`,
      body: `Dear ${recipientName},\n\nThank you for your attention.\n\nRegards,\nSmartPG Management`,
      plainText: `Dear ${recipientName}, Thank you for your attention. Regards, SmartPG Management`
    };
  }
}
