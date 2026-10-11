/**
 * AI Client — provider-agnostic wrapper around any OpenAI-compatible API.
 *
 * Providers are tried in order; if one fails (bad key, outage, rate limit)
 * the next one is used automatically. Configure via .env:
 *
 *   # Primary (any OpenAI-compatible endpoint — OpenRouter by default)
 *   AI_API_KEY=sk-or-v1-...
 *   AI_BASE_URL=https://openrouter.ai/api/v1
 *   AI_MODEL=openai/gpt-4o-mini
 *
 *   # Fallback: Google Gemini (OpenAI-compatible endpoint)
 *   GEMINI_API_KEY=...
 *   GEMINI_MODEL=gemini-3.5-flash
 *
 * Legacy OPENAI_API_KEY / OPENAI_MODEL / OPENAI_BASE_URL are still honoured.
 */

import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/';

// Each Gemini model has its own free-tier quota, so when one is rate-limited we
// rotate to the next. Override with GEMINI_FALLBACK_MODELS (comma-separated).
const GEMINI_FALLBACKS = (process.env.GEMINI_FALLBACK_MODELS ||
  'gemini-3-flash-preview,gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-flash-lite-latest,gemini-3.8-flash')
  .split(',').map(s => s.trim()).filter(Boolean);

function isGeminiKey(key = '') {
  return key.startsWith('AIza') || key.startsWith('AQ.');
}

function buildProviders() {
  const providers = [];
  const seen = new Set();

  const add = (name, apiKey, baseURL, model, embeddingModel) => {
    if (!apiKey || seen.has(apiKey)) return;
    seen.add(apiKey);
    const isOpenRouter = (baseURL || '').includes('openrouter.ai');
    const isGemini = name === 'gemini';
    const fallbacks = isGemini ? GEMINI_FALLBACKS : (process.env.AI_FALLBACK_MODELS || '').split(',').map(x => x.trim()).filter(Boolean);
    providers.push({
      name,
      model,
      models: [...new Set([model, ...fallbacks])],
      embeddingModel,
      // Gemini "thinks" before answering and counts that against max_tokens,
      // so small limits return empty text. Let it size its own output instead.
      isGemini,
      client: new OpenAI({
        apiKey,
        baseURL,
        timeout: 40_000,
        maxRetries: 0,
        defaultHeaders: isOpenRouter
          ? { 'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:5173', 'X-Title': 'PG Manager AI' }
          : undefined
      })
    });
  };

  const addGeneric = (name, apiKey, baseURL, model) => {
    if (!apiKey) return;
    if (isGeminiKey(apiKey)) {
      add('gemini', apiKey, GEMINI_BASE_URL, process.env.GEMINI_MODEL || 'gemini-3.5-flash', 'gemini-embedding-001');
    } else {
      const isOpenAIKey = /^sk-(proj-|svcacct-)/.test(apiKey);
      const url = baseURL || (isOpenAIKey ? undefined : 'https://openrouter.ai/api/v1');
      const defaultModel = url?.includes('openrouter.ai') ? 'openai/gpt-4o-mini' : 'gpt-4o-mini';
      const defaultEmbed = url?.includes('openrouter.ai') ? 'openai/text-embedding-3-small' : 'text-embedding-3-small';
      add(name, apiKey, url, model || defaultModel, process.env.AI_EMBEDDING_MODEL || defaultEmbed);
    }
  };

  addGeneric('primary', process.env.AI_API_KEY, process.env.AI_BASE_URL, process.env.AI_MODEL);
  addGeneric('openai', process.env.OPENAI_API_KEY, process.env.OPENAI_BASE_URL, process.env.OPENAI_MODEL);
  if (process.env.GEMINI_API_KEY) {
    add('gemini', process.env.GEMINI_API_KEY, GEMINI_BASE_URL, process.env.GEMINI_MODEL || 'gemini-3.5-flash', 'gemini-embedding-001');
  }

  return providers;
}

const providers = buildProviders();

// Failing provider/model pairs are skipped for a while so we don't pay the
// latency of a doomed request on every call.
const cooldownUntil = new Map();
// The model that answered last is tried first next time (keeps conversations on one model).
const preferredModel = new Map();

const coolKey = (p, m) => `${p.name}:${m}`;
const isCooling = (p, m) => (cooldownUntil.get(coolKey(p, m)) || 0) > Date.now();
function coolDown(p, m, ms) {
  cooldownUntil.set(coolKey(p, m), Date.now() + ms);
}

function candidates() {
  const list = [];
  for (const p of providers) {
    const preferred = preferredModel.get(p.name);
    const ordered = preferred ? [preferred, ...p.models.filter(m => m !== preferred)] : p.models;
    for (const m of ordered) if (!isCooling(p, m)) list.push({ provider: p, model: m });
  }
  // Everything cooling down? Try the primary models anyway rather than failing outright.
  return list.length ? list : providers.map(p => ({ provider: p, model: p.model }));
}

export function getAIStatus() {
  return {
    enabled: providers.length > 0,
    providers: providers.map(p => ({
      name: p.name,
      model: preferredModel.get(p.name) || p.model,
      availableModels: p.models.filter(m => !isCooling(p, m)).length,
      coolingDown: p.models.every(m => isCooling(p, m))
    }))
  };
}

export function isAIConfigured() {
  return providers.length > 0;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Run `fn(provider, model)` against each provider/model until one succeeds.
 */
async function withFallback(label, fn) {
  if (!providers.length) {
    throw new Error('No AI provider configured. Set AI_API_KEY or GEMINI_API_KEY in backend/.env');
  }

  let lastError;
  const startedAt = Date.now();
  for (const { provider, model } of candidates()) {
    // Don't keep the user waiting forever while hopping between models.
    if (Date.now() - startedAt > 60_000) break;
    try {
      const result = await fn(provider, model);
      preferredModel.set(provider.name, model);
      return result;
    } catch (error) {
      lastError = error;
      const status = error.status || 0;
      const msg = String(error.message || '');
      console.warn(`[AI:${provider.name}/${model}] ${label} failed (${status || 'network'}): ${msg.slice(0, 140)}`);

      if (status === 401 || status === 403) {
        provider.models.forEach(m => coolDown(provider, m, 10 * 60_000));
        continue;
      }
      if (status === 429) coolDown(provider, model, /quota|billing/i.test(msg) ? 30 * 60_000 : 60_000);
      else if (status === 404) coolDown(provider, model, 24 * 3600_000);
      else if (status >= 500 || !status) coolDown(provider, model, 30_000);
      else if (status === 400 && label === 'chat') {
        // Bad request is usually about this conversation, not the model; one quick retry elsewhere is enough.
        await sleep(200);
      }
    }
  }
  throw lastError || new Error('All AI providers are busy');
}

/**
 * Chat completion with optional tool calling.
 * `functions` is an array of { name, description, parameters }.
 */
export async function callOpenAI(messages, functions = null, functionCall = null, options = {}) {
  const { temperature = 0.4, maxTokens = 2048 } = options;

  return withFallback('chat', async (provider, model) => {
    const params = {
      model,
      messages,
      temperature
    };
    if (provider.isGemini) {
      params.reasoning_effort = 'low';
    } else {
      params.max_tokens = maxTokens;
    }

    if (functions?.length) {
      params.tools = functions.map(fn => ({ type: 'function', function: fn }));
      params.tool_choice = !functionCall || functionCall === 'auto'
        ? 'auto'
        : { type: 'function', function: { name: functionCall } };
    }

    if (options.json) {
      params.response_format = { type: 'json_object' };
    }

    const response = await provider.client.chat.completions.create(params);
    response._provider = `${provider.name}/${model}`;
    return response;
  });
}

/**
 * Simple text completion (no function calling).
 */
export async function getCompletion(prompt, systemPrompt = '', options = {}) {
  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });

  const response = await callOpenAI(messages, null, null, options);
  return response.choices[0].message.content || '';
}

/**
 * Ask for JSON and parse it robustly (handles ```json fences and prose around it).
 */
export async function getJSON(prompt, systemPrompt = '', options = {}) {
  const text = await getCompletion(prompt, systemPrompt, options);
  return parseJSON(text);
}

export function parseJSON(text = '') {
  const cleaned = text.replace(/```(?:json)?/gi, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/[[{][\s\S]*[\]}]/);
    if (!match) throw new Error('AI response did not contain JSON');
    return JSON.parse(match[0]);
  }
}

/**
 * Embeddings for RAG.
 */
export async function getEmbedding(text) {
  let lastError;
  for (const provider of providers) {
    const key = { name: provider.name };
    if (isCooling(key, 'embedding')) continue;
    try {
      const response = await provider.client.embeddings.create({ model: provider.embeddingModel, input: text });
      return response.data[0].embedding;
    } catch (error) {
      lastError = error;
      coolDown(key, 'embedding', error.status === 429 ? 60_000 : 10 * 60_000);
    }
  }
  throw lastError || new Error('Embeddings unavailable');
}

function imagePart(base64, detail = 'high') {
  const url = base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
  return { type: 'image_url', image_url: { url, detail } };
}

/**
 * Vision: analyse one image.
 */
export async function analyzeImage(imageBase64, prompt, options = {}) {
  const messages = [{
    role: 'user',
    content: [{ type: 'text', text: prompt }, imagePart(imageBase64, options.detail)]
  }];
  const response = await callOpenAI(messages, null, null, { maxTokens: options.maxTokens || 1500, temperature: 0.1 });
  return response.choices[0].message.content || '';
}

/**
 * Vision: compare two images (face verification).
 */
export async function compareTwoImages(image1Base64, image2Base64, prompt) {
  const messages = [{
    role: 'user',
    content: [{ type: 'text', text: prompt }, imagePart(image1Base64), imagePart(image2Base64)]
  }];
  const response = await callOpenAI(messages, null, null, { maxTokens: 1000, temperature: 0.1 });
  return response.choices[0].message.content || '';
}

if (providers.length) {
  console.log(`🤖 AI providers: ${providers.map(p => `${p.name} (${p.model})`).join(' → ')}`);
} else {
  console.warn('⚠️  No AI provider configured — the assistant will run in offline intent mode.');
}
