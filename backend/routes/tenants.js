import express from 'express';
import User from '../models/User.js';
import Room from '../models/Room.js';
import Payment from '../models/Payment.js';
import Complaint from '../models/Complaint.js';
import { protect, isOwner } from '../middleware/auth.js';
import { extractAadhaarData } from '../services/ai/ocrService.js';
import { verifyFace } from '../services/ai/faceVerifier.js';
import { detectDuplicateTenant } from '../services/ai/fraudDetector.js';
import { matchRoommate } from '../services/ai/matchingEngine.js';
import { notify } from '../services/notify.js';
import { ah, pick, httpError } from '../utils/http.js';

const router = express.Router();
const SAFE = '-password -aadhaarImage -selfieImage';

async function placeInRoom(tenant, roomId) {
  const room = await Room.findById(roomId);
  if (!room) throw httpError(404, 'Room not found');
  if (room.currentOccupants.some(id => String(id) === String(tenant._id))) return room;
  if (room.currentOccupants.length >= room.maxOccupants) throw httpError(400, `Room ${room.roomNumber} is full`);
  if (room.genderPreference !== 'any' && tenant.gender && room.genderPreference !== tenant.gender) {
    throw httpError(400, `Room ${room.roomNumber} is reserved for ${room.genderPreference} residents`);
  }
  room.currentOccupants.push(tenant._id);
  await room.save();
  return room;
}

async function removeFromRoom(tenant) {
  if (!tenant.roomId) return;
  const room = await Room.findById(tenant.roomId);
  if (!room) return;
  room.currentOccupants = room.currentOccupants.filter(id => String(id) !== String(tenant._id));
  await room.save();
}

// GET /api/tenants — with this month's rent status and open complaints
router.get('/', protect, isOwner, ah(async (req, res) => {
  const filter = { role: 'tenant' };
  if (req.query.status === 'past') filter.isActive = false;
  else filter.isActive = true;

  const tenants = await User.find(filter).select(SAFE).populate('roomId', 'roomNumber floor rent type').sort({ name: 1 }).lean();
  const now = new Date();
  const ids = tenants.map(t => t._id);
  const [payments, complaints] = await Promise.all([
    Payment.find({ tenant: { $in: ids }, month: now.getMonth() + 1, year: now.getFullYear() }).lean(),
    Complaint.aggregate([{ $match: { tenant: { $in: ids }, status: { $in: ['open', 'in-progress'] } } }, { $group: { _id: '$tenant', n: { $sum: 1 } } }])
  ]);
  const payBy = Object.fromEntries(payments.map(p => [String(p.tenant), p.status]));
  const compBy = Object.fromEntries(complaints.map(c => [String(c._id), c.n]));

  res.json({
    success: true,
    count: tenants.length,
    data: tenants.map(t => ({ ...t, rentStatus: payBy[String(t._id)] || 'not-generated', openComplaints: compBy[String(t._id)] || 0 }))
  });
}));

// POST /api/tenants — owner adds a resident and assigns a bed
router.post('/', protect, isOwner, ah(async (req, res) => {
  const { name, email, phone, roomId } = req.body;
  if (!name?.trim() || !email?.trim() || !phone?.trim()) throw httpError(400, 'Name, email and phone are required');
  if (await User.exists({ email: email.toLowerCase().trim() })) throw httpError(409, 'A user with this email already exists');

  const password = req.body.password || `${name.trim().split(' ')[0].toLowerCase()}@${phone.trim().slice(-4)}`;
  const tenant = new User({
    ...pick(req.body, ['gender', 'age', 'address', 'aadhaarNumber', 'preferences', 'extractedAadhaarData', 'idVerified']),
    name: name.trim(),
    email: email.toLowerCase().trim(),
    phone: phone.trim(),
    password,
    role: 'tenant',
    moveInDate: req.body.moveInDate ? new Date(req.body.moveInDate) : new Date()
  });

  await tenant.validate();
  let room = null;
  if (roomId) {
    room = await placeInRoom(tenant, roomId);
    tenant.roomId = room._id;
  }
  try {
    await tenant.save();
  } catch (error) {
    if (room) await removeFromRoom(tenant);
    throw error;
  }

  // First month's rent due straight away
  if (room) {
    const now = new Date();
    await Payment.create({
      tenant: tenant._id, room: room._id, amount: room.rent,
      dueDate: new Date(now.getFullYear(), now.getMonth(), Math.max(5, now.getDate())),
      status: 'pending', month: now.getMonth() + 1, year: now.getFullYear(),
      notes: 'First month rent'
    });
  }

  await notify(req.app.get('io'), {
    audience: 'user', recipient: tenant._id, type: 'system',
    title: `Welcome to the PG, ${tenant.name.split(' ')[0]}! 🏠`,
    message: room ? `You're in Room ${room.roomNumber}. Ask the AI assistant anything — menu, rent, rules or repairs.` : 'Your account is ready.'
  });

  const data = await User.findById(tenant._id).select(SAFE).populate('roomId', 'roomNumber floor rent');
  res.status(201).json({ success: true, data, tempPassword: req.body.password ? undefined : password });
}));

// POST /api/tenants/ocr — Aadhaar OCR (Feature #20)
router.post('/ocr', protect, isOwner, ah(async (req, res) => {
  if (!req.body.imageBase64) throw httpError(400, 'Image required');
  res.json({ success: true, data: await extractAadhaarData(req.body.imageBase64) });
}));

// POST /api/tenants/verify-face (Feature #21)
router.post('/verify-face', protect, isOwner, ah(async (req, res) => {
  const { idImage, selfie } = req.body;
  if (!idImage || !selfie) throw httpError(400, 'Both images are required');
  res.json({ success: true, data: await verifyFace(idImage, selfie) });
}));

// POST /api/tenants/check-fraud (Feature #19)
router.post('/check-fraud', protect, isOwner, ah(async (req, res) => {
  const { name, phone, aadhaarNumber, email } = req.body;
  res.json({ success: true, data: await detectDuplicateTenant(name, phone, aadhaarNumber, email) });
}));

// POST /api/tenants/match-roommate (Feature #14)
router.post('/match-roommate', protect, ah(async (req, res) => {
  const me = await User.findById(req.user._id);
  res.json({ success: true, data: await matchRoommate({ ...(me.preferences?.toObject?.() || {}), ...req.body, tenantId: req.user._id }) });
}));

// GET /api/tenants/risky
router.get('/risky', protect, isOwner, ah(async (req, res) => {
  const risky = await User.find({
    role: 'tenant', isActive: true,
    $or: [{ violationScore: { $gt: 0 } }, { 'paymentBehavior.lateProbability': { $gte: 40 } }]
  }).select('name phone roomId violationScore violations paymentBehavior').populate('roomId', 'roomNumber').sort({ violationScore: -1 });
  res.json({ success: true, data: risky });
}));

// GET /api/tenants/:id — owner, or the tenant themself
router.get('/:id', protect, ah(async (req, res) => {
  if (req.user.role !== 'owner' && String(req.user._id) !== req.params.id) throw httpError(403, 'Not allowed');
  const tenant = await User.findById(req.params.id).select(SAFE).populate('roomId');
  if (!tenant) throw httpError(404, 'Tenant not found');
  const [payments, complaints] = await Promise.all([
    Payment.find({ tenant: tenant._id }).sort({ year: -1, month: -1 }).limit(12),
    Complaint.find({ tenant: tenant._id }).sort({ createdAt: -1 }).limit(10)
  ]);
  res.json({ success: true, data: { ...tenant.toObject(), payments, complaints } });
}));

// PUT /api/tenants/:id — owner edits details
router.put('/:id', protect, isOwner, ah(async (req, res) => {
  const updates = pick(req.body, ['name', 'phone', 'gender', 'age', 'address', 'aadhaarNumber', 'idVerified', 'moveOutDate', 'preferences']);
  const tenant = await User.findOneAndUpdate({ _id: req.params.id, role: 'tenant' }, updates, { new: true, runValidators: true })
    .select(SAFE).populate('roomId', 'roomNumber floor rent');
  if (!tenant) throw httpError(404, 'Tenant not found');
  res.json({ success: true, data: tenant });
}));

// PUT /api/tenants/:id/room — move to another room
router.put('/:id/room', protect, isOwner, ah(async (req, res) => {
  const tenant = await User.findOne({ _id: req.params.id, role: 'tenant' });
  if (!tenant) throw httpError(404, 'Tenant not found');
  if (!req.body.roomId) throw httpError(400, 'roomId is required');
  if (String(tenant.roomId) === String(req.body.roomId)) throw httpError(400, 'Tenant is already in that room');

  const room = await placeInRoom(tenant, req.body.roomId);
  await removeFromRoom(tenant);
  tenant.roomId = room._id;
  await tenant.save();

  await notify(req.app.get('io'), { audience: 'user', recipient: tenant._id, type: 'system', title: 'Room changed', message: `You've been moved to Room ${room.roomNumber}.` });
  res.json({ success: true, data: await User.findById(tenant._id).select(SAFE).populate('roomId', 'roomNumber floor rent') });
}));

// POST /api/tenants/:id/checkout — tenant vacates; frees the bed and deactivates login
router.post('/:id/checkout', protect, isOwner, ah(async (req, res) => {
  const tenant = await User.findOne({ _id: req.params.id, role: 'tenant' });
  if (!tenant) throw httpError(404, 'Tenant not found');
  const pending = await Payment.find({ tenant: tenant._id, status: { $in: ['pending', 'overdue', 'partial'] } });
  if (pending.length && !req.body.force) {
    const due = pending.reduce((s, p) => s + p.amount, 0);
    throw httpError(400, `${tenant.name} has ₹${due.toLocaleString('en-IN')} unpaid. Collect it first or confirm checkout anyway.`);
  }
  await removeFromRoom(tenant);
  tenant.roomId = undefined;
  tenant.isActive = false;
  tenant.moveOutDate = new Date();
  await tenant.save();
  res.json({ success: true, message: `${tenant.name} has been checked out` });
}));

export default router;
