import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

/**
 * Call OpenAI with retry logic
 */
export async function callOpenAI(messages, functions = null, functionCall = null, options = {}) {
  const { model = process.env.OPENAI_MODEL || 'gpt-4o', temperature = 0.7, maxTokens = 4096 } = options;
  
  let lastError;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const requestParams = {
        model,
        messages,
        temperature,
        max_tokens: maxTokens
      };
      
      if (functions && functions.length > 0) {
        requestParams.tools = functions.map(fn => ({
          type: 'function',
          function: fn
        }));
        
        if (functionCall) {
          requestParams.tool_choice = functionCall === 'auto' ? 'auto' : {
            type: 'function',
            function: { name: functionCall }
          };
        } else {
          requestParams.tool_choice = 'auto';
        }
      }
      
      const response = await openai.chat.completions.create(requestParams);
      return response;
      
    } catch (error) {
      lastError = error;
      console.error(`OpenAI attempt ${attempt} failed:`, error.message);
      
      if (error.status === 429) {
        // Rate limited - wait longer
        await new Promise(r => setTimeout(r, RETRY_DELAY * attempt * 2));
      } else if (error.status >= 500) {
        // Server error - retry
        await new Promise(r => setTimeout(r, RETRY_DELAY * attempt));
      } else {
        // Client error - don't retry
        throw error;
      }
    }
  }
  
  throw lastError;
}

/**
 * Simple text completion (no function calling)
 */
export async function getCompletion(prompt, systemPrompt = '', options = {}) {
  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });
  
  const response = await callOpenAI(messages, null, null, options);
  return response.choices[0].message.content;
}

/**
 * Get embeddings for RAG
 */
export async function getEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Embedding error:', error.message);
    throw error;
  }
}

/**
 * Vision API for OCR and face verification
 */
export async function analyzeImage(imageBase64, prompt, options = {}) {
  const messages = [
    {
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        {
          type: 'image_url',
          image_url: {
            url: `data:image/jpeg;base64,${imageBase64}`,
            detail: options.detail || 'high'
          }
        }
      ]
    }
  ];
  
  const response = await callOpenAI(messages, null, null, {
    model: 'gpt-4o',
    maxTokens: options.maxTokens || 2048
  });
  
  return response.choices[0].message.content;
}

/**
 * Compare two images (for face verification)
 */
export async function compareTwoImages(image1Base64, image2Base64, prompt) {
  const messages = [
    {
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        {
          type: 'image_url',
          image_url: { url: `data:image/jpeg;base64,${image1Base64}`, detail: 'high' }
        },
        {
          type: 'image_url',
          image_url: { url: `data:image/jpeg;base64,${image2Base64}`, detail: 'high' }
        }
      ]
    }
  ];
  
  const response = await callOpenAI(messages, null, null, {
    model: 'gpt-4o',
    maxTokens: 1024
  });
  
  return response.choices[0].message.content;
}

export default openai;
