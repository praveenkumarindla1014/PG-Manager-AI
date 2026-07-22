/**
 * OCR Service (Feature #20)
 * Extract data from Aadhaar card images using OpenAI Vision API.
 */

import { analyzeImage } from './openaiClient.js';

export async function extractAadhaarData(imageBase64) {
  try {
    const prompt = `Extract the following information from this Aadhaar card image. Return ONLY valid JSON:
{
  "name": "full name as printed",
  "dob": "date of birth in DD/MM/YYYY format",
  "gender": "male" or "female" or "other",
  "address": "full address as printed",
  "idNumber": "12-digit Aadhaar number (format: XXXX XXXX XXXX)",
  "confidence": confidence percentage 0-100,
  "isValid": boolean - true if this appears to be a genuine Aadhaar card
}

If any field cannot be read, set it to null.`;

    const result = await analyzeImage(imageBase64, prompt);
    
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Could not parse response');
    
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('OCR error:', error);
    return {
      name: null, dob: null, gender: null, address: null, idNumber: null,
      confidence: 0, isValid: false, error: error.message
    };
  }
}
