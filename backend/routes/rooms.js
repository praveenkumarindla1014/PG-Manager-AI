import express from 'express';
import Room from '../models/Room.js';
import { protect, isOwner } from '../middleware/auth.js';
import { matchRoom } from '../services/ai/matchingEngine.js';
import { ah, pick, httpError } from '../utils/http.js';

const router = express.Router();

const ROOM_FIELDS = ['roomNumber', 'floor', 'type', 'rent', 'deposit', 'maxOccupants', 'hasAC', 'hasAttachedBathroom', 'hasBalcony',
  'hasParking', 'hasWifi', 'hasTv', 'hasGeyser', 'hasCupboard', 'furnishing', 'genderPreference', 'description', 'images', 'availableFrom'];
const DEFAULT_CAPACITY = { single: 1, double: 2, triple: 3, dormitory: 6 };

// GET /api/rooms
router.get('/', protect, ah(async (req, res) => {
  const { floor, type, status, hasAC, maxRent, minRent, vacant } = req.query;
  const query = {};
  if (floor) query.floor = Number(floor);
  if (type) query.type = type;
  if (status) query.status = status;
  if (hasAC) query.hasAC = hasAC === 'true';
  if (maxRent) query.rent = { ...query.rent, $lte: Number(maxRent) };
  if (minRent) query.rent = { ...query.rent, $gte: Number(minRent) };
  if (vacant === 'true') query.status = { $in: ['available', 'partially-occupied'] };

  // Residents see who their neighbours are only by name; owners get contact details.
  const occupantFields = req.user.role === 'owner' ? 'name phone gender email' : 'name gender';
  const rooms = await Room.find(query).populate('currentOccupants', occupantFields).lean();
  rooms.sort((a, b) => a.floor - b.floor || a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }));
  res.json({ success: true, data: rooms, count: rooms.length });
}));

// POST /api/rooms/match — AI room recommendation
router.post('/match', protect, ah(async (req, res) => {
  res.json({ success: true, data: await matchRoom(req.body) });
}));

// POST /api/rooms
router.post('/', protect, isOwner, ah(async (req, res) => {
  const data = pick(req.body, ROOM_FIELDS);
  if (!data.roomNumber || !data.type || !data.rent || data.floor === undefined) throw httpError(400, 'Room number, floor, type and rent are required');
  data.roomNumber = String(data.roomNumber).trim();
  data.maxOccupants = Number(data.maxOccupants) || DEFAULT_CAPACITY[data.type] || 1;
  if (data.deposit === undefined) data.deposit = data.rent;
  const room = await Room.create(data);
  res.status(201).json({ success: true, data: room });
}));

// GET /api/rooms/:id
router.get('/:id', protect, ah(async (req, res) => {
  const fields = req.user.role === 'owner' ? 'name phone email gender age preferences moveInDate' : 'name gender';
  const room = await Room.findById(req.params.id).populate('currentOccupants', fields);
  if (!room) throw httpError(404, 'Room not found');
  res.json({ success: true, data: room });
}));

// PUT /api/rooms/:id
router.put('/:id', protect, isOwner, ah(async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) throw httpError(404, 'Room not found');
  const updates = pick(req.body, [...ROOM_FIELDS, 'status']);
  if (updates.maxOccupants !== undefined && Number(updates.maxOccupants) < room.currentOccupants.length) {
    throw httpError(400, `Room has ${room.currentOccupants.length} occupant(s); capacity can't be lower than that`);
  }
  // 'maintenance' and 'reserved' are manual; occupancy statuses are computed on save.
  const manualStatus = ['maintenance', 'reserved'].includes(updates.status) ? updates.status : null;
  delete updates.status;
  Object.assign(room, updates);
  await room.save();
  if (manualStatus) {
    room.status = manualStatus;
    await Room.updateOne({ _id: room._id }, { status: manualStatus });
  }
  res.json({ success: true, data: room });
}));

// DELETE /api/rooms/:id
router.delete('/:id', protect, isOwner, ah(async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) throw httpError(404, 'Room not found');
  if (room.currentOccupants.length) throw httpError(400, 'Move or check out the tenants before deleting this room');
  await room.deleteOne();
  res.json({ success: true, message: 'Room deleted' });
}));

export default router;
