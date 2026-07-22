import express from 'express';
import User from '../models/User.js';
import { protect, isOwner } from '../middleware/auth.js';
import { extractAadhaarData } from '../services/ai/ocrService.js';
import { verifyFace } from '../services/ai/faceVerifier.js';
import { detectDuplicateTenant } from '../services/ai/fraudDetector.js';
import { matchRoommate } from '../services/ai/matchingEngine.js';

const router = express.Router();

// @route   GET /api/tenants
router.get('/', protect, isOwner, async (req, res) => {
  try {
    const tenants = await User.find({ role: 'tenant', isActive: true })
      .populate('roomId', 'roomNumber floor rent')
      .sort({ name: 1 });
    res.json({ success: true, data: tenants, count: tenants.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/tenants/ocr
router.post('/ocr', protect, async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ success: false, message: 'Image required' });
    const data = await extractAadhaarData(imageBase64);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/tenants/verify-face
router.post('/verify-face', protect, async (req, res) => {
  try {
    const { idImage, selfie } = req.body;
    if (!idImage || !selfie) return res.status(400).json({ success: false, message: 'Both images required' });
    const result = await verifyFace(idImage, selfie);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/tenants/check-fraud
router.post('/check-fraud', protect, isOwner, async (req, res) => {
  try {
    const { name, phone, aadhaarNumber, email } = req.body;
    const result = await detectDuplicateTenant(name, phone, aadhaarNumber, email);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/tenants/match-roommate
router.post('/match-roommate', protect, async (req, res) => {
  try {
    const result = await matchRoommate({ ...req.body, tenantId: req.user._id });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/tenants/risky
router.get('/risky', protect, isOwner, async (req, res) => {
  try {
    const risky = await User.find({ role: 'tenant', isActive: true, violationScore: { $gt: 0 } })
      .populate('roomId', 'roomNumber')
      .sort({ violationScore: -1 });
    res.json({ success: true, data: risky });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/tenants/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const tenant = await User.findById(req.params.id).populate('roomId');
    if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });
    res.json({ success: true, data: tenant });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
