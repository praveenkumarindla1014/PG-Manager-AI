import express from 'express';
import Payment from '../models/Payment.js';
import { protect, isOwner } from '../middleware/auth.js';
import { predictRentPayments } from '../services/ai/predictionEngine.js';
import { analyzePaymentScreenshot } from '../services/ai/fraudDetector.js';

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const { month, year, status, tenantId } = req.query;
    const query = {};
    if (month) query.month = parseInt(month);
    if (year) query.year = parseInt(year);
    if (status) query.status = status;
    if (tenantId) query.tenant = tenantId;
    if (req.user.role === 'tenant') query.tenant = req.user._id;

    const payments = await Payment.find(query)
      .populate('tenant', 'name phone email')
      .populate('room', 'roomNumber')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: payments, count: payments.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const payment = await Payment.create({
      ...req.body,
      tenant: req.body.tenant || req.user._id
    });
    res.status(201).json({ success: true, data: payment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/predictions', protect, isOwner, async (req, res) => {
  try {
    const predictions = await predictRentPayments();
    res.json({ success: true, data: predictions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/verify-screenshot', protect, async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    const result = await analyzePaymentScreenshot(imageBase64);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id', protect, isOwner, async (req, res) => {
  try {
    const payment = await Payment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: payment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
