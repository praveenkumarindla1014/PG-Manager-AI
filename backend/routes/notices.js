import express from 'express';
import Notice from '../models/Notice.js';
import { protect, isOwner } from '../middleware/auth.js';
import { generateProfessionalNotice } from '../services/ai/noticeGenerator.js';

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const notices = await Notice.find({ isActive: true })
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: notices });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', protect, isOwner, async (req, res) => {
  try {
    const { rawInput, priority, category } = req.body;
    const notice = await generateProfessionalNotice(rawInput, priority, category, req.user._id);
    res.status(201).json({ success: true, data: notice });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id', protect, isOwner, async (req, res) => {
  try {
    const notice = await Notice.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: notice });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:id', protect, isOwner, async (req, res) => {
  try {
    await Notice.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Notice archived' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
