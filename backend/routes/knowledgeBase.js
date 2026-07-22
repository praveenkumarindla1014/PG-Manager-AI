import express from 'express';
import KnowledgeBase from '../models/KnowledgeBase.js';
import { protect, isOwner } from '../middleware/auth.js';
import { processDocument, searchKB } from '../services/ai/ragService.js';

const router = express.Router();

router.get('/', protect, isOwner, async (req, res) => {
  try {
    const docs = await KnowledgeBase.find({ isActive: true }).select('-chunks').sort({ createdAt: -1 });
    res.json({ success: true, data: docs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', protect, isOwner, async (req, res) => {
  try {
    const { documentName, content, category } = req.body;
    const doc = await processDocument(documentName, content, category, req.user._id);
    res.status(201).json({ success: true, data: { _id: doc._id, documentName: doc.documentName, category: doc.category, wordCount: doc.wordCount } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/search', protect, async (req, res) => {
  try {
    const { query, category } = req.body;
    const result = await searchKB(query, category);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:id', protect, isOwner, async (req, res) => {
  try {
    await KnowledgeBase.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Document archived' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
