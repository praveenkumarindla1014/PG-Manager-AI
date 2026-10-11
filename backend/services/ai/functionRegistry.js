/**
 * Function Registry
 *
 * Tool definitions the AI assistant can call. Each role gets its own toolset;
 * the executor additionally enforces permissions, so a tenant can never act
 * on someone else's data even if the model tries.
 */

const fn = (name, description, properties = {}, required = []) => ({
  name,
  description,
  parameters: { type: 'object', properties, ...(required.length ? { required } : {}) }
});

const ROOM_TYPES = ['single', 'double', 'triple', 'dormitory'];
const COMPLAINT_CATEGORIES = ['electrical', 'plumbing', 'furniture', 'cleaning', 'pest-control', 'wifi-internet', 'ac-cooling', 'water-supply', 'security', 'noise', 'food', 'other'];
const MAINTENANCE_TYPES = ['ac-service', 'plumbing', 'electrical', 'pest-control', 'cleaning', 'painting', 'water-tank', 'generator', 'elevator', 'general'];
const EXPENSE_CATEGORIES = ['food', 'electricity', 'water', 'gas', 'maintenance', 'salary', 'rent-building', 'internet', 'cleaning', 'pest-control', 'equipment', 'miscellaneous'];
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'today', 'tomorrow'];

// ---------------- Rooms ----------------
const searchRooms = fn('search_rooms',
  'Find rooms with free beds matching criteria (budget, sharing type, floor, AC, bathroom, gender). Use for any "I need a room…" or "rooms under ₹X" question.',
  {
    maxRent: { type: 'number', description: 'Maximum monthly rent per bed in INR' },
    minRent: { type: 'number', description: 'Minimum monthly rent in INR' },
    type: { type: 'string', enum: ROOM_TYPES, description: 'Sharing type' },
    floor: { type: 'number', description: 'Floor number' },
    hasAC: { type: 'boolean' },
    hasAttachedBathroom: { type: 'boolean' },
    hasParking: { type: 'boolean' },
    hasBalcony: { type: 'boolean' },
    genderPreference: { type: 'string', enum: ['male', 'female'] }
  });

const getEmptyRooms = fn('get_empty_rooms',
  'List vacancy: completely empty rooms and rooms with free beds. Use for "how many rooms are empty / vacant beds".',
  { floor: { type: 'number', description: 'Optional floor filter' } });

const getRoomDetails = fn('get_room_details',
  'Get full details of one room by room number, including who lives there.',
  { roomNumber: { type: 'string' } }, ['roomNumber']);

const getAutoRoomMatch = fn('get_auto_room_match',
  'Recommend the best rooms for a prospective tenant based on their preferences.',
  {
    budget: { type: 'number', description: 'Maximum budget in INR' },
    gender: { type: 'string', enum: ['male', 'female', 'other'] },
    acPreference: { type: 'boolean' },
    occupation: { type: 'string', enum: ['student', 'working-professional', 'other'] },
    parkingNeeded: { type: 'boolean' }
  });

const getFacilities = fn('get_facilities', 'Summarise facilities and amenities available in the PG (AC rooms, WiFi, parking, food, laundry…).');

// ---------------- Dashboard & finance ----------------
const getDashboardStats = fn('get_dashboard_stats',
  "Live snapshot of the PG today: bed occupancy, this month's rent collected/pending, expenses, profit, open complaints, visitors, upcoming maintenance. Use for 'how is my PG doing', 'today's summary', 'dashboard'.");

const getIncomeReport = fn('get_income_report',
  'Income / rent collection report for a period.',
  {
    period: { type: 'string', enum: ['today', 'this-week', 'this-month', 'last-month', 'specific-month'] },
    month: { type: 'number', description: '1-12, when period is specific-month' },
    year: { type: 'number' }
  });

const getUnpaidTenants = fn('get_unpaid_tenants',
  'List tenants who have not paid rent (pending or overdue) for a month. Defaults to the current month.',
  { month: { type: 'number' }, year: { type: 'number' } });

const recordPayment = fn('record_payment',
  "Mark a tenant's rent as PAID (owner only). Use when the owner says e.g. 'Priya paid rent by UPI' or 'record ₹6000 cash from room 102'. Identify the tenant by name or room number.",
  {
    tenantName: { type: 'string', description: 'Tenant name (partial match OK)' },
    roomNumber: { type: 'string', description: 'Room number, if the name is ambiguous or not given' },
    amount: { type: 'number', description: 'Amount in INR; defaults to the pending rent' },
    method: { type: 'string', enum: ['cash', 'upi', 'bank-transfer', 'card', 'other'] },
    transactionId: { type: 'string' }
  });

const sendRentReminders = fn('send_rent_reminders',
  'Prepare personalised, polite rent-reminder WhatsApp messages (with one-tap WhatsApp links) for every tenant with unpaid rent this month, and notify them in the app.',
  { tone: { type: 'string', enum: ['friendly', 'firm'], description: 'Default friendly' } });

const getRentStatus = fn('get_rent_status',
  "Rent status and recent payment history. For a tenant this is always their own; an owner can pass a tenant name.",
  { tenantName: { type: 'string', description: 'Owner only: which tenant' } });

const getPaymentInfo = fn('get_payment_info', 'How to pay rent: UPI ID, bank details, due date and late-fee policy.');

const getRentPrediction = fn('get_rent_prediction', 'Predict which tenants are likely to pay late next month, based on payment history.');

// ---------------- Complaints ----------------
const createComplaint = fn('create_complaint',
  "Register a complaint / maintenance issue (AC not working, water leak, WiFi slow, food issue, emergency…). The AI auto-categorises and prioritises it. Use whenever a user reports a problem.",
  {
    description: { type: 'string', description: 'The problem in the user\'s words' },
    roomNumber: { type: 'string', description: 'Optional; defaults to the reporter\'s room' }
  }, ['description']);

const getPendingComplaints = fn('get_pending_complaints',
  'List open / in-progress complaints, most urgent first.',
  {
    category: { type: 'string', enum: COMPLAINT_CATEGORIES },
    floor: { type: 'number' },
    status: { type: 'string', enum: ['open', 'in-progress', 'resolved', 'closed'] }
  });

const getMyComplaints = fn('get_complaints_by_tenant',
  "A tenant's complaints and their status. For tenants this is always their own.",
  { tenantName: { type: 'string', description: 'Owner only' } });

const updateComplaintStatus = fn('update_complaint_status',
  "Owner: change a complaint's status (e.g. mark resolved), assign staff, or reply. Identify by complaintId (from a previous listing) or by room number + keyword.",
  {
    complaintId: { type: 'string' },
    roomNumber: { type: 'string' },
    keyword: { type: 'string', description: 'Word from the complaint text, e.g. "fan", "wifi"' },
    status: { type: 'string', enum: ['open', 'in-progress', 'resolved', 'closed'] },
    assignedTo: { type: 'string' },
    ownerResponse: { type: 'string', description: 'Message to show the tenant' }
  });

// ---------------- People ----------------
const findTenant = fn('find_tenant',
  'Look up tenants by name, room number or phone: contact, room, rent status, move-in date, risk.',
  { query: { type: 'string', description: 'Name, room number or phone' } }, ['query']);

const getRoommateInfo = fn('get_roommate_info', "The current user's room and roommates.");

const getRoommateMatch = fn('get_roommate_match',
  'Find compatible roommates for a tenant based on lifestyle (sleep timing, cleanliness, interests).',
  {
    tenantName: { type: 'string', description: 'Owner only; defaults to current user' },
    sleepTiming: { type: 'string', enum: ['early-sleeper', 'night-owl', 'flexible'] },
    smokingPreference: { type: 'string', enum: ['smoker', 'non-smoker', 'no-preference'] },
    cleanlinessLevel: { type: 'number' },
    interests: { type: 'string', description: 'Comma-separated' }
  });

const getRiskyTenants = fn('get_risky_tenants', 'Tenants with rule violations or poor payment behaviour.');

// ---------------- Visitors ----------------
const getTodayVisitors = fn('get_today_visitors', "Visitors who checked in on a date (default today), and any awaiting approval.",
  { date: { type: 'string', description: 'YYYY-MM-DD' } });

const logVisitor = fn('log_visitor',
  'Record a visitor at the gate. Tenants can pre-register their own guests.',
  {
    name: { type: 'string' },
    phone: { type: 'string' },
    purpose: { type: 'string' },
    tenantName: { type: 'string', description: 'Whom they are visiting' },
    numberOfGuests: { type: 'number' }
  }, ['name', 'purpose']);

const updateVisitor = fn('update_visitor',
  'Owner: approve, reject or check out a visitor by name.',
  {
    visitorName: { type: 'string' },
    action: { type: 'string', enum: ['approve', 'reject', 'check-out'] }
  }, ['visitorName', 'action']);

// ---------------- Notices ----------------
const generateNotice = fn('generate_notice',
  'Owner: turn rough text into a professional notice (auto-translated to Hindi, Telugu, Tamil, Kannada), publish it and notify all tenants. E.g. "water problem tomorrow 10 to 2".',
  {
    rawInput: { type: 'string' },
    priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
    category: { type: 'string', enum: ['general', 'maintenance', 'payment', 'event', 'rule', 'emergency'] }
  }, ['rawInput']);

const getNotices = fn('get_notices', 'Latest notices / announcements.',
  { category: { type: 'string', enum: ['general', 'maintenance', 'payment', 'event', 'rule', 'emergency'] }, limit: { type: 'number' } });

// ---------------- Food ----------------
const getMenu = fn('get_menu', "The food menu for a day (default today) with nutrition. Use for 'what's for dinner', 'tomorrow's breakfast'.",
  {
    day: { type: 'string', enum: DAYS },
    meal: { type: 'string', enum: ['breakfast', 'lunch', 'snacks', 'dinner'] }
  });

const getFoodRecommendation = fn('get_food_recommendation',
  "Personalised food advice from this week's menu for a dietary goal (high protein, weight loss, diabetic…).",
  { dietaryNeed: { type: 'string' }, restrictions: { type: 'string' } }, ['dietaryNeed']);

// ---------------- Maintenance ----------------
const scheduleMaintenance = fn('schedule_maintenance',
  'Owner: schedule a maintenance task (AC service, pest control, plumbing…). Convert relative dates like "next Monday" to YYYY-MM-DD.',
  {
    type: { type: 'string', enum: MAINTENANCE_TYPES },
    description: { type: 'string' },
    scheduledDate: { type: 'string', description: 'YYYY-MM-DD' },
    roomNumber: { type: 'string' },
    assignedTo: { type: 'string' },
    estimatedCost: { type: 'number' }
  }, ['type', 'description', 'scheduledDate']);

const getMaintenancePredictions = fn('get_maintenance_predictions', 'Predict upcoming equipment failures / maintenance needs from complaint history.',
  { type: { type: 'string' } });

// ---------------- Reports & insights ----------------
const generateMonthlyReport = fn('generate_monthly_report', 'Full monthly business report: income, expenses, profit, occupancy, complaints, late payments.',
  { month: { type: 'number' }, year: { type: 'number' } });

const getBusinessInsights = fn('get_business_insights', 'AI business insights and recommendations for growing the PG.');
const getOccupancyPrediction = fn('get_occupancy_prediction', 'Forecast occupancy for the coming month.');
const getRevenueOptimization = fn('get_revenue_optimization', 'Suggestions to increase revenue: rent adjustments, underpriced rooms, vacancy fills.');
const getSmartTodoList = fn('get_smart_todo_list', "Prioritised to-do list for the owner today (collect rent, fix urgent complaints, approve visitors…).");

// ---------------- Expenses ----------------
const getExpenseSummary = fn('get_expense_summary', 'Expenses for a month grouped by category.',
  { month: { type: 'number' }, year: { type: 'number' }, category: { type: 'string', enum: EXPENSE_CATEGORIES } });

const addExpense = fn('add_expense', 'Owner: record an expense, e.g. "paid ₹3500 electricity bill" or "bought groceries for 12000".',
  {
    category: { type: 'string', enum: EXPENSE_CATEGORIES },
    amount: { type: 'number' },
    description: { type: 'string' },
    vendorName: { type: 'string' },
    date: { type: 'string', description: 'YYYY-MM-DD, default today' }
  }, ['category', 'amount']);

const getExpensePrediction = fn('get_expense_prediction', "Predict next month's expenses by category.");

// ---------------- Search & comms ----------------
const smartSearch = fn('smart_search',
  'Answer complex data questions not covered by other tools, e.g. "female tenants who paid late twice", "rooms on floor 2 with AC and free beds".',
  {
    query: { type: 'string' },
    entityType: { type: 'string', enum: ['tenants', 'rooms', 'payments', 'complaints'] }
  }, ['query']);

const generateEmail = fn('generate_email', 'Draft a professional email (welcome, rent reminder, move-out, complaint response, notice, custom).',
  {
    type: { type: 'string', enum: ['welcome', 'rent-reminder', 'move-out', 'complaint-response', 'notice', 'custom'] },
    recipientName: { type: 'string' },
    context: { type: 'string' }
  }, ['type']);

const generateWhatsAppMessage = fn('generate_whatsapp_message', 'Draft a short, friendly WhatsApp message for any purpose.',
  { purpose: { type: 'string' }, recipientName: { type: 'string' }, context: { type: 'string' } }, ['purpose']);

const searchKnowledgeBase = fn('search_knowledge_base',
  'Answer questions about PG rules and policies (gate timing, visitors, deposit, notice period, late fee, laundry, parking, smoking…) from the uploaded documents.',
  { query: { type: 'string' } }, ['query']);

// ---------------- Role toolsets ----------------
export const tenantFunctions = [
  searchRooms, getEmptyRooms, getRoomDetails, getFacilities,
  getRentStatus, getPaymentInfo,
  createComplaint, getMyComplaints,
  getNotices, getMenu, getFoodRecommendation,
  getRoommateInfo, getRoommateMatch,
  logVisitor,
  searchKnowledgeBase
];

export const ownerFunctions = [
  getDashboardStats,
  searchRooms, getEmptyRooms, getRoomDetails, getAutoRoomMatch, getFacilities,
  getIncomeReport, getUnpaidTenants, recordPayment, sendRentReminders, getRentStatus, getPaymentInfo, getRentPrediction,
  createComplaint, getPendingComplaints, getMyComplaints, updateComplaintStatus,
  findTenant, getRoommateInfo, getRoommateMatch, getRiskyTenants,
  getTodayVisitors, logVisitor, updateVisitor,
  generateNotice, getNotices,
  getMenu, getFoodRecommendation,
  scheduleMaintenance, getMaintenancePredictions,
  generateMonthlyReport, getBusinessInsights, getOccupancyPrediction, getRevenueOptimization, getSmartTodoList,
  getExpenseSummary, addExpense, getExpensePrediction,
  smartSearch, generateEmail, generateWhatsAppMessage,
  searchKnowledgeBase
];

export const visitorFunctions = [searchRooms, getEmptyRooms, getRoomDetails, getFacilities, getNotices, searchKnowledgeBase];

export function getFunctionsByRole(role) {
  if (role === 'owner') return ownerFunctions;
  if (role === 'tenant') return tenantFunctions;
  return visitorFunctions;
}

export function isAllowed(role, name) {
  return getFunctionsByRole(role).some(f => f.name === name);
}
