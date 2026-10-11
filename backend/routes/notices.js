import express from 'express';
import Notice from '../models/Notice.js';
import { protect, isOwner } from '../middleware/auth.js';
import { draftNotice } from '../services/ai/noticeGenerator.js';
import { notify } from '../services/notify.js';
import { ah, pick, httpError } from '../utils/http.js';

const router = express.Router();

// GET /api/notices — includes whether the current user has read each one
router.get('/', protect, ah(async (req, res) => {
  const notices = await Notice.find({ isActive: true, $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] })
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  const uid = String(req.user._id);
  res.json({
    success: true,
    data: notices.map(n => ({
      ...n,
      isRead: (n.readBy || []).some(id => String(id) === uid),
      readCount: n.readBy?.length || 0,
      readBy: req.user.role === 'owner' ? n.readBy : undefined
    }))
  });
}));

// POST /api/notices/draft — AI polishes rough text (preview before publishing)
router.post('/draft', protect, isOwner, ah(async (req, res) => {
  if (!req.body.rawInput?.trim()) throw httpError(400, 'Write a few words about the notice');
  res.json({ success: true, data: await draftNotice(req.body.rawInput) });
}));

// POST /api/notices — publish (either a reviewed draft or raw text to be AI-polished)
router.post('/', protect, isOwner, ah(async (req, res) => {
  const { rawInput, title, content, translations } = req.body;
  let draft;
  if (title && content) {
    draft = { title, content, translations: translations || { en: content }, aiGenerated: !!req.body.aiGenerated };
  } else {
    if (!rawInput?.trim()) throw httpError(400, 'Notice text is required');
    draft = await draftNotice(rawInput);
  }
  const notice = await Notice.create({
    ...pick(req.body, ['priority', 'category', 'targetAudience', 'targetFloor', 'expiresAt']),
    title: draft.title,
    content: draft.content,
    translations: draft.translations,
    aiGenerated: draft.aiGenerated,
    originalInput: rawInput,
    createdBy: req.user._id
  });
  await notify(req.app.get('io'), {
    audience: 'all', type: 'notice',
    title: `${notice.priority === 'urgent' ? '🚨' : '📢'} ${notice.title}`,
    message: notice.content.slice(0, 140), link: '/notices'
  });
  res.status(201).json({ success: true, data: notice });
}));

// POST /api/notices/:id/read
router.post('/:id/read', protect, ah(async (req, res) => {
  await Notice.updateOne({ _id: req.params.id }, { $addToSet: { readBy: req.user._id } });
  res.json({ success: true });
}));

router.put('/:id', protect, isOwner, ah(async (req, res) => {
  const notice = await Notice.findByIdAndUpdate(req.params.id, pick(req.body, ['title', 'content', 'priority', 'category', 'expiresAt', 'isActive']), { new: true, runValidators: true });
  if (!notice) throw httpError(404, 'Notice not found');
  res.json({ success: true, data: notice });
}));

router.delete('/:id', protect, isOwner, ah(async (req, res) => {
  await Notice.findByIdAndUpdate(req.params.id, { isActive: false });
  res.json({ success: true, message: 'Notice archived' });
}));

export default router;
