/**
 * RAG Service (Feature #35)
 * Retrieval Augmented Generation for PG knowledge base.
 */

import { getCompletion, getEmbedding } from './openaiClient.js';
import KnowledgeBase from '../../models/KnowledgeBase.js';

/**
 * Upload and process a document for the knowledge base
 */
export async function processDocument(documentName, content, category, userId) {
  try {
    // Chunk the document
    const chunks = chunkText(content, 500);
    
    // Generate embeddings for each chunk
    const processedChunks = [];
    for (let i = 0; i < chunks.length; i++) {
      try {
        const embedding = await getEmbedding(chunks[i]);
        processedChunks.push({
          content: chunks[i],
          embedding,
          chunkIndex: i
        });
      } catch {
        processedChunks.push({
          content: chunks[i],
          embedding: [],
          chunkIndex: i
        });
      }
    }
    
    const doc = await KnowledgeBase.create({
      documentName,
      category,
      originalContent: content,
      chunks: processedChunks,
      uploadedBy: userId,
      wordCount: content.split(/\s+/).length
    });
    
    return doc;
  } catch (error) {
    console.error('Document processing error:', error);
    throw error;
  }
}

/**
 * Search knowledge base using query (Feature #35)
 */
export async function searchKB(query, category = null) {
  try {
    // Find relevant documents
    const filter = { isActive: true };
    if (category) filter.category = category;
    
    const documents = await KnowledgeBase.find(filter);
    
    if (documents.length === 0) {
      return {
        answer: 'No documents found in the knowledge base. Please ask the owner to upload PG rules and policies.',
        sources: []
      };
    }
    
    // Simple text-based search (works without embeddings)
    const relevantChunks = [];
    const queryWords = query.toLowerCase().split(/\s+/);
    
    for (const doc of documents) {
      for (const chunk of doc.chunks) {
        const chunkLower = chunk.content.toLowerCase();
        const matchScore = queryWords.filter(w => chunkLower.includes(w)).length / queryWords.length;
        
        if (matchScore > 0.2) {
          relevantChunks.push({
            content: chunk.content,
            documentName: doc.documentName,
            category: doc.category,
            score: matchScore
          });
        }
      }
    }
    
    // Sort by relevance
    relevantChunks.sort((a, b) => b.score - a.score);
    const topChunks = relevantChunks.slice(0, 5);
    
    if (topChunks.length === 0) {
      return {
        answer: 'I could not find relevant information in the PG knowledge base for your query. Try rephrasing or ask the owner directly.',
        sources: []
      };
    }
    
    // Generate answer from context
    const context = topChunks.map(c => c.content).join('\n\n');
    
    const answer = await getCompletion(
      `Answer this question based ONLY on the provided context. If the answer is not in the context, say "This information is not available in the PG rules/policies."

Question: ${query}

Context from PG documents:
${context}`,
      'You are a PG information assistant. Answer questions ONLY based on the provided context from PG policy documents. Never make up rules or policies.',
      { temperature: 0.3 }
    );
    
    // Update query count
    const docIds = [...new Set(topChunks.map(c => c.documentName))];
    await KnowledgeBase.updateMany(
      { documentName: { $in: docIds } },
      { $inc: { queryCount: 1 }, $set: { lastQueried: new Date() } }
    );
    
    return {
      answer,
      sources: topChunks.map(c => ({
        document: c.documentName,
        category: c.category,
        relevanceScore: Math.round(c.score * 100)
      }))
    };
  } catch (error) {
    console.error('Knowledge base search error:', error);
    return { answer: 'Knowledge base search failed. Please try again.', sources: [] };
  }
}

/**
 * Chunk text into smaller pieces for RAG
 */
function chunkText(text, maxChunkSize = 500) {
  const sentences = text.split(/[.!?\n]+/).filter(s => s.trim().length > 0);
  const chunks = [];
  let currentChunk = '';
  
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? '. ' : '') + sentence.trim();
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}
