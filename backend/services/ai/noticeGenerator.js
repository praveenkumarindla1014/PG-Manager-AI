/**
 * Smart Notice Generator (Feature #7)
 * Rough owner input → polished notice + Hindi/Telugu/Tamil/Kannada translations in one AI call.
 */

import { getJSON, isAIConfigured } from './openaiClient.js';
import Notice from '../../models/Notice.js';

function fallbackTitle(raw) {
  const clean = raw.trim().replace(/\s+/g, ' ');
  const title = clean.length > 60 ? clean.slice(0, 57) + '…' : clean;
  return title.charAt(0).toUpperCase() + title.slice(1);
}

export async function draftNotice(rawInput) {
  if (!isAIConfigured()) {
    return { title: fallbackTitle(rawInput), content: rawInput.trim(), translations: { en: rawInput.trim() }, aiGenerated: false };
  }
  try {
    const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const result = await getJSON(
      `Turn the owner's rough note into a clear notice for residents of an Indian PG hostel. Today is ${today} — resolve words like "tomorrow" into actual dates.

Owner's note: """${rawInput}"""

Return ONLY JSON:
{
  "title": "short title (max 8 words, may include one fitting emoji)",
  "content": "Warm, clear notice in English: 'Dear residents,' + what/when/where + what they should do + apology/thanks if relevant + '— Management'. Max 90 words. Use line breaks.",
  "hi": "same notice in Hindi",
  "te": "same notice in Telugu",
  "ta": "same notice in Tamil",
  "kn": "same notice in Kannada"
}`,
      'You write friendly, precise building notices and translate them accurately. JSON only.',
      { temperature: 0.4, maxTokens: 2500 }
    );
    return {
      title: result.title || fallbackTitle(rawInput),
      content: result.content || rawInput,
      translations: { en: result.content, hi: result.hi, te: result.te, ta: result.ta, kn: result.kn },
      aiGenerated: true
    };
  } catch (error) {
    console.warn('Notice drafting fell back to raw text:', error.message);
    return { title: fallbackTitle(rawInput), content: rawInput.trim(), translations: { en: rawInput.trim() }, aiGenerated: false };
  }
}

export async function generateProfessionalNotice(rawInput, priority = 'medium', category = 'general', userId) {
  const draft = await draftNotice(rawInput);
  return Notice.create({
    title: draft.title,
    content: draft.content,
    originalInput: rawInput,
    aiGenerated: draft.aiGenerated,
    translations: draft.translations,
    priority,
    category,
    createdBy: userId
  });
}
