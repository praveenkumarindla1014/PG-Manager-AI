import express from 'express';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import { protect, isOwner } from '../middleware/auth.js';
import { predictRentPayments } from '../services/ai/predictionEngine.js';
import { analyzePaymentScreenshot } from '../services/ai/fraudDetector.js';
import { generateMonthlyDues, markPaymentPaid, buildReminder, refreshOverdue } from '../services/paymentService.js';
import { getMonthFinance } from '../services/stats.js';
import { notify } from '../services/notify.js';
import { ah, pick, httpError } from '../utils/http.js';

const router = express.Router();

// GET /api/payments — tenants only ever get their own
router.get('/', protect, ah(async (req, res) => {
  const { month, year, status, tenantId } = req.query;
  const query = {};
  if (month) query.month = Number(month);
  if (year) query.year = Number(year);
  if (status) query.status = status;
  if (req.user.role === 'owner' && tenantId) query.tenant = tenantId;
  if (req.user.role !== 'owner') query.tenant = req.user._id;

  const payments = await Payment.find(query)
    .populate('tenant', 'name phone email')
    .populate('room', 'roomNumber floor')
    .sort({ year: -1, month: -1, status: 1 })
    .limit(500);
  res.json({ success: true, data: payments, count: payments.length });
}));

// GET /api/payments/summary?month=&year=
router.get('/summary', protect, isOwner, ah(async (req, res) => {
  const now = new Date();
  const month = Number(req.query.month) || now.getMonth() + 1;
  const year = Number(req.query.year) || now.getFullYear();
  res.json({ success: true, data: await getMonthFinance(month, year) });
}));

// GET /api/payments/predictions (Feature #10)
router.get('/predictions', protect, isOwner, ah(async (req, res) => {
  res.json({ success: true, data: await predictRentPayments() });
}));

// GET /api/payments/pay-info — how tenants can pay
router.get('/pay-info', protect, ah(async (req, res) => {
  res.json({
    success: true,
    data: {
      upiId: process.env.PG_UPI_ID || 'smartpg@upi',
      payee: process.env.PG_NAME || 'SmartPG',
      dueDay: 5,
      lateFeePerWeek: 500
    }
  });
}));

// POST /api/payments/generate-dues — create this month's rent rows for everyone
router.post('/generate-dues', protect, isOwner, ah(async (req, res) => {
  const result = await generateMonthlyDues();
  await refreshOverdue();
  res.json({ success: true, data: result, message: result.created ? `Created ${result.created} rent due(s) for ${result.month}/${result.year}` : 'All rent dues for this month already exist' });
}));

// POST /api/payments/reminders — WhatsApp-ready reminders for all unpaid
router.post('/reminders', protect, isOwner, ah(async (req, res) => {
  const now = new Date();
  const ids = Array.isArray(req.body.paymentIds) ? req.body.paymentIds : null;
  const query = ids ? { _id: { $in: ids } } : { month: now.getMonth() + 1, year: now.getFullYear(), status: { $in: ['pending', 'overdue', 'partial'] } };
  const unpaid = await Payment.find(query).populate('tenant', 'name phone').populate('room', 'roomNumber').lean();
  const io = req.app.get('io');
  await Promise.all(unpaid.filter(p => p.tenant && p.status !== 'paid').map(p => notify(io, {
    audience: 'user', recipient: p.tenant._id, type: 'payment', title: 'Rent reminder',
    message: `Your rent of ₹${p.amount.toLocaleString('en-IN')} is ${p.status === 'overdue' ? 'overdue' : 'due on the 5th'}.`, link: '/payments'
  })));
  res.json({ success: true, data: unpaid.filter(p => p.tenant && p.status !== 'paid').map(p => buildReminder(p, req.body.tone)) });
}));

// POST /api/payments/verify-screenshot — AI check of a UPI screenshot (Feature #19)
router.post('/verify-screenshot', protect, ah(async (req, res) => {
  if (!req.body.imageBase64) throw httpError(400, 'Screenshot required');
  res.json({ success: true, data: await analyzePaymentScreenshot(req.body.imageBase64) });
}));

// POST /api/payments/:id/report — tenant says "I've paid", owner confirms
router.post('/:id/report', protect, ah(async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) throw httpError(404, 'Payment not found');
  if (req.user.role !== 'owner' && String(payment.tenant) !== String(req.user._id)) throw httpError(403, 'Not allowed');
  if (payment.status === 'paid') throw httpError(400, 'This payment is already marked as paid');

  payment.transactionId = String(req.body.transactionId || '').slice(0, 60) || payment.transactionId;
  payment.method = ['upi', 'bank-transfer', 'cash', 'card', 'other'].includes(req.body.method) ? req.body.method : 'upi';
  payment.notes = `Tenant reported payment on ${new Date().toLocaleDateString('en-IN')}${req.body.note ? ': ' + String(req.body.note).slice(0, 200) : ''}`;
  if (req.body.screenshot) payment.screenshot = req.body.screenshot;
  await payment.save();

  await notify(req.app.get('io'), {
    audience: 'owner', type: 'payment',
    title: `${req.user.name} reported a rent payment`,
    message: `₹${payment.amount.toLocaleString('en-IN')} via ${payment.method}${payment.transactionId ? ` · Txn ${payment.transactionId}` : ''}. Please verify and mark as paid.`,
    link: '/payments'
  });
  res.json({ success: true, data: payment, message: 'Thanks! The owner will verify and confirm your payment.' });
}));

// POST /api/payments/:id/mark-paid — owner confirms receipt
router.post('/:id/mark-paid', protect, isOwner, ah(async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) throw httpError(404, 'Payment not found');
  const tenant = await User.findById(payment.tenant).populate('roomId');
  const result = await markPaymentPaid({
    tenant, paymentId: payment._id,
    amount: req.body.amount ? Number(req.body.amount) : undefined,
    method: req.body.method || payment.method || 'cash',
    transactionId: req.body.transactionId,
    io: req.app.get('io')
  });
  if (!result.success) throw httpError(400, result.message);
  res.json({ success: true, data: result.payment, message: result.message });
}));

// POST /api/payments — owner records a payment directly
router.post('/', protect, isOwner, ah(async (req, res) => {
  const tenant = await User.findById(req.body.tenant).populate('roomId');
  if (!tenant) throw httpError(404, 'Tenant not found');
  const result = await markPaymentPaid({
    tenant,
    amount: req.body.amount ? Number(req.body.amount) : undefined,
    method: req.body.method || 'cash',
    transactionId: req.body.transactionId,
    io: req.app.get('io')
  });
  if (!result.success) throw httpError(400, result.message);
  res.status(201).json({ success: true, data: result.payment, message: result.message });
}));

// PUT /api/payments/:id — owner edits amount/notes/status
router.put('/:id', protect, isOwner, ah(async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) throw httpError(404, 'Payment not found');
  Object.assign(payment, pick(req.body, ['amount', 'dueDate', 'method', 'notes', 'transactionId', 'lateFee', 'status']));
  if (payment.status !== 'paid') payment.paidDate = undefined;
  await payment.save();
  res.json({ success: true, data: payment });
}));

// DELETE /api/payments/:id — remove a wrongly created due
router.delete('/:id', protect, isOwner, ah(async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) throw httpError(404, 'Payment not found');
  if (payment.status === 'paid') throw httpError(400, 'Paid records cannot be deleted');
  await payment.deleteOne();
  res.json({ success: true, message: 'Payment due removed' });
}));

export default router;
