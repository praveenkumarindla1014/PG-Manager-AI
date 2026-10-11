import express from 'express';
import KnowledgeBase from '../models/KnowledgeBase.js';
import { protect, isOwner } from '../middleware/auth.js';
import { processDocument, searchKB } from '../services/ai/ragService.js';
import { ah, httpError } from '../utils/http.js';

const router = express.Router();
const CATEGORIES = ['pg-rules', 'food-policy', 'refund-policy', 'agreement', 'visitor-rules', 'safety', 'amenities', 'other'];

// Everyone can read the rulebook; only owners manage it.
router.get('/', protect, ah(async (req, res) => {
  const docs = await KnowledgeBase.find({ isActive: true }).select('-chunks').sort({ createdAt: -1 });
  res.json({ success: true, data: docs });
}));

router.post('/', protect, isOwner, ah(async (req, res) => {
  const { documentName, content, category } = req.body;
  if (!documentName?.trim() || !content?.trim()) throw httpError(400, 'Document name and content are required');
  const doc = await processDocument(documentName.trim(), content, CATEGORIES.includes(category) ? category : 'other', req.user._id);
  res.status(201).json({ success: true, data: { _id: doc._id, documentName: doc.documentName, category: doc.category, wordCount: doc.wordCount, chunks: doc.chunks.length, createdAt: doc.createdAt } });
}));

router.post('/search', protect, ah(async (req, res) => {
  if (!req.body.query?.trim()) throw httpError(400, 'Type a question');
  res.json({ success: true, data: await searchKB(req.body.query, req.body.category) });
}));

router.delete('/:id', protect, isOwner, ah(async (req, res) => {
  await KnowledgeBase.findByIdAndUpdate(req.params.id, { isActive: false });
  res.json({ success: true, message: 'Document removed' });
}));

export default router;
