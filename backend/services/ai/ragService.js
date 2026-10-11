/**
 * RAG Service (Feature #35)
 * Retrieval Augmented Generation over the PG knowledge base.
 * Ranks chunks by embedding similarity when embeddings exist, otherwise by
 * keyword overlap, then asks the LLM to answer strictly from those chunks.
 */

import { getCompletion, getEmbedding, isAIConfigured } from './openaiClient.js';
import KnowledgeBase from '../../models/KnowledgeBase.js';

const STOPWORDS = new Set('a an the is are was were be to of in on at for and or what when where who how can i my me we our you your it this that do does did with from by about allowed any there'.split(' '));

function tokenize(text) {
  return text.toLowerCase().replace(/[^a-z0-9\u0900-\u0cff\s]/g, ' ').split(/\s+/)
    .filter(w => w.length > 1 && !STOPWORDS.has(w));
}

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

async function safeEmbedding(text) {
  if (!isAIConfigured()) return null;
  try { return await getEmbedding(text); } catch { return null; }
}

/**
 * Upload and process a document for the knowledge base
 */
export async function processDocument(documentName, content, category, userId) {
  const chunks = chunkText(content, 400);
  const processedChunks = [];
  for (let i = 0; i < chunks.length; i++) {
    const embedding = await safeEmbedding(chunks[i]);
    processedChunks.push({ content: chunks[i], embedding: embedding || [], chunkIndex: i });
  }

  return KnowledgeBase.create({
    documentName,
    category,
    originalContent: content,
    chunks: processedChunks,
    uploadedBy: userId,
    wordCount: content.split(/\s+/).filter(Boolean).length
  });
}

/**
 * Search knowledge base using query (Feature #35)
 */
export async function searchKB(query, category = null) {
  const filter = { isActive: true };
  if (category) filter.category = category;
  const documents = await KnowledgeBase.find(filter);

  if (documents.length === 0) {
    return {
      answer: 'No documents have been added to the knowledge base yet. Please ask the owner to upload the PG rules and policies.',
      sources: []
    };
  }

  const queryTokens = tokenize(query);
  const queryEmbedding = documents.some(d => d.chunks.some(c => c.embedding?.length)) ? await safeEmbedding(query) : null;

  const scored = [];
  for (const doc of documents) {
    for (const chunk of doc.chunks) {
      const chunkTokens = new Set(tokenize(chunk.content));
      const keywordScore = queryTokens.length
        ? queryTokens.filter(w => chunkTokens.has(w) || [...chunkTokens].some(t => t.startsWith(w) || w.startsWith(t))).length / queryTokens.length
        : 0;
      const semanticScore = queryEmbedding && chunk.embedding?.length === queryEmbedding.length
        ? cosine(queryEmbedding, chunk.embedding)
        : 0;
      const score = queryEmbedding ? semanticScore * 0.7 + keywordScore * 0.3 : keywordScore;
      scored.push({ content: chunk.content, documentName: doc.documentName, docId: doc._id, category: doc.category, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  let top = scored.filter(c => c.score > 0.15).slice(0, 5);
  // Small knowledge bases: give the model everything rather than nothing.
  if (top.length === 0 && scored.length <= 30) top = scored.slice(0, 8);

  if (top.length === 0) {
    return {
      answer: "I couldn't find this in the PG rules or policies. Please check with the owner directly.",
      sources: []
    };
  }

  const context = top.map((c, i) => `[${i + 1}] (${c.documentName}) ${c.content}`).join('\n\n');
  let answer;
  try {
    answer = await getCompletion(
      `Question: ${query}\n\nPG policy excerpts:\n${context}`,
      'You answer questions about a PG/hostel using ONLY the policy excerpts provided. Be concise and friendly (2-4 sentences). Quote exact timings and amounts. If the excerpts do not contain the answer, say so plainly and suggest asking the owner. Never invent rules. Reply in the language of the question.',
      { temperature: 0.2 }
    );
  } catch {
    // Offline: quote just the policy lines that mention what was asked.
    const lines = top
      .flatMap(c => c.content.split(/(?=\b\d{1,2}\.\s)|(?<=[.!?])\s+/))
      .map(l => l.trim())
      .filter(Boolean);
    const picked = [...new Set(lines
      .map(l => ({ l, score: queryTokens.filter(w => l.toLowerCase().includes(w)).length }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(x => x.l))];
    answer = picked.length
      ? `Here's what the PG rules say:\n\n${picked.map(l => `• ${l.replace(/^\d{1,2}\.\s*/, '')}`).join('\n')}`
      : top[0].content;
  }

  await KnowledgeBase.updateMany(
    { _id: { $in: [...new Set(top.map(c => String(c.docId)))] } },
    { $inc: { queryCount: 1 }, $set: { lastQueried: new Date() } }
  ).catch(() => {});

  return {
    answer,
    sources: top.slice(0, 3).map(c => ({
      document: c.documentName,
      category: c.category,
      excerpt: c.content.slice(0, 160),
      relevanceScore: Math.round(Math.min(1, c.score) * 100)
    }))
  };
}

/**
 * Chunk text into pieces of roughly `maxChunkSize` characters, keeping lines intact.
 */
export function chunkText(text, maxChunkSize = 400) {
  const pieces = text.split(/\n+|(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
  const chunks = [];
  let current = '';
  for (const piece of pieces) {
    if (current && (current + ' ' + piece).length > maxChunkSize) {
      chunks.push(current);
      current = piece;
    } else {
      current = current ? `${current} ${piece}` : piece;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}
