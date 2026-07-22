import express from 'express';
import { processMessage, clearChatHistory, getChatHistory } from '../services/ai/chatEngine.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @route   POST /api/ai/chat
// @desc    Main AI chat endpoint — the heart of the system
router.post('/chat', protect, async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    
    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }
    
    const io = req.app.get('io');
    const result = await processMessage(message, req.user._id, req.user.role, sessionId, io);
    
    res.json(result);
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ success: false, message: 'AI processing failed', error: error.message });
  }
});

// @route   GET /api/ai/history/:sessionId
// @desc    Get chat history for a session
router.get('/history/:sessionId', protect, async (req, res) => {
  try {
    const messages = await getChatHistory(req.user._id, req.params.sessionId);
    res.json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/ai/history/:sessionId
// @desc    Clear chat history
router.delete('/history/:sessionId', protect, async (req, res) => {
  try {
    await clearChatHistory(req.user._id, req.params.sessionId);
    res.json({ success: true, message: 'Chat history cleared' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
