/**
 * Smart Notice Generator (Feature #7)
 * Takes rough input, creates professional notice with multi-language translations.
 */

import { getCompletion } from './openaiClient.js';
import { translateText } from './languageDetector.js';
import Notice from '../../models/Notice.js';

/**
 * Generate a professional notice from rough input
 */
export async function generateProfessionalNotice(rawInput, priority = 'medium', category = 'general', userId) {
  try {
    const prompt = `Convert this rough message into a professional PG/hostel notice.

Input: "${rawInput}"

Return ONLY valid JSON:
{
  "title": "Professional notice title",
  "content": "Professional, clear notice content with proper formatting. Include relevant details, timing, and any instructions for tenants. Keep it concise but complete."
}`;

    const result = await getCompletion(prompt, 'You are a professional notice writer for a PG management system. Create clear, well-structured notices.', {
      temperature: 0.5,
      maxTokens: 500
    });
    
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid response');
    
    const noticeData = JSON.parse(jsonMatch[0]);
    
    // Generate translations (Feature #28)
    const translations = {
      en: noticeData.content,
      hi: await translateText(noticeData.content, 'hi'),
      te: await translateText(noticeData.content, 'te'),
      ta: await translateText(noticeData.content, 'ta'),
      kn: await translateText(noticeData.content, 'kn')
    };
    
    // Save notice
    const notice = await Notice.create({
      title: noticeData.title,
      content: noticeData.content,
      originalInput: rawInput,
      aiGenerated: true,
      translations,
      priority,
      category,
      createdBy: userId
    });
    
    return notice;
  } catch (error) {
    console.error('Notice generation error:', error);
    
    // Fallback - save raw input as notice
    const notice = await Notice.create({
      title: rawInput.substring(0, 50),
      content: rawInput,
      originalInput: rawInput,
      aiGenerated: false,
      translations: { en: rawInput },
      priority,
      category,
      createdBy: userId
    });
    
    return notice;
  }
}
