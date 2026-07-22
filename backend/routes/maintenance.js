import express from 'express';
import MaintenanceSchedule from '../models/MaintenanceSchedule.js';
import { protect, isOwner } from '../middleware/auth.js';
import { predictMaintenance } from '../services/ai/predictionEngine.js';

const router = express.Router();

router.get('/', protect, isOwner, async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status) query.status = status;
    const schedules = await MaintenanceSchedule.find(query)
      .populate('room', 'roomNumber floor')
      .sort({ scheduledDate: 1 });
    res.json({ success: true, data: schedules });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', protect, isOwner, async (req, res) => {
  try {
    const schedule = await MaintenanceSchedule.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: schedule });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/predictions', protect, isOwner, async (req, res) => {
  try {
    const predictions = await predictMaintenance(req.query.type);
    res.json({ success: true, data: predictions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id', protect, isOwner, async (req, res) => {
  try {
    const schedule = await MaintenanceSchedule.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: schedule });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
