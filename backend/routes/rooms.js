import express from 'express';
import Room from '../models/Room.js';
import { protect, isOwner } from '../middleware/auth.js';
import { matchRoom } from '../services/ai/matchingEngine.js';

const router = express.Router();

// @route   GET /api/rooms
router.get('/', protect, async (req, res) => {
  try {
    const { floor, type, status, hasAC, maxRent, minRent } = req.query;
    const query = {};
    if (floor) query.floor = parseInt(floor);
    if (type) query.type = type;
    if (status) query.status = status;
    if (hasAC) query.hasAC = hasAC === 'true';
    if (maxRent) query.rent = { ...query.rent, $lte: parseInt(maxRent) };
    if (minRent) query.rent = { ...query.rent, $gte: parseInt(minRent) };

    const rooms = await Room.find(query).populate('currentOccupants', 'name phone gender').sort({ roomNumber: 1 });
    res.json({ success: true, data: rooms, count: rooms.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/rooms
router.post('/', protect, isOwner, async (req, res) => {
  try {
    const room = await Room.create(req.body);
    res.status(201).json({ success: true, data: room });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/rooms/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id).populate('currentOccupants', 'name phone email gender age preferences');
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
    res.json({ success: true, data: room });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/rooms/:id
router.put('/:id', protect, isOwner, async (req, res) => {
  try {
    const room = await Room.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: room });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/rooms/:id
router.delete('/:id', protect, isOwner, async (req, res) => {
  try {
    await Room.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Room deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/rooms/match
router.post('/match', protect, async (req, res) => {
  try {
    const result = await matchRoom(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
