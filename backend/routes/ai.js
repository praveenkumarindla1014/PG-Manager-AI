import express from 'express';
import { processMessage, clearChatHistory, getChatHistory, listSessions } from '../services/ai/chatEngine.js';
import { getAIStatus } from '../services/ai/openaiClient.js';
import { protect } from '../middleware/auth.js';
import { ah, httpError } from '../utils/http.js';

const router = express.Router();

// Simple per-user rate limit so a stuck client can't burn through the AI quota.
const recent = new Map();
function rateLimit(req, res, next) {
  const key = String(req.user._id);
  const now = Date.now();
  const hits = (recent.get(key) || []).filter(t => now - t < 60_000);
  if (hits.length >= 30) return res.status(429).json({ success: false, message: "You're sending messages very fast — please wait a few seconds." });
  hits.push(now);
  recent.set(key, hits);
  next();
}

// POST /api/ai/chat — the assistant
router.post('/chat', protect, rateLimit, ah(async (req, res) => {
  const message = String(req.body.message || '').trim();
  if (!message) throw httpError(400, 'Message is required');
  if (message.length > 2000) throw httpError(400, 'Message is too long (max 2000 characters)');
  const result = await processMessage(message, req.user._id, req.user.role, req.body.sessionId, req.app.get('io'));
  res.json(result);
}));

router.get('/status', protect, (req, res) => res.json({ success: true, data: getAIStatus() }));

router.get('/sessions', protect, ah(async (req, res) => {
  res.json({ success: true, data: await listSessions(req.user._id) });
}));

router.get('/history/:sessionId', protect, ah(async (req, res) => {
  res.json({ success: true, data: await getChatHistory(req.user._id, req.params.sessionId) });
}));

router.delete('/history/:sessionId', protect, ah(async (req, res) => {
  await clearChatHistory(req.user._id, req.params.sessionId);
  res.json({ success: true, message: 'Conversation deleted' });
}));

export default router;
