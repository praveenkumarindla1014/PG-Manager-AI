/**
 * Face Verifier (Feature #21)
 * Compare uploaded ID photo with selfie using OpenAI Vision API.
 */

import { compareTwoImages } from './openaiClient.js';

export async function verifyFace(idImageBase64, selfieBase64) {
  try {
    const prompt = `Compare these two images. The first is an ID card photo and the second is a selfie.

Determine if they appear to be the SAME person. Consider:
- Facial structure
- Key features (eyes, nose, mouth shape)
- Allow for differences in age, lighting, angle, and expression

Return ONLY valid JSON:
{
  "isMatch": boolean - true if they appear to be the same person,
  "confidence": confidence percentage 0-100,
  "matchDetails": "brief explanation of matching/non-matching features",
  "warnings": ["any warnings like poor image quality, face partially hidden, etc."]
}

IMPORTANT: This is for identity verification in a PG management system. Be reasonably strict but not overly so.`;

    const result = await compareTwoImages(idImageBase64, selfieBase64, prompt);
    
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Could not parse response');
    
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Face verification error:', error);
    return {
      isMatch: false, confidence: 0,
      matchDetails: 'Verification failed due to an error',
      warnings: [error.message]
    };
  }
}
