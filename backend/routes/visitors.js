import express from 'express';
import Visitor from '../models/Visitor.js';
import User from '../models/User.js';
import { protect, isOwner } from '../middleware/auth.js';
import { notify } from '../services/notify.js';
import { startOfDay, endOfDay } from '../services/stats.js';
import { ah, pick, httpError } from '../utils/http.js';

const router = express.Router();
const FIELDS = ['name', 'phone', 'email', 'purpose', 'numberOfGuests', 'vehicleNumber', 'idProofType', 'idProofNumber', 'notes', 'checkIn'];

// GET /api/visitors?date=YYYY-MM-DD&status=
router.get('/', protect, ah(async (req, res) => {
  const query = {};
  if (req.query.date) {
    const d = new Date(req.query.date);
    query.checkIn = { $gte: startOfDay(d), $lte: endOfDay(d) };
  }
  if (req.query.status) query.status = req.query.status;
  if (req.user.role !== 'owner') query.tenantVisiting = req.user._id;

  const visitors = await Visitor.find(query)
    .populate('tenantVisiting', 'name phone')
    .sort({ checkIn: -1 })
    .limit(200);
  res.json({ success: true, data: visitors });
}));

// POST /api/visitors — owner logs at the gate (approved); tenant pre-registers a guest (pending)
router.post('/', protect, ah(async (req, res) => {
  const data = pick(req.body, FIELDS);
  if (!data.name?.trim() || !data.purpose?.trim()) throw httpError(400, 'Visitor name and purpose are required');
  if (!data.phone) data.phone = 'Not provided';

  if (req.user.role === 'owner') {
    if (req.body.tenantVisiting) {
      const t = await User.findById(req.body.tenantVisiting).populate('roomId', 'roomNumber');
      data.tenantVisiting = t?._id;
      data.roomVisiting = t?.roomId?.roomNumber;
    }
    data.status = 'approved';
    data.approvedBy = req.user._id;
  } else {
    const me = await User.findById(req.user._id).populate('roomId', 'roomNumber');
    data.tenantVisiting = me._id;
    data.roomVisiting = me.roomId?.roomNumber;
    data.status = 'pending';
  }

  const visitor = await Visitor.create(data);
  if (visitor.status === 'pending') {
    await notify(req.app.get('io'), {
      audience: 'owner', type: 'visitor', title: 'Visitor pre-registered',
      message: `${req.user.name} is expecting ${visitor.name} (${visitor.purpose})`, link: '/visitors'
    });
  } else if (visitor.tenantVisiting) {
    await notify(req.app.get('io'), {
      audience: 'user', recipient: visitor.tenantVisiting, type: 'visitor',
      title: 'You have a visitor 👋', message: `${visitor.name} has checked in at the gate.`, link: '/visitors'
    });
  }
  res.status(201).json({ success: true, data: await visitor.populate('tenantVisiting', 'name phone') });
}));

// PUT /api/visitors/:id — owner: approve / reject / check-out
router.put('/:id', protect, isOwner, ah(async (req, res) => {
  const visitor = await Visitor.findById(req.params.id);
  if (!visitor) throw httpError(404, 'Visitor not found');
  const { action } = req.body;
  if (action === 'approve') { visitor.status = 'approved'; visitor.approvedBy = req.user._id; visitor.checkIn = new Date(); }
  else if (action === 'reject') visitor.status = 'rejected';
  else if (action === 'check-out') { visitor.status = 'checked-out'; visitor.checkOut = new Date(); }
  else Object.assign(visitor, pick(req.body, FIELDS));
  await visitor.save();

  if (visitor.tenantVisiting && ['approve', 'reject'].includes(action)) {
    await notify(req.app.get('io'), {
      audience: 'user', recipient: visitor.tenantVisiting, type: 'visitor',
      title: action === 'approve' ? `${visitor.name} has been let in` : `${visitor.name} was not allowed in`,
      message: visitor.purpose, link: '/visitors'
    });
  }
  res.json({ success: true, data: await visitor.populate('tenantVisiting', 'name phone') });
}));

// DELETE /api/visitors/:id — tenant cancels own pending guest, or owner removes
router.delete('/:id', protect, ah(async (req, res) => {
  const visitor = await Visitor.findById(req.params.id);
  if (!visitor) throw httpError(404, 'Visitor not found');
  if (req.user.role !== 'owner' && (String(visitor.tenantVisiting) !== String(req.user._id) || visitor.status !== 'pending')) {
    throw httpError(403, 'Not allowed');
  }
  await visitor.deleteOne();
  res.json({ success: true, message: 'Visitor removed' });
}));

export default router;
