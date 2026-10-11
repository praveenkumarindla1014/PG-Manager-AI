/**
 * Function Executor
 *
 * Runs the tools the AI assistant calls. Every handler receives the caller's
 * identity and enforces permissions itself — tenants only ever see or change
 * their own data, whatever arguments the model passes.
 */

import Room from '../../models/Room.js';
import User from '../../models/User.js';
import Payment from '../../models/Payment.js';
import Complaint from '../../models/Complaint.js';
import Notice from '../../models/Notice.js';
import Visitor from '../../models/Visitor.js';
import Expense from '../../models/Expense.js';
import MaintenanceSchedule from '../../models/MaintenanceSchedule.js';
import { isAllowed } from './functionRegistry.js';
import { generateProfessionalNotice } from './noticeGenerator.js';
import { getAIFoodRecommendation } from './nutritionAnalyzer.js';
import { predictRentPayments, predictOccupancy, predictMaintenance, predictExpenses } from './predictionEngine.js';
import { generateInsights, generateSmartTodo } from './insightsGenerator.js';
import { matchRoom, matchRoommate } from './matchingEngine.js';
import { generateProfessionalEmail } from './emailGenerator.js';
import { generateProfessionalWhatsApp } from './whatsappGenerator.js';
import { getRevenueOptimizationSuggestions } from './revenueOptimizer.js';
import { searchKB } from './ragService.js';
import { convertToQuery } from './smartSearch.js';
import { getDashboardStats, getMonthFinance, getOccupancy, startOfDay, endOfDay } from '../stats.js';
import { getMenuForDate } from '../menuService.js';
import { createComplaintRecord } from '../complaintService.js';
import { markPaymentPaid, buildReminder } from '../paymentService.js';
import { notify } from '../notify.js';

const inr = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
const escapeRegex = (s = '') => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const SAFE_USER_FIELDS = '-password -aadhaarImage -selfieImage -aadhaarNumber -extractedAadhaarData';

function roomSummary(r) {
  const occupied = r.currentOccupants?.length || 0;
  return {
    roomNumber: r.roomNumber,
    floor: r.floor,
    type: r.type,
    rent: r.rent,
    freeBeds: r.maxOccupants - occupied,
    maxOccupants: r.maxOccupants,
    status: r.status,
    gender: r.genderPreference,
    features: [
      r.hasAC && 'AC', r.hasAttachedBathroom && 'Attached bath', r.hasBalcony && 'Balcony',
      r.hasParking && 'Parking', r.hasGeyser && 'Geyser', r.hasTv && 'TV', r.hasWifi && 'WiFi'
    ].filter(Boolean),
    furnishing: r.furnishing
  };
}

async function findTenantsByName(name) {
  if (!name) return [];
  return User.find({ role: 'tenant', isActive: true, name: { $regex: escapeRegex(name.trim()), $options: 'i' } })
    .select(SAFE_USER_FIELDS).populate('roomId', 'roomNumber floor rent');
}

/**
 * Resolve which tenant a tool call is about. Tenants are always themselves.
 */
async function resolveTenant(args, ctx) {
  if (ctx.userRole !== 'owner') {
    return { tenant: await User.findById(ctx.userId).select(SAFE_USER_FIELDS).populate('roomId') };
  }
  if (args.roomNumber && !args.tenantName) {
    const room = await Room.findOne({ roomNumber: String(args.roomNumber) });
    if (!room) return { error: `Room ${args.roomNumber} doesn't exist.` };
    const occupants = await User.find({ _id: { $in: room.currentOccupants } }).select(SAFE_USER_FIELDS).populate('roomId');
    if (occupants.length === 1) return { tenant: occupants[0] };
    if (!occupants.length) return { error: `Room ${args.roomNumber} is empty.` };
    return { error: `Room ${args.roomNumber} has ${occupants.length} tenants (${occupants.map(o => o.name).join(', ')}). Which one?` };
  }
  if (!args.tenantName) return { error: 'Which tenant? Please give a name or room number.' };
  const matches = await findTenantsByName(args.tenantName);
  const filtered = args.roomNumber ? matches.filter(m => m.roomId?.roomNumber === String(args.roomNumber)) : matches;
  if (!filtered.length) return { error: `No active tenant named "${args.tenantName}".` };
  if (filtered.length > 1) {
    return { error: `Several tenants match "${args.tenantName}": ${filtered.map(t => `${t.name} (Room ${t.roomId?.roomNumber || '-'})`).join(', ')}. Which one?` };
  }
  return { tenant: await User.findById(filtered[0]._id).select(SAFE_USER_FIELDS).populate('roomId') };
}

function dateFromDayWord(day) {
  const d = new Date();
  if (!day || day === 'today') return d;
  if (day === 'tomorrow') { d.setDate(d.getDate() + 1); return d; }
  const names = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const target = names.indexOf(day);
  if (target < 0) return d;
  d.setDate(d.getDate() + ((target - d.getDay() + 7) % 7));
  return d;
}

const handlers = {
  // ================= ROOMS =================
  async search_rooms(args) {
    const query = { status: { $in: ['available', 'partially-occupied'] } };
    if (args.maxRent) query.rent = { ...query.rent, $lte: args.maxRent };
    if (args.minRent) query.rent = { ...query.rent, $gte: args.minRent };
    if (args.type) query.type = args.type;
    if (args.floor) query.floor = args.floor;
    for (const f of ['hasAC', 'hasParking', 'hasAttachedBathroom', 'hasBalcony']) {
      if (typeof args[f] === 'boolean') query[f] = args[f];
    }
    if (args.genderPreference) query.genderPreference = { $in: [args.genderPreference, 'any'] };

    const rooms = await Room.find(query).sort({ rent: 1, roomNumber: 1 }).lean();
    return {
      success: true,
      count: rooms.length,
      data: rooms.map(roomSummary),
      display: 'rooms',
      message: rooms.length ? `Found ${rooms.length} room(s) with free beds.` : 'No rooms with free beds match those filters.'
    };
  },

  async get_empty_rooms(args) {
    const query = { status: { $in: ['available', 'partially-occupied'] } };
    if (args.floor) query.floor = args.floor;
    const rooms = await Room.find(query).sort({ roomNumber: 1 }).lean();
    const occ = await getOccupancy();
    const empty = rooms.filter(r => !r.currentOccupants?.length);
    return {
      success: true,
      data: rooms.map(roomSummary),
      display: 'rooms',
      summary: { completelyEmptyRooms: empty.length, roomsWithFreeBeds: rooms.length, vacantBeds: occ.vacantBeds, totalBeds: occ.totalBeds, occupancyRate: occ.occupancyRate },
      message: `${empty.length} room(s) completely empty; ${occ.vacantBeds} vacant bed(s) in total across ${rooms.length} room(s).`
    };
  },

  async get_room_details(args, ctx) {
    const room = await Room.findOne({ roomNumber: String(args.roomNumber) }).populate('currentOccupants', 'name phone gender').lean();
    if (!room) return { success: false, message: `Room ${args.roomNumber} not found.` };
    const data = roomSummary(room);
    // Only owners see who lives where (privacy).
    if (ctx.userRole === 'owner') data.occupants = room.currentOccupants.map(o => ({ name: o.name, phone: o.phone }));
    return { success: true, data, display: 'rooms' };
  },

  async get_auto_room_match(args) {
    return { success: true, data: await matchRoom(args) };
  },

  async get_facilities() {
    const rooms = await Room.find().lean();
    return {
      success: true,
      data: {
        totalRooms: rooms.length,
        acRooms: rooms.filter(r => r.hasAC).length,
        attachedBathrooms: rooms.filter(r => r.hasAttachedBathroom).length,
        parking: rooms.some(r => r.hasParking) ? 'Two-wheeler parking available' : 'No parking',
        wifi: 'High-speed WiFi in all rooms',
        food: '4 meals daily (breakfast, lunch, snacks, dinner) included',
        housekeeping: 'Rooms cleaned on alternate days',
        laundry: 'Washing machine on every floor',
        security: 'CCTV and gate register',
        rentRange: rooms.length ? `${inr(Math.min(...rooms.map(r => r.rent)))} – ${inr(Math.max(...rooms.map(r => r.rent)))} per month` : null
      }
    };
  },

  // ================= DASHBOARD / FINANCE =================
  async get_dashboard_stats() {
    const s = await getDashboardStats();
    return {
      success: true,
      display: 'stats',
      data: {
        occupancy: `${s.occupancy.occupiedBeds}/${s.occupancy.totalBeds} beds (${s.occupancy.occupancyRate}%)`,
        vacantBeds: s.occupancy.vacantBeds,
        activeTenants: s.tenants,
        rentCollectedThisMonth: s.finance.collected,
        rentPendingThisMonth: s.finance.pending,
        tenantsWithPendingRent: s.finance.pendingCount,
        expensesThisMonth: s.finance.expenses,
        profitThisMonth: s.finance.profit,
        collectedToday: s.todayIncome,
        openComplaints: s.complaints.open,
        emergencies: s.complaints.emergency,
        visitorsToday: s.visitors.today,
        visitorsAwaitingApproval: s.visitors.pendingApproval,
        maintenanceThisWeek: s.upcomingMaintenance.map(m => `${m.type} on ${new Date(m.scheduledDate).toDateString()}`)
      }
    };
  },

  async get_income_report(args) {
    const now = new Date();
    if (args.period === 'today' || args.period === 'this-week') {
      const from = startOfDay(now);
      if (args.period === 'this-week') from.setDate(from.getDate() - ((from.getDay() + 6) % 7));
      const paid = await Payment.find({ status: 'paid', paidDate: { $gte: from } }).populate('tenant', 'name').lean();
      const total = paid.reduce((s, p) => s + p.amount, 0);
      return {
        success: true,
        data: { period: args.period, totalCollected: total, payments: paid.map(p => ({ tenant: p.tenant?.name, amount: p.amount, method: p.method, date: p.paidDate })) },
        message: `Collected ${inr(total)} from ${paid.length} payment(s) ${args.period === 'today' ? 'today' : 'this week'}.`
      };
    }
    let month = now.getMonth() + 1, year = now.getFullYear();
    if (args.period === 'last-month') { month -= 1; if (month === 0) { month = 12; year -= 1; } }
    if (args.period === 'specific-month' || args.month) { month = args.month || month; year = args.year || year; }
    const f = await getMonthFinance(month, year);
    return {
      success: true,
      display: 'stats',
      data: { month: f.label, expectedRent: f.expected, collected: f.collected, pending: f.pending, pendingTenants: f.pendingCount, collectionRate: `${f.collectionRate}%`, expenses: f.expenses, netProfit: f.profit },
      message: `${f.label}: collected ${inr(f.collected)} of ${inr(f.expected)} (${f.collectionRate}%). ${f.pendingCount} payment(s) pending worth ${inr(f.pending)}.`
    };
  },

  async get_unpaid_tenants(args) {
    const now = new Date();
    const month = args.month || now.getMonth() + 1;
    const year = args.year || now.getFullYear();
    const unpaid = await Payment.find({ month, year, status: { $in: ['pending', 'overdue', 'partial'] } })
      .populate('tenant', 'name phone').populate('room', 'roomNumber').sort({ status: 1 }).lean();
    const total = unpaid.reduce((s, p) => s + p.amount, 0);
    return {
      success: true,
      count: unpaid.length,
      display: 'payments',
      data: unpaid.map(p => ({
        tenant: p.tenant?.name, phone: p.tenant?.phone, room: p.room?.roomNumber,
        amount: p.amount, status: p.status,
        daysOverdue: Math.max(0, Math.floor((now - new Date(p.dueDate)) / 86400000))
      })),
      message: unpaid.length ? `${unpaid.length} tenant(s) haven't paid for ${month}/${year} — ${inr(total)} outstanding.` : `Everyone has paid for ${month}/${year}. 🎉`
    };
  },

  async record_payment(args, ctx) {
    const { tenant, error } = await resolveTenant(args, ctx);
    if (error) return { success: false, message: error };
    const result = await markPaymentPaid({
      tenant,
      amount: args.amount,
      method: args.method || 'cash',
      transactionId: args.transactionId,
      io: ctx.io
    });
    return result;
  },

  async send_rent_reminders(args, ctx) {
    const now = new Date();
    const unpaid = await Payment.find({ month: now.getMonth() + 1, year: now.getFullYear(), status: { $in: ['pending', 'overdue', 'partial'] } })
      .populate('tenant', 'name phone').populate('room', 'roomNumber').lean();
    if (!unpaid.length) return { success: true, data: [], message: 'Nobody has pending rent this month — no reminders needed. 🎉' };

    const reminders = unpaid.filter(p => p.tenant).map(p => buildReminder(p, args.tone));
    await Promise.all(unpaid.filter(p => p.tenant).map(p => notify(ctx.io, {
      audience: 'user', recipient: p.tenant._id, type: 'payment',
      title: 'Rent reminder', message: `Your rent of ${inr(p.amount)} is ${p.status === 'overdue' ? 'overdue' : 'due'}. Please pay at the earliest.`, link: '/payments'
    })));
    return {
      success: true,
      display: 'reminders',
      data: reminders,
      message: `Prepared ${reminders.length} WhatsApp reminder(s) and sent in-app reminders. The app shows a "Send on WhatsApp" button for each tenant, so do not paste the links in your reply — just list who was reminded.`
    };
  },

  async get_rent_status(args, ctx) {
    const { tenant, error } = await resolveTenant(args, ctx);
    if (error) return { success: false, message: error };
    const payments = await Payment.find({ tenant: tenant._id }).sort({ year: -1, month: -1 }).limit(6).lean();
    const now = new Date();
    const current = payments.find(p => p.month === now.getMonth() + 1 && p.year === now.getFullYear());
    const due = new Date(now.getFullYear(), now.getMonth(), 5);
    return {
      success: true,
      display: 'payments',
      data: {
        tenant: tenant.name,
        room: tenant.roomId?.roomNumber,
        monthlyRent: tenant.roomId?.rent,
        thisMonth: current
          ? { amount: current.amount, status: current.status, dueDate: current.dueDate, paidDate: current.paidDate }
          : { status: 'not-generated', amount: tenant.roomId?.rent, dueDate: due },
        history: payments.map(p => ({ month: `${p.month}/${p.year}`, amount: p.amount, status: p.status, paidDate: p.paidDate, daysLate: p.daysLate }))
      }
    };
  },

  async get_payment_info() {
    return {
      success: true,
      data: {
        upiId: process.env.PG_UPI_ID || 'smartpg@upi',
        payee: process.env.PG_NAME || 'SmartPG',
        bank: process.env.PG_BANK_DETAILS || 'Ask the office for bank transfer details',
        dueDay: '5th of every month',
        lateFee: '₹500 per week after the due date',
        note: 'After paying by UPI, share the transaction ID with the owner so it can be marked as paid.'
      }
    };
  },

  async get_rent_prediction() {
    return { success: true, data: await predictRentPayments() };
  },

  // ================= COMPLAINTS =================
  async create_complaint(args, ctx) {
    const result = await createComplaintRecord({
      userId: ctx.userId,
      description: args.description,
      roomNumber: args.roomNumber,
      io: ctx.io
    });
    if (!result.success) return result;
    const { complaint, analysis } = result;
    return {
      success: true,
      data: {
        id: complaint._id,
        category: complaint.aiCategory,
        priority: complaint.aiPriority,
        estimatedResolution: complaint.aiEstimatedTime,
        assignedStaffType: complaint.aiSuggestedStaff,
        isEmergency: complaint.isEmergency,
        duplicateOfExisting: complaint.isDuplicate,
        replyToTenant: complaint.aiGeneratedReply,
        emergencySteps: analysis.emergencySteps
      },
      message: complaint.isEmergency
        ? '🚨 Emergency reported — the owner has been alerted immediately.'
        : `Complaint registered as ${complaint.aiCategory} (${complaint.aiPriority} priority). Expected fix: ${complaint.aiEstimatedTime}.`
    };
  },

  async get_pending_complaints(args) {
    const query = { status: args.status || { $in: ['open', 'in-progress'] } };
    if (args.category) query.aiCategory = args.category;
    let complaints = await Complaint.find(query)
      .populate('tenant', 'name').populate('room', 'roomNumber floor')
      .sort({ isEmergency: -1, urgencyScore: -1, createdAt: -1 }).limit(25).lean();
    if (args.floor) complaints = complaints.filter(c => c.room?.floor === args.floor);
    return {
      success: true,
      count: complaints.length,
      display: 'complaints',
      data: complaints.map(c => ({
        id: c._id, room: c.room?.roomNumber, tenant: c.tenant?.name, issue: c.description,
        category: c.aiCategory, priority: c.aiPriority, status: c.status, emergency: c.isEmergency,
        raised: c.createdAt, assignedTo: c.assignedTo
      })),
      message: `${complaints.length} complaint(s) ${args.status || 'open or in progress'}.`
    };
  },

  async get_complaints_by_tenant(args, ctx) {
    const { tenant, error } = await resolveTenant(args, ctx);
    if (error) return { success: false, message: error };
    const complaints = await Complaint.find({ tenant: tenant._id }).populate('room', 'roomNumber').sort({ createdAt: -1 }).limit(15).lean();
    return {
      success: true,
      count: complaints.length,
      display: 'complaints',
      data: complaints.map(c => ({
        id: c._id, issue: c.description, category: c.aiCategory, priority: c.aiPriority,
        status: c.status, raised: c.createdAt, ownerResponse: c.ownerResponse, eta: c.aiEstimatedTime
      }))
    };
  },

  async update_complaint_status(args, ctx) {
    let complaint;
    if (args.complaintId && /^[a-f0-9]{24}$/i.test(args.complaintId)) {
      complaint = await Complaint.findById(args.complaintId);
    } else {
      const query = { status: { $in: ['open', 'in-progress'] } };
      if (args.roomNumber) {
        const room = await Room.findOne({ roomNumber: String(args.roomNumber) });
        if (room) query.room = room._id;
      }
      if (args.keyword) query.description = { $regex: escapeRegex(args.keyword), $options: 'i' };
      const matches = await Complaint.find(query).sort({ createdAt: -1 }).limit(5);
      if (matches.length > 1 && !args.keyword && !args.roomNumber) {
        return { success: false, message: 'Several complaints match. Please mention the room number or a keyword.' };
      }
      complaint = matches[0];
    }
    if (!complaint) return { success: false, message: 'Could not find that complaint.' };

    if (args.status) complaint.status = args.status;
    if (args.assignedTo) complaint.assignedTo = args.assignedTo;
    if (args.ownerResponse) complaint.ownerResponse = args.ownerResponse;
    if (['resolved', 'closed'].includes(args.status)) complaint.resolvedDate = new Date();
    await complaint.save();

    await notify(ctx.io, {
      audience: 'user', recipient: complaint.tenant, type: 'complaint',
      title: `Complaint ${complaint.status}`,
      message: args.ownerResponse || `Your complaint "${complaint.description.slice(0, 60)}" is now ${complaint.status}.`,
      link: '/complaints'
    });
    return { success: true, data: { id: complaint._id, issue: complaint.description, status: complaint.status, assignedTo: complaint.assignedTo }, message: `Complaint updated to "${complaint.status}" and the tenant was notified.` };
  },

  // ================= PEOPLE =================
  async find_tenant(args) {
    const q = String(args.query || '').trim();
    const or = [{ name: { $regex: escapeRegex(q), $options: 'i' } }, { phone: { $regex: escapeRegex(q) } }];
    const room = await Room.findOne({ roomNumber: q });
    if (room) or.push({ _id: { $in: room.currentOccupants } });
    const tenants = await User.find({ role: 'tenant', isActive: true, $or: or }).select(SAFE_USER_FIELDS).populate('roomId', 'roomNumber floor rent').limit(10).lean();
    const now = new Date();
    const payments = await Payment.find({ tenant: { $in: tenants.map(t => t._id) }, month: now.getMonth() + 1, year: now.getFullYear() }).lean();
    return {
      success: true,
      count: tenants.length,
      display: 'tenants',
      data: tenants.map(t => ({
        name: t.name, phone: t.phone, email: t.email, room: t.roomId?.roomNumber, rent: t.roomId?.rent,
        movedIn: t.moveInDate, occupation: t.preferences?.occupation, idVerified: t.idVerified,
        rentThisMonth: payments.find(p => String(p.tenant) === String(t._id))?.status || 'not generated',
        lateProbability: t.paymentBehavior?.lateProbability, riskScore: t.violationScore
      }))
    };
  },

  async get_roommate_info(args, ctx) {
    const me = await User.findById(ctx.userId).populate('roomId');
    if (!me?.roomId) return { success: false, message: "You don't have a room assigned yet." };
    const room = await Room.findById(me.roomId._id).populate('currentOccupants', 'name gender preferences.occupation preferences.sleepTiming preferences.interests');
    const roommates = room.currentOccupants.filter(o => String(o._id) !== String(ctx.userId));
    return {
      success: true,
      data: {
        roomNumber: room.roomNumber, floor: room.floor, type: room.type,
        roommates: roommates.map(r => ({ name: r.name, occupation: r.preferences?.occupation, sleepTiming: r.preferences?.sleepTiming, interests: r.preferences?.interests }))
      },
      message: roommates.length ? `You share Room ${room.roomNumber} with ${roommates.map(r => r.name).join(', ')}.` : `You have Room ${room.roomNumber} to yourself right now.`
    };
  },

  async get_roommate_match(args, ctx) {
    let tenantId = ctx.userId;
    if (ctx.userRole === 'owner' && args.tenantName) {
      const { tenant, error } = await resolveTenant(args, ctx);
      if (error) return { success: false, message: error };
      tenantId = tenant._id;
    }
    const me = await User.findById(tenantId);
    const prefs = { ...(me?.preferences?.toObject?.() || {}), ...args, tenantId };
    if (typeof prefs.interests === 'string') prefs.interests = prefs.interests.split(',').map(s => s.trim());
    return { success: true, data: await matchRoommate(prefs) };
  },

  async get_risky_tenants() {
    const tenants = await User.find({
      role: 'tenant', isActive: true,
      $or: [{ violationScore: { $gt: 0 } }, { 'paymentBehavior.lateProbability': { $gte: 40 } }]
    }).select('name phone roomId violationScore violations paymentBehavior').populate('roomId', 'roomNumber').sort({ violationScore: -1 }).lean();
    return {
      success: true,
      display: 'tenants',
      data: tenants.map(t => ({ name: t.name, room: t.roomId?.roomNumber, riskScore: t.violationScore, lateProbability: t.paymentBehavior?.lateProbability, avgDaysLate: t.paymentBehavior?.averageDaysLate, violations: t.violations?.map(v => v.description) })),
      message: `${tenants.length} tenant(s) need attention.`
    };
  },

  // ================= VISITORS =================
  async get_today_visitors(args) {
    const date = args.date ? new Date(args.date) : new Date();
    const visitors = await Visitor.find({ $or: [{ checkIn: { $gte: startOfDay(date), $lte: endOfDay(date) } }, { status: 'pending' }] })
      .populate('tenantVisiting', 'name').sort({ checkIn: -1 }).lean();
    return {
      success: true,
      count: visitors.length,
      data: visitors.map(v => ({ name: v.name, phone: v.phone, purpose: v.purpose, visiting: v.tenantVisiting?.name, room: v.roomVisiting, checkIn: v.checkIn, checkOut: v.checkOut, status: v.status, guests: v.numberOfGuests })),
      message: `${visitors.length} visitor record(s).`
    };
  },

  async log_visitor(args, ctx) {
    let tenantVisiting, roomVisiting;
    if (ctx.userRole === 'tenant') {
      const me = await User.findById(ctx.userId).populate('roomId', 'roomNumber');
      tenantVisiting = me._id;
      roomVisiting = me.roomId?.roomNumber;
    } else if (args.tenantName) {
      const [t] = await findTenantsByName(args.tenantName);
      tenantVisiting = t?._id;
      roomVisiting = t?.roomId?.roomNumber;
    }
    const visitor = await Visitor.create({
      name: args.name,
      phone: args.phone || 'Not provided',
      purpose: args.purpose,
      tenantVisiting,
      roomVisiting,
      numberOfGuests: args.numberOfGuests || 1,
      status: ctx.userRole === 'owner' ? 'approved' : 'pending',
      approvedBy: ctx.userRole === 'owner' ? ctx.userId : undefined
    });
    if (ctx.userRole !== 'owner') {
      await notify(ctx.io, { audience: 'owner', type: 'visitor', title: 'Visitor awaiting approval', message: `${args.name} — ${args.purpose}${roomVisiting ? ` (Room ${roomVisiting})` : ''}`, link: '/visitors' });
    }
    return { success: true, data: { name: visitor.name, status: visitor.status }, message: ctx.userRole === 'owner' ? `${visitor.name} checked in.` : `${visitor.name} is pre-registered; the owner will approve at the gate.` };
  },

  async update_visitor(args, ctx) {
    const visitor = await Visitor.findOne({
      name: { $regex: escapeRegex(args.visitorName), $options: 'i' },
      status: args.action === 'check-out' ? { $in: ['approved', 'pending'] } : 'pending'
    }).sort({ checkIn: -1 });
    if (!visitor) return { success: false, message: `No matching visitor "${args.visitorName}" to ${args.action}.` };
    if (args.action === 'approve') { visitor.status = 'approved'; visitor.approvedBy = ctx.userId; }
    if (args.action === 'reject') visitor.status = 'rejected';
    if (args.action === 'check-out') { visitor.status = 'checked-out'; visitor.checkOut = new Date(); }
    await visitor.save();
    return { success: true, data: { name: visitor.name, status: visitor.status }, message: `${visitor.name}: ${visitor.status}.` };
  },

  // ================= NOTICES =================
  async generate_notice(args, ctx) {
    const notice = await generateProfessionalNotice(args.rawInput, args.priority || 'medium', args.category || 'general', ctx.userId);
    await notify(ctx.io, { audience: 'all', type: 'notice', title: `📢 ${notice.title}`, message: notice.content.slice(0, 140), link: '/notices' });
    return { success: true, data: { title: notice.title, content: notice.content, languages: Object.keys(notice.translations || {}).filter(k => notice.translations[k]) }, message: 'Notice published and all tenants notified.' };
  },

  async get_notices(args) {
    const query = { isActive: true };
    if (args.category) query.category = args.category;
    const notices = await Notice.find(query).sort({ createdAt: -1 }).limit(Math.min(args.limit || 5, 20)).lean();
    return { success: true, count: notices.length, data: notices.map(n => ({ title: n.title, content: n.content, priority: n.priority, category: n.category, date: n.createdAt })) };
  },

  // ================= FOOD =================
  async get_menu(args) {
    const date = dateFromDayWord(args.day);
    const menu = await getMenuForDate(date);
    if (!menu) return { success: false, message: 'No menu has been set for that day.' };
    const meals = args.meal ? [args.meal] : ['breakfast', 'lunch', 'snacks', 'dinner'];
    const data = { day: date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' }) };
    for (const m of meals) {
      data[m] = { timing: menu[m]?.timing, items: (menu[m]?.items || []).map(i => `${i.name}${i.isVeg === false ? ' (non-veg)' : ''} — ${i.nutrition?.calories || '?'} kcal, ${i.nutrition?.protein || '?'}g protein`) };
    }
    if (!args.meal) data.dailyTotal = menu.totalNutrition;
    return { success: true, display: 'menu', data };
  },

  async get_food_recommendation(args) {
    return { success: true, data: await getAIFoodRecommendation(args.dietaryNeed, args.restrictions) };
  },

  // ================= MAINTENANCE =================
  async schedule_maintenance(args, ctx) {
    const room = args.roomNumber ? await Room.findOne({ roomNumber: String(args.roomNumber) }) : null;
    const date = new Date(args.scheduledDate);
    if (isNaN(date)) return { success: false, message: 'Please give a valid date (YYYY-MM-DD).' };
    const schedule = await MaintenanceSchedule.create({
      type: args.type,
      description: args.description,
      scheduledDate: date,
      room: room?._id,
      roomNumber: room?.roomNumber,
      floor: room?.floor,
      assignedTo: args.assignedTo,
      estimatedCost: args.estimatedCost,
      createdViaAI: true,
      createdBy: ctx.userId,
      priority: args.type === 'pest-control' || args.type === 'electrical' ? 'high' : 'medium'
    });
    await notify(ctx.io, { audience: 'all', type: 'maintenance', title: `🔧 ${args.type.replace('-', ' ')} scheduled`, message: `${args.description} — ${date.toDateString()}`, link: '/maintenance' });
    return { success: true, data: { id: schedule._id, type: schedule.type, date: date.toDateString(), assignedTo: schedule.assignedTo }, message: `Scheduled ${args.type} for ${date.toDateString()}.` };
  },

  async get_maintenance_predictions(args) {
    return { success: true, data: await predictMaintenance(args.type) };
  },

  // ================= REPORTS =================
  async generate_monthly_report(args) {
    const now = new Date();
    const month = args.month || now.getMonth() + 1;
    const year = args.year || now.getFullYear();
    const [f, occ, complaints] = await Promise.all([
      getMonthFinance(month, year),
      getOccupancy(),
      Complaint.find({ createdAt: { $gte: new Date(year, month - 1, 1), $lt: new Date(year, month, 1) } }).lean()
    ]);
    const late = await Payment.countDocuments({ month, year, daysLate: { $gt: 0 } });
    return {
      success: true,
      display: 'stats',
      data: {
        month: f.label, rentCollected: f.collected, rentPending: f.pending, collectionRate: `${f.collectionRate}%`,
        expenses: f.expenses, expenseBreakdown: f.expenseByCategory, netProfit: f.profit,
        occupancy: `${occ.occupancyRate}% (${occ.occupiedBeds}/${occ.totalBeds} beds)`,
        complaintsRaised: complaints.length, complaintsResolved: complaints.filter(c => ['resolved', 'closed'].includes(c.status)).length,
        latePayments: late,
        pdf: `/api/reports/monthly-pdf?month=${month}&year=${year}`
      }
    };
  },

  async get_business_insights() {
    return { success: true, data: await generateInsights() };
  },

  async get_occupancy_prediction() {
    return { success: true, data: await predictOccupancy() };
  },

  async get_revenue_optimization() {
    return { success: true, data: await getRevenueOptimizationSuggestions() };
  },

  async get_smart_todo_list() {
    return { success: true, display: 'todo', data: await generateSmartTodo() };
  },

  // ================= EXPENSES =================
  async get_expense_summary(args) {
    const now = new Date();
    const month = args.month || now.getMonth() + 1;
    const year = args.year || now.getFullYear();
    const query = { month, year };
    if (args.category) query.category = args.category;
    const expenses = await Expense.find(query).sort({ amount: -1 }).lean();
    const byCategory = {};
    for (const e of expenses) byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
    const total = expenses.reduce((s, e) => s + e.amount, 0);
    return { success: true, data: { month: `${month}/${year}`, total, byCategory }, message: `Expenses for ${month}/${year}: ${inr(total)}.` };
  },

  async add_expense(args, ctx) {
    const date = args.date ? new Date(args.date) : new Date();
    const expense = await Expense.create({
      category: args.category,
      amount: args.amount,
      description: args.description || args.category,
      vendorName: args.vendorName,
      date,
      month: date.getMonth() + 1,
      year: date.getFullYear(),
      createdBy: ctx.userId
    });
    return { success: true, data: { category: expense.category, amount: expense.amount, date: date.toDateString() }, message: `Recorded ${inr(expense.amount)} under ${expense.category}.` };
  },

  async get_expense_prediction() {
    return { success: true, data: await predictExpenses() };
  },

  // ================= SEARCH & COMMS =================
  async smart_search(args) {
    return { success: true, data: await convertToQuery(args.query, args.entityType) };
  },

  async generate_email(args) {
    return { success: true, data: await generateProfessionalEmail(args.type, args.recipientName, args.context) };
  },

  async generate_whatsapp_message(args) {
    return { success: true, data: await generateProfessionalWhatsApp(args.purpose, args.recipientName, args.context) };
  },

  async search_knowledge_base(args) {
    return { success: true, data: await searchKB(args.query) };
  }
};

/**
 * Execute a function call by name with given arguments.
 * context: { userId, userRole, io }
 */
export async function executeFunction(functionName, args = {}, context = {}) {
  if (!handlers[functionName]) return { success: false, message: `Unknown function: ${functionName}` };
  if (!isAllowed(context.userRole, functionName)) {
    return { success: false, message: "Sorry, that action isn't available for your account." };
  }
  try {
    return await handlers[functionName](args || {}, context);
  } catch (error) {
    console.error(`Error executing ${functionName}:`, error);
    return { success: false, message: `Something went wrong: ${error.message}` };
  }
}
