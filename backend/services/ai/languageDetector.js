/**
 * Language Detector (Feature #28)
 * Detects input language and enables multi-language responses.
 */

import { getCompletion } from './openaiClient.js';

const SUPPORTED_LANGUAGES = {
  en: 'English',
  hi: 'Hindi',
  te: 'Telugu',
  ta: 'Tamil',
  kn: 'Kannada'
};

/**
 * Detect the language of input text
 */
export async function detectLanguage(text) {
  // Quick heuristic check for common patterns before using AI
  const hindiPattern = /[\u0900-\u097F]/;
  const teluguPattern = /[\u0C00-\u0C7F]/;
  const tamilPattern = /[\u0B80-\u0BFF]/;
  const kannadaPattern = /[\u0C80-\u0CFF]/;
  
  if (hindiPattern.test(text)) return 'hi';
  if (teluguPattern.test(text)) return 'te';
  if (tamilPattern.test(text)) return 'ta';
  if (kannadaPattern.test(text)) return 'kn';
  
  // If it's clearly English (ASCII), skip the AI call
  if (/^[\x00-\x7F\s]+$/.test(text)) return 'en';
  
  // For mixed or ambiguous text, use AI
  try {
    const result = await getCompletion(
      `Detect the language of this text and respond with ONLY the language code (en, hi, te, ta, kn): "${text}"`,
      'You are a language detection system. Respond only with a language code.',
      { maxTokens: 10, temperature: 0 }
    );
    
    const code = result.trim().toLowerCase();
    return SUPPORTED_LANGUAGES[code] ? code : 'en';
  } catch {
    return 'en';
  }
}

/**
 * Translate text to a target language
 */
export async function translateText(text, targetLang) {
  if (targetLang === 'en') return text;
  
  const langName = SUPPORTED_LANGUAGES[targetLang] || 'English';
  
  try {
    const result = await getCompletion(
      `Translate the following text to ${langName}. Provide ONLY the translation, no explanations:\n\n${text}`,
      `You are a professional translator. Translate accurately to ${langName}.`,
      { temperature: 0.3 }
    );
    
    return result.trim();
  } catch {
    return text;
  }
}

export { SUPPORTED_LANGUAGES };
