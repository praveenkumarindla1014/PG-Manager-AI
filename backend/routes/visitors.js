import express from 'express';
import Visitor from '../models/Visitor.js';
import { protect, isOwner } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const { date } = req.query;
    const query = {};
    if (date) {
      const d = new Date(date);
      d.setHours(0,0,0,0);
      const end = new Date(d);
      end.setHours(23,59,59,999);
      query.checkIn = { $gte: d, $lte: end };
    }
    const visitors = await Visitor.find(query).populate('tenantVisiting', 'name roomId').sort({ checkIn: -1 });
    res.json({ success: true, data: visitors });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const visitor = await Visitor.create(req.body);
    res.status(201).json({ success: true, data: visitor });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const visitor = await Visitor.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: visitor });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
