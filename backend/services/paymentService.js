import Payment from '../models/Payment.js';
import User from '../models/User.js';
import { notify } from './notify.js';

const inr = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * Create this month's rent dues for every active tenant who doesn't have one yet.
 */
export async function generateMonthlyDues(date = new Date()) {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const dueDate = new Date(year, month - 1, 5);
  const tenants = await User.find({ role: 'tenant', isActive: true, roomId: { $ne: null } }).populate('roomId', 'rent');
  const existing = new Set((await Payment.find({ month, year }).select('tenant').lean()).map(p => String(p.tenant)));

  const toCreate = tenants
    .filter(t => t.roomId && !existing.has(String(t._id)))
    .map(t => ({
      tenant: t._id,
      room: t.roomId._id,
      amount: t.roomId.rent,
      dueDate,
      status: new Date() > dueDate ? 'overdue' : 'pending',
      month,
      year
    }));
  if (toCreate.length) await Payment.insertMany(toCreate);
  return { created: toCreate.length, month, year };
}

/**
 * Flip pending payments past their due date to overdue.
 */
export async function refreshOverdue() {
  const res = await Payment.updateMany(
    { status: 'pending', dueDate: { $lt: new Date() } },
    { $set: { status: 'overdue' } }
  );
  return res.modifiedCount || 0;
}

/**
 * Mark a tenant's oldest unpaid rent as paid (or record a new payment for this month).
 */
export async function markPaymentPaid({ tenant, paymentId, amount, method = 'cash', transactionId, io }) {
  let payment = paymentId
    ? await Payment.findById(paymentId)
    : await Payment.findOne({ tenant: tenant._id, status: { $in: ['pending', 'overdue', 'partial'] } }).sort({ year: 1, month: 1 });

  const now = new Date();
  if (!payment) {
    if (!tenant?.roomId) return { success: false, message: `${tenant?.name || 'This tenant'} has no room assigned.` };
    const thisMonth = await Payment.findOne({ tenant: tenant._id, month: now.getMonth() + 1, year: now.getFullYear() });
    if (thisMonth?.status === 'paid') {
      return { success: false, message: `${tenant.name} has already paid ${inr(thisMonth.amount)} for ${MONTHS[thisMonth.month - 1]}.` };
    }
    payment = new Payment({
      tenant: tenant._id,
      room: tenant.roomId._id || tenant.roomId,
      amount: amount || tenant.roomId.rent,
      dueDate: new Date(now.getFullYear(), now.getMonth(), 5),
      month: now.getMonth() + 1,
      year: now.getFullYear()
    });
  }
  if (payment.status === 'paid') return { success: false, message: 'That payment is already marked as paid.' };

  if (amount) payment.amount = amount;
  payment.status = 'paid';
  payment.paidDate = now;
  payment.method = method;
  if (transactionId) payment.transactionId = transactionId;
  const daysLate = Math.max(0, Math.ceil((now - payment.dueDate) / 86400000));
  payment.lateFee = daysLate > 7 ? Math.ceil((daysLate - 7) / 7) * 500 : 0;
  await payment.save();

  const tenantId = tenant?._id || payment.tenant;
  await updatePaymentBehavior(tenantId);
  const name = tenant?.name || (await User.findById(tenantId))?.name || 'Tenant';

  await notify(io, {
    audience: 'user',
    recipient: tenantId,
    type: 'payment',
    title: 'Payment received ✅',
    message: `We received ${inr(payment.amount)} for ${MONTHS[payment.month - 1]} ${payment.year}. Thank you!`,
    link: '/payments'
  });
  io?.to('owners').to(`user-${tenantId}`).emit('payment-updated', { paymentId: payment._id });

  return {
    success: true,
    payment,
    data: {
      tenant: name,
      amount: payment.amount,
      month: `${MONTHS[payment.month - 1]} ${payment.year}`,
      method,
      lateFee: payment.lateFee,
      receiptNo: String(payment._id).slice(-8).toUpperCase()
    },
    message: `Marked ${inr(payment.amount)} from ${name} as paid (${method}).${payment.lateFee ? ` Late fee applicable: ${inr(payment.lateFee)}.` : ''}`
  };
}

/**
 * Recalculate on-time / late statistics used by the rent predictor.
 */
export async function updatePaymentBehavior(tenantId) {
  const paid = await Payment.find({ tenant: tenantId, status: 'paid' }).lean();
  if (!paid.length) return;
  const late = paid.filter(p => p.daysLate > 0);
  await User.findByIdAndUpdate(tenantId, {
    paymentBehavior: {
      averageDaysLate: Math.round((late.reduce((s, p) => s + p.daysLate, 0) / paid.length) * 10) / 10,
      latePaymentCount: late.length,
      earlyPaymentCount: paid.filter(p => p.paidDate && p.paidDate < p.dueDate).length,
      onTimePaymentCount: paid.length - late.length,
      lateProbability: Math.min(95, Math.round((late.length / paid.length) * 100))
    }
  });
}

/**
 * A polite WhatsApp reminder with a one-tap wa.me link.
 */
export function buildReminder(payment, tone = 'friendly') {
  const first = payment.tenant?.name?.split(' ')[0] || 'there';
  const monthName = MONTHS[payment.month - 1];
  const upi = process.env.PG_UPI_ID || 'smartpg@upi';
  const overdue = payment.status === 'overdue';
  const message = tone === 'firm' || overdue
    ? `Hi ${first}, your rent of ${inr(payment.amount)} for ${monthName} (Room ${payment.room?.roomNumber || ''}) is overdue since the 5th. Please clear it today to avoid the ₹500/week late fee. UPI: ${upi}. Thanks — SmartPG`
    : `Hi ${first} 👋 a gentle reminder that your rent of ${inr(payment.amount)} for ${monthName} is due on the 5th. You can pay via UPI to ${upi}. Thank you! — SmartPG`;
  const phone = String(payment.tenant?.phone || '').replace(/\D/g, '');
  return {
    tenant: payment.tenant?.name,
    room: payment.room?.roomNumber,
    amount: payment.amount,
    status: payment.status,
    message,
    whatsappLink: phone ? `https://wa.me/${phone.length === 10 ? '91' + phone : phone}?text=${encodeURIComponent(message)}` : null
  };
}
