/**
 * Demo data seeder.
 * Used by `npm run seed` and automatically on first start when the database is empty.
 */

import User from '../models/User.js';
import Room from '../models/Room.js';
import Payment from '../models/Payment.js';
import Complaint from '../models/Complaint.js';
import Notice from '../models/Notice.js';
import Menu from '../models/Menu.js';
import Visitor from '../models/Visitor.js';
import Expense from '../models/Expense.js';
import MaintenanceSchedule from '../models/MaintenanceSchedule.js';
import KnowledgeBase from '../models/KnowledgeBase.js';
import DailySummary from '../models/DailySummary.js';
import ChatHistory from '../models/ChatHistory.js';
import Notification from '../models/Notification.js';
import { WEEKLY_DEFAULT_MENUS } from '../data/defaultMenus.js';
import { chunkText } from './ai/ragService.js';

// Deterministic pseudo-random so every fresh seed looks the same.
let rngState = 42;
function rand() {
  rngState = (rngState * 1664525 + 1013904223) % 4294967296;
  return rngState / 4294967296;
}
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const randInt = (min, max) => min + Math.floor(rand() * (max - min + 1));

const PG_RULES = `SmartPG Rules and Regulations

1. TIMING: Main gate closes at 10:30 PM. Late entry requires prior permission from the owner.
2. VISITORS: Visitors are allowed between 10 AM and 8 PM only. Overnight stays are not permitted. All visitors must sign the gate register.
3. NOISE: Maintain silence after 10 PM. No loud music or parties.
4. CLEANLINESS: Keep rooms clean. A weekly room inspection is done every Saturday.
5. RENT: Rent is due on the 5th of every month. A late fee of ₹500 per week applies after the due date. Rent can be paid by UPI, bank transfer or cash at the office.
6. DAMAGE: Any damage to property will be charged to the tenant responsible.
7. SMOKING: Smoking is strictly prohibited inside rooms and common areas.
8. ALCOHOL: Consumption of alcohol is not allowed on the premises.
9. FOOD: Breakfast, lunch, evening snacks and dinner are included in the rent. Outside food is allowed. The pantry kitchen can be used between 6 AM and 10 PM.
10. PARKING: Two-wheeler parking is available on the ground floor. Four-wheeler parking is available at ₹1,000 extra per month.
11. LAUNDRY: A washing machine is available on each floor. Usage is allowed between 6 AM and 9 PM.
12. NOTICE PERIOD: One month notice is required before vacating.
13. SECURITY DEPOSIT: The deposit equals one month's rent and is refunded within 15 days of vacating, subject to a damage assessment.
14. ID PROOF: A valid government ID (Aadhaar, PAN, passport or driving licence) is mandatory for all tenants.
15. ELECTRICITY: AC rooms have individual meters; AC electricity is billed separately at ₹9 per unit. Non-AC room electricity is included in rent.
16. WIFI: High-speed WiFi is available in all rooms and common areas. The password is shared at check-in and changed monthly.
17. HOUSEKEEPING: Rooms are cleaned on alternate days. Bathrooms are cleaned daily.
18. EMERGENCY: In case of fire, gas leak or medical emergency, use the AI assistant's emergency report or call the warden at 9876543210. National emergency number: 112.`;

export async function seedDatabase({ log = console.log } = {}) {
  rngState = 42;

  await Promise.all([
    User.deleteMany({}), Room.deleteMany({}), Payment.deleteMany({}),
    Complaint.deleteMany({}), Notice.deleteMany({}), Menu.deleteMany({}),
    Visitor.deleteMany({}), Expense.deleteMany({}), MaintenanceSchedule.deleteMany({}),
    KnowledgeBase.deleteMany({}), DailySummary.deleteMany({}), ChatHistory.deleteMany({}),
    Notification.deleteMany({})
  ]);

  const owner = await User.create({
    name: 'Rajesh Kumar',
    email: 'owner@smartpg.com',
    password: 'owner123',
    phone: '9876543210',
    role: 'owner',
    gender: 'male',
    age: 45
  });

  // ---------- Rooms: 3 floors × 5 rooms ----------
  const maxOcc = { single: 1, double: 2, triple: 3, dormitory: 6 };
  const layout = ['single', 'double', 'double', 'triple', 'single'];
  const roomsData = [];
  for (let floor = 1; floor <= 3; floor++) {
    for (let n = 1; n <= 5; n++) {
      const type = layout[n - 1];
      const hasAC = floor >= 2 && n <= 3;
      const base = type === 'single' ? 8000 : type === 'double' ? 6000 : 4500;
      const rent = base + (hasAC ? 1500 : 0);
      roomsData.push({
        roomNumber: `${floor}0${n}`,
        floor,
        type,
        rent,
        deposit: rent,
        hasAC,
        hasAttachedBathroom: n <= 2,
        hasBalcony: n === 5,
        hasParking: floor === 1,
        hasWifi: true,
        hasTv: n === 1,
        hasGeyser: n <= 3,
        hasCupboard: true,
        furnishing: n <= 2 ? 'fully-furnished' : 'semi-furnished',
        maxOccupants: maxOcc[type],
        genderPreference: floor <= 2 ? 'male' : 'female',
        description: `${type[0].toUpperCase() + type.slice(1)} sharing room on floor ${floor}${hasAC ? ' with AC' : ''}`
      });
    }
  }
  const rooms = await Room.insertMany(roomsData);

  // ---------- Tenants ----------
  const people = [
    { name: 'Amit Patel', email: 'amit@test.com', gender: 'male', age: 25, occupation: 'working-professional', room: '101' },
    { name: 'Vikram Singh', email: 'vikram@test.com', gender: 'male', age: 28, occupation: 'working-professional', room: '102' },
    { name: 'Rahul Gupta', email: 'rahul@test.com', gender: 'male', age: 21, occupation: 'student', room: '102' },
    { name: 'Arjun Mehta', email: 'arjun@test.com', gender: 'male', age: 23, occupation: 'student', room: '104' },
    { name: 'Suresh Babu', email: 'suresh@test.com', gender: 'male', age: 30, occupation: 'working-professional', room: '104' },
    { name: 'Karthik Rao', email: 'karthik@test.com', gender: 'male', age: 24, occupation: 'student', room: '201' },
    { name: 'Nikhil Varma', email: 'nikhil@test.com', gender: 'male', age: 26, occupation: 'working-professional', room: '202' },
    { name: 'Priya Sharma', email: 'priya@test.com', gender: 'female', age: 22, occupation: 'student', room: '301' },
    { name: 'Sneha Reddy', email: 'sneha@test.com', gender: 'female', age: 23, occupation: 'student', room: '302' },
    { name: 'Kavitha Nair', email: 'kavitha@test.com', gender: 'female', age: 24, occupation: 'working-professional', room: '302' },
    { name: 'Divya Krishnan', email: 'divya@test.com', gender: 'female', age: 26, occupation: 'working-professional', room: '303' },
    { name: 'Lakshmi Iyer', email: 'lakshmi@test.com', gender: 'female', age: 27, occupation: 'working-professional', room: '304' },
    { name: 'Meera Joshi', email: 'meera@test.com', gender: 'female', age: 22, occupation: 'student', room: '304' },
    { name: 'Ananya Das', email: 'ananya@test.com', gender: 'female', age: 21, occupation: 'student', room: '305' }
  ];

  const now = new Date();
  const roomByNumber = Object.fromEntries(rooms.map(r => [r.roomNumber, r]));
  const tenants = [];

  for (let i = 0; i < people.length; i++) {
    const p = people[i];
    const room = roomByNumber[p.room];
    const monthsAgo = randInt(3, 14);
    const tenant = await User.create({
      name: p.name,
      email: p.email,
      password: 'tenant123',
      phone: `98${String(76543210 + i * 1111).padStart(8, '0')}`,
      role: 'tenant',
      gender: p.gender,
      age: p.age,
      roomId: room._id,
      moveInDate: new Date(now.getFullYear(), now.getMonth() - monthsAgo, randInt(1, 28)),
      isActive: true,
      idVerified: rand() > 0.25,
      preferences: {
        budget: { min: 4000, max: 10000 },
        foodPreference: pick(['veg', 'non-veg', 'any']),
        acPreference: room.hasAC,
        smokingPreference: pick(['non-smoker', 'non-smoker', 'no-preference']),
        studyPreference: pick(['quiet', 'moderate', 'no-preference']),
        noisePreference: pick(['silent', 'moderate', 'no-preference']),
        occupation: p.occupation,
        sleepTiming: pick(['early-sleeper', 'night-owl', 'flexible']),
        language: [pick(['English', 'Hindi', 'Telugu', 'Tamil', 'Kannada'])],
        cleanlinessLevel: randInt(2, 5),
        interests: pick([['reading', 'coding'], ['gaming', 'music'], ['sports', 'movies'], ['cooking', 'yoga']])
      }
    });
    tenants.push(tenant);
    room.currentOccupants.push(tenant._id);
  }
  // save() runs the status hook so occupancy/status are correct
  for (const room of rooms) await room.save();

  // ---------- Payments: last 6 months ----------
  // A few tenants are habitual late payers so predictions & risk have signal.
  const latePayers = new Set(['rahul@test.com', 'suresh@test.com', 'meera@test.com']);
  const paymentsData = [];
  for (let offset = 5; offset >= 0; offset--) {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    const dueDate = new Date(year, month - 1, 5);

    for (const tenant of tenants) {
      if (tenant.moveInDate > new Date(year, month, 0)) continue;
      const room = rooms.find(r => r._id.equals(tenant.roomId));
      const habitualLate = latePayers.has(tenant.email);

      let status = 'paid';
      if (offset === 0) {
        const r = rand();
        status = habitualLate || r < 0.2 ? (now > dueDate ? 'overdue' : 'pending') : 'paid';
      }
      const daysLate = status === 'paid' ? (habitualLate ? randInt(3, 15) : (rand() < 0.15 ? randInt(1, 4) : 0)) : 0;
      const paidDate = status === 'paid' ? new Date(year, month - 1, 5 + daysLate - (daysLate === 0 ? randInt(0, 4) : 0)) : null;

      paymentsData.push({
        tenant: tenant._id,
        room: room._id,
        amount: room.rent,
        dueDate,
        paidDate,
        status,
        method: status === 'paid' ? pick(['upi', 'upi', 'bank-transfer', 'cash']) : 'upi',
        daysLate,
        lateFee: daysLate > 7 ? 500 : 0,
        month,
        year,
        transactionId: status === 'paid' ? `TXN${year}${month}${randInt(100000, 999999)}` : undefined
      });
    }
  }
  await Payment.insertMany(paymentsData);

  // Payment behaviour derived from the real history
  for (const tenant of tenants) {
    const mine = paymentsData.filter(p => p.tenant.equals(tenant._id) && p.status === 'paid');
    const late = mine.filter(p => p.daysLate > 0);
    const avg = late.length ? late.reduce((s, p) => s + p.daysLate, 0) / mine.length : 0;
    const lateProbability = Math.min(95, Math.round((late.length / Math.max(1, mine.length)) * 100));
    tenant.paymentBehavior = {
      averageDaysLate: Math.round(avg * 10) / 10,
      latePaymentCount: late.length,
      earlyPaymentCount: mine.filter(p => p.paidDate && p.paidDate < p.dueDate).length,
      onTimePaymentCount: mine.length - late.length,
      lateProbability
    };
    if (latePayers.has(tenant.email)) {
      tenant.violationScore = randInt(25, 55);
      tenant.violations = [{ type: 'late-payment', description: 'Repeated late rent payments', date: new Date(), severity: 'medium' }];
    }
    await tenant.save();
  }

  // ---------- Complaints ----------
  const complaintTexts = [
    { desc: 'My ceiling fan stopped working since morning', cat: 'electrical', pri: 'medium', sent: 'angry', score: 6, staff: 'Electrician', eta: '4 Hours', status: 'open', days: 0 },
    { desc: 'WiFi is very slow, cannot attend online classes', cat: 'wifi-internet', pri: 'high', sent: 'angry', score: 7, staff: 'IT Support', eta: '2 Hours', status: 'in-progress', days: 1 },
    { desc: 'Water leaking from bathroom tap all night', cat: 'plumbing', pri: 'medium', sent: 'neutral', score: 5, staff: 'Plumber', eta: '3 Hours', status: 'open', days: 1 },
    { desc: 'AC not cooling properly, room is very hot', cat: 'ac-cooling', pri: 'high', sent: 'angry', score: 7, staff: 'AC Technician', eta: '1 Day', status: 'open', days: 2 },
    { desc: 'Cockroaches seen in the pantry area', cat: 'pest-control', pri: 'high', sent: 'angry', score: 7, staff: 'Pest Control', eta: '2 Days', status: 'in-progress', days: 3 },
    { desc: 'Room needs cleaning, surfaces are dusty', cat: 'cleaning', pri: 'low', sent: 'neutral', score: 3, staff: 'Housekeeping', eta: '4 Hours', status: 'resolved', days: 5 },
    { desc: 'Cupboard door hinge is broken', cat: 'furniture', pri: 'low', sent: 'neutral', score: 3, staff: 'Carpenter', eta: '1 Day', status: 'resolved', days: 8 },
    { desc: 'No hot water in the geyser this morning', cat: 'electrical', pri: 'medium', sent: 'angry', score: 6, staff: 'Electrician', eta: '4 Hours', status: 'resolved', days: 12 },
    { desc: 'Loud noise from the next room after midnight', cat: 'noise', pri: 'low', sent: 'neutral', score: 4, staff: 'Warden', eta: '1 Day', status: 'closed', days: 20 },
    { desc: 'Dinner was cold yesterday and rice was undercooked', cat: 'food', pri: 'medium', sent: 'angry', score: 5, staff: 'Kitchen Manager', eta: '1 Day', status: 'resolved', days: 25 },
    { desc: 'Bathroom drain is blocked', cat: 'plumbing', pri: 'medium', sent: 'neutral', score: 5, staff: 'Plumber', eta: '3 Hours', status: 'resolved', days: 40 },
    { desc: 'AC making loud rattling noise', cat: 'ac-cooling', pri: 'medium', sent: 'neutral', score: 5, staff: 'AC Technician', eta: '1 Day', status: 'resolved', days: 60 }
  ];
  const emojis = { happy: '😊', neutral: '😐', angry: '😠', emergency: '🚨' };
  await Complaint.insertMany(complaintTexts.map((c, i) => {
    const tenant = tenants[(i * 3) % tenants.length];
    const created = new Date(now.getTime() - c.days * 86400000 - randInt(1, 8) * 3600000);
    return {
      tenant: tenant._id,
      room: tenant.roomId,
      description: c.desc,
      aiCategory: c.cat,
      aiPriority: c.pri,
      aiEstimatedTime: c.eta,
      aiSuggestedStaff: c.staff,
      aiGeneratedReply: `Sorry about the trouble, ${tenant.name.split(' ')[0]}. We've logged this as a ${c.cat.replace('-', ' ')} issue and a ${c.staff.toLowerCase()} will attend to it within ${c.eta.toLowerCase()}.`,
      aiSentiment: c.sent,
      sentimentEmoji: emojis[c.sent],
      urgencyScore: c.score,
      status: c.status,
      assignedTo: c.status !== 'open' ? c.staff : undefined,
      resolvedDate: ['resolved', 'closed'].includes(c.status) ? new Date(created.getTime() + 86400000) : undefined,
      createdAt: created,
      updatedAt: created
    };
  }));

  // ---------- Weekly menu ----------
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  await Menu.insertMany(days.map((day, i) => ({
    ...WEEKLY_DEFAULT_MENUS[day],
    date: new Date(monday.getTime() + i * 86400000),
    dayOfWeek: day,
    createdBy: owner._id
  })));

  // ---------- Notices ----------
  const daysAgo = (n) => new Date(now.getTime() - n * 86400000);
  await Notice.insertMany([
    {
      title: 'Water Supply Maintenance — Sunday 10 AM to 2 PM',
      content: 'Dear residents,\n\nThe overhead water tank will be cleaned this Sunday between 10 AM and 2 PM. Water supply will be unavailable during this time, so please store enough water in advance.\n\nThank you for your cooperation.\n— Management',
      originalInput: 'water problem sunday 10 to 2 tank cleaning',
      aiGenerated: true,
      translations: {
        en: 'The overhead water tank will be cleaned this Sunday between 10 AM and 2 PM. Please store enough water in advance.',
        hi: 'इस रविवार सुबह 10 बजे से दोपहर 2 बजे तक पानी की टंकी की सफाई होगी। कृपया पहले से पर्याप्त पानी जमा कर लें।',
        te: 'ఈ ఆదివారం ఉదయం 10 నుండి మధ్యాహ్నం 2 వరకు నీటి ట్యాంక్ శుభ్రం చేయబడుతుంది. దయచేసి ముందుగానే తగినంత నీరు నిల్వ చేసుకోండి.'
      },
      priority: 'high',
      category: 'maintenance',
      createdBy: owner._id,
      createdAt: daysAgo(1)
    },
    {
      title: 'Monthly Rent Reminder',
      content: 'A friendly reminder that rent for this month is due on the 5th. Pay via UPI, bank transfer or cash at the office. A late fee of ₹500 per week applies after the due date.',
      aiGenerated: true,
      translations: { en: 'Rent is due on the 5th. A late fee of ₹500 per week applies after the due date.' },
      priority: 'medium',
      category: 'payment',
      createdBy: owner._id,
      createdAt: daysAgo(4)
    },
    {
      title: 'Diwali Celebration on the Terrace 🪔',
      content: 'Join us for a Diwali get-together on the terrace this Saturday at 7 PM — sweets, rangoli and a special dinner. Everyone is welcome!',
      aiGenerated: true,
      priority: 'low',
      category: 'event',
      createdBy: owner._id,
      createdAt: daysAgo(6)
    }
  ]);

  // ---------- Expenses: last 6 months ----------
  // Roughly 70% of rent goes to running costs — a typical PG margin.
  const expenseBase = {
    food: [30000, 4000, 'Sri Balaji Provisions'],
    electricity: [9000, 2500, 'BESCOM'],
    water: [2000, 600, 'Water Tanker Services'],
    gas: [3200, 500, 'Indane Gas'],
    maintenance: [2500, 2500, 'Ravi Repairs'],
    salary: [16000, 0, 'Staff payroll'],
    internet: [1800, 0, 'ACT Fibernet'],
    cleaning: [2500, 500, 'CleanPro Services']
  };
  const expensesData = [];
  for (let offset = 5; offset >= 0; offset--) {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    for (const [category, [base, spread, vendor]] of Object.entries(expenseBase)) {
      expensesData.push({
        category,
        amount: base + (spread ? randInt(0, spread) : 0),
        date: new Date(year, month - 1, Math.min(randInt(3, 25), offset === 0 ? Math.max(1, now.getDate()) : 28)),
        description: `${category[0].toUpperCase() + category.slice(1)} — ${d.toLocaleString('en-IN', { month: 'long' })}`,
        vendorName: vendor,
        month,
        year,
        isRecurring: ['salary', 'internet', 'electricity'].includes(category),
        recurringFrequency: 'monthly',
        createdBy: owner._id
      });
    }
  }
  await Expense.insertMany(expensesData);

  // ---------- Maintenance ----------
  const inDays = (n) => new Date(now.getTime() + n * 86400000);
  await MaintenanceSchedule.insertMany([
    { type: 'ac-service', description: 'Quarterly AC servicing — floor 2 & 3', scheduledDate: inDays(3), status: 'scheduled', assignedTo: 'CoolAir Services', assignedContact: '9845012345', estimatedCost: 6000, priority: 'medium', createdBy: owner._id },
    { type: 'pest-control', description: 'Pantry and common area pest control', scheduledDate: inDays(1), status: 'scheduled', assignedTo: 'PestFree India', estimatedCost: 3500, priority: 'high', createdBy: owner._id },
    { type: 'water-tank', description: 'Overhead tank cleaning', scheduledDate: inDays(5), status: 'scheduled', assignedTo: 'Tank Clean Co.', estimatedCost: 2500, priority: 'medium', createdBy: owner._id },
    { type: 'plumbing', description: 'Fix leaking tap in Room 102', roomNumber: '102', room: roomByNumber['102']._id, scheduledDate: inDays(0), status: 'in-progress', assignedTo: 'Ravi (Plumber)', estimatedCost: 600, priority: 'medium', createdBy: owner._id },
    { type: 'electrical', description: 'Geyser element replaced — Room 201', roomNumber: '201', room: roomByNumber['201']._id, scheduledDate: inDays(-12), completedDate: inDays(-11), status: 'completed', assignedTo: 'Suresh (Electrician)', estimatedCost: 1200, actualCost: 1100, priority: 'medium', createdBy: owner._id },
    { type: 'generator', description: 'Generator oil change & load test', scheduledDate: inDays(-30), completedDate: inDays(-30), status: 'completed', assignedTo: 'PowerGen Services', estimatedCost: 4000, actualCost: 3800, priority: 'low', createdBy: owner._id }
  ]);

  // ---------- Visitors ----------
  const at = (dayOffset, hour) => {
    const d = new Date(now);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hour, randInt(0, 59), 0, 0);
    return d;
  };
  const priya = tenants.find(t => t.email === 'priya@test.com');
  const amit = tenants.find(t => t.email === 'amit@test.com');
  await Visitor.insertMany([
    { name: 'Ramesh Verma', phone: '9988776655', purpose: 'Room enquiry for daughter', checkIn: at(0, 11), status: 'approved', numberOfGuests: 2 },
    { name: 'Sunita Sharma', phone: '9877665544', purpose: 'Meeting daughter', tenantVisiting: priya._id, roomVisiting: '301', checkIn: at(0, 15), status: 'approved', numberOfGuests: 1, idProofType: 'aadhaar' },
    { name: 'Deepak Patel', phone: '9123456780', purpose: 'Dropping documents', tenantVisiting: amit._id, roomVisiting: '101', checkIn: at(0, 17), status: 'pending', numberOfGuests: 1 },
    { name: 'Courier — Amazon', phone: '9000011111', purpose: 'Parcel delivery', checkIn: at(-1, 13), checkOut: at(-1, 13), status: 'checked-out', numberOfGuests: 1 }
  ]);

  // ---------- Knowledge base ----------
  await KnowledgeBase.create({
    documentName: 'PG Rules and Regulations',
    category: 'pg-rules',
    originalContent: PG_RULES,
    chunks: chunkText(PG_RULES, 400).map((content, chunkIndex) => ({ content, chunkIndex, embedding: [] })),
    uploadedBy: owner._id,
    wordCount: PG_RULES.split(/\s+/).length
  });

  log(`🌱 Demo data ready: ${rooms.length} rooms, ${tenants.length} tenants, ${paymentsData.length} payments, ${expensesData.length} expenses`);
  log('   Owner login:  owner@smartpg.com / owner123');
  log('   Tenant login: priya@test.com / tenant123 (any tenant email works with tenant123)');
}

/**
 * Seed only when the database has no users (first run).
 */
export async function seedIfEmpty() {
  const count = await User.estimatedDocumentCount();
  if (count === 0) {
    console.log('🌱 Empty database detected — loading demo data…');
    await seedDatabase();
  }
}
