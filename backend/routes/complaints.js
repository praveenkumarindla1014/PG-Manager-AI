import express from 'express';
import Complaint from '../models/Complaint.js';
import { protect, isOwner } from '../middleware/auth.js';
import { createComplaintRecord } from '../services/complaintService.js';
import { notify } from '../services/notify.js';
import { ah, pick, httpError } from '../utils/http.js';

const router = express.Router();

// GET /api/complaints
router.get('/', protect, ah(async (req, res) => {
  const query = {};
  if (req.query.status) query.status = req.query.status;
  if (req.query.category) query.aiCategory = req.query.category;
  if (req.query.priority) query.aiPriority = req.query.priority;
  if (req.user.role !== 'owner') query.tenant = req.user._id;

  const complaints = await Complaint.find(query)
    .populate('tenant', 'name phone email')
    .populate('room', 'roomNumber floor')
    .sort({ createdAt: -1 })
    .limit(300);
  res.json({ success: true, data: complaints, count: complaints.length });
}));

// POST /api/complaints — AI analyses, de-duplicates and escalates
router.post('/', protect, ah(async (req, res) => {
  const result = await createComplaintRecord({
    userId: req.user._id,
    description: req.body.description,
    roomNumber: req.body.roomNumber,
    io: req.app.get('io')
  });
  if (!result.success) throw httpError(400, result.message);
  res.status(201).json({ success: true, data: result.complaint, emergencySteps: result.analysis.emergencySteps });
}));

// PUT /api/complaints/:id — owner updates status / assignment / reply
router.put('/:id', protect, isOwner, ah(async (req, res) => {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) throw httpError(404, 'Complaint not found');
  const before = complaint.status;
  Object.assign(complaint, pick(req.body, ['status', 'assignedTo', 'ownerResponse', 'aiPriority', 'aiCategory']));
  if (['resolved', 'closed'].includes(complaint.status) && !complaint.resolvedDate) complaint.resolvedDate = new Date();
  await complaint.save();

  // Resolve linked duplicates together with their master ticket.
  if (complaint.status !== before && ['resolved', 'closed'].includes(complaint.status) && complaint.linkedComplaints?.length) {
    await Complaint.updateMany({ _id: { $in: complaint.linkedComplaints } }, { status: complaint.status, resolvedDate: new Date() });
  }

  const populated = await Complaint.findById(complaint._id).populate('tenant', 'name phone email').populate('room', 'roomNumber floor');
  const io = req.app.get('io');
  if (complaint.status !== before || req.body.ownerResponse) {
    const label = { 'in-progress': 'is being worked on 🔧', resolved: 'has been resolved ✅', closed: 'was closed', open: 'was reopened' }[complaint.status];
    await notify(io, {
      audience: 'user', recipient: complaint.tenant, type: 'complaint',
      title: `Your complaint ${label || 'was updated'}`,
      message: req.body.ownerResponse || complaint.description.slice(0, 100),
      link: '/complaints'
    });
  }
  io?.to('owners').to(`user-${complaint.tenant}`).emit('complaint-updated', { complaint: populated });
  res.json({ success: true, data: populated });
}));

// POST /api/complaints/:id/feedback — tenant rates the fix
router.post('/:id/feedback', protect, ah(async (req, res) => {
  const complaint = await Complaint.findOne({ _id: req.params.id, tenant: req.user._id });
  if (!complaint) throw httpError(404, 'Complaint not found');
  const rating = Math.max(1, Math.min(5, Number(req.body.rating) || 0));
  if (!rating) throw httpError(400, 'Rating 1–5 required');
  complaint.rating = rating;
  complaint.feedback = String(req.body.feedback || '').slice(0, 300);
  if (req.body.reopen) complaint.status = 'open';
  await complaint.save();
  if (req.body.reopen || rating <= 2) {
    await notify(req.app.get('io'), {
      audience: 'owner', type: 'complaint',
      title: req.body.reopen ? `${req.user.name} reopened a complaint` : `Low rating (${rating}★) on a fixed complaint`,
      message: complaint.feedback || complaint.description.slice(0, 100), link: '/complaints'
    });
  }
  res.json({ success: true, data: await complaint.populate([{ path: 'tenant', select: 'name phone email' }, { path: 'room', select: 'roomNumber floor' }]) });
}));

export default router;
