/**
 * AI Function Registry
 * 
 * Central registry of all OpenAI function definitions.
 * These define what the AI can DO — not just what it can say.
 * Each function maps to a real backend action.
 */

// ==========================================
// ROOM FUNCTIONS
// ==========================================
const searchRooms = {
  name: 'search_rooms',
  description: 'Search for rooms based on various criteria like price, type, floor, amenities. Use this when someone asks about available rooms, needs a room, or searches with specific requirements.',
  parameters: {
    type: 'object',
    properties: {
      maxRent: { type: 'number', description: 'Maximum rent budget in INR' },
      minRent: { type: 'number', description: 'Minimum rent in INR' },
      type: { type: 'string', enum: ['single', 'double', 'triple', 'dormitory'], description: 'Room sharing type' },
      floor: { type: 'number', description: 'Floor number' },
      hasAC: { type: 'boolean', description: 'Whether room should have AC' },
      hasParking: { type: 'boolean', description: 'Whether parking is needed' },
      hasAttachedBathroom: { type: 'boolean', description: 'Whether attached bathroom is needed' },
      hasWifi: { type: 'boolean', description: 'Whether WiFi is needed' },
      status: { type: 'string', enum: ['available', 'partially-occupied'], description: 'Room availability status' },
      genderPreference: { type: 'string', enum: ['male', 'female', 'any'], description: 'Gender preference for the room' },
      furnishing: { type: 'string', enum: ['fully-furnished', 'semi-furnished', 'unfurnished'], description: 'Furnishing level' }
    }
  }
};

const getEmptyRooms = {
  name: 'get_empty_rooms',
  description: 'Get all empty/available rooms. Use when someone asks "how many rooms are empty" or "show vacant rooms".',
  parameters: {
    type: 'object',
    properties: {
      floor: { type: 'number', description: 'Filter by specific floor' }
    }
  }
};

const getRoomDetails = {
  name: 'get_room_details',
  description: 'Get details of a specific room by room number.',
  parameters: {
    type: 'object',
    properties: {
      roomNumber: { type: 'string', description: 'The room number to look up' }
    },
    required: ['roomNumber']
  }
};

const getAutoRoomMatch = {
  name: 'get_auto_room_match',
  description: 'AI recommends the best room for a tenant based on their preferences like budget, gender, AC preference, etc.',
  parameters: {
    type: 'object',
    properties: {
      budget: { type: 'number', description: 'Maximum budget in INR' },
      gender: { type: 'string', enum: ['male', 'female', 'other'] },
      acPreference: { type: 'boolean', description: 'Whether AC is preferred' },
      foodPreference: { type: 'string', enum: ['veg', 'non-veg', 'vegan', 'any'] },
      smokingPreference: { type: 'string', enum: ['smoker', 'non-smoker', 'no-preference'] },
      occupation: { type: 'string', enum: ['student', 'working-professional', 'other'] },
      noisePreference: { type: 'string', enum: ['silent', 'moderate', 'loud', 'no-preference'] },
      parkingNeeded: { type: 'boolean' }
    }
  }
};

// ==========================================
// PAYMENT FUNCTIONS
// ==========================================
const getIncomeReport = {
  name: 'get_income_report',
  description: 'Get income information for a specific period. Use when someone asks about income, revenue, earnings, or money collected.',
  parameters: {
    type: 'object',
    properties: {
      month: { type: 'number', description: 'Month number (1-12)' },
      year: { type: 'number', description: 'Year' },
      period: { type: 'string', enum: ['today', 'this-week', 'this-month', 'last-month', 'this-year'], description: 'Predefined period' }
    }
  }
};

const getUnpaidTenants = {
  name: 'get_unpaid_tenants',
  description: 'Get list of tenants who have not paid rent. Use when someone asks "who has not paid" or "pending rent" or "unpaid tenants".',
  parameters: {
    type: 'object',
    properties: {
      month: { type: 'number', description: 'Month to check' },
      year: { type: 'number', description: 'Year to check' }
    }
  }
};

const getRentStatus = {
  name: 'get_rent_status',
  description: 'Get rent payment status for a specific tenant. Use when a tenant asks "how much rent is due" or "when is my payment date".',
  parameters: {
    type: 'object',
    properties: {
      tenantId: { type: 'string', description: 'The tenant ID (use current user ID if tenant is asking about themselves)' }
    }
  }
};

const processPayment = {
  name: 'process_payment',
  description: 'Process a rent payment. Use when someone says "pay my rent" or "record payment".',
  parameters: {
    type: 'object',
    properties: {
      tenantId: { type: 'string', description: 'Tenant making the payment' },
      amount: { type: 'number', description: 'Payment amount in INR' },
      method: { type: 'string', enum: ['cash', 'upi', 'bank-transfer', 'card'], description: 'Payment method' }
    },
    required: ['amount', 'method']
  }
};

const getRentPrediction = {
  name: 'get_rent_prediction',
  description: 'Predict which tenants may pay late, who usually pays early, and late payment probabilities.',
  parameters: {
    type: 'object',
    properties: {}
  }
};

// ==========================================
// COMPLAINT FUNCTIONS
// ==========================================
const createComplaint = {
  name: 'create_complaint',
  description: 'Create/raise a new complaint. Use when someone says "raise complaint", "report issue", "my fan is broken", etc. AI will auto-analyze the complaint.',
  parameters: {
    type: 'object',
    properties: {
      description: { type: 'string', description: 'Description of the complaint/issue' },
      roomNumber: { type: 'string', description: 'Room number where the issue is' }
    },
    required: ['description']
  }
};

const getPendingComplaints = {
  name: 'get_pending_complaints',
  description: 'Get all pending/open complaints. Use when someone asks "which complaints are pending" or "open issues".',
  parameters: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: ['open', 'in-progress', 'resolved', 'closed'] },
      floor: { type: 'number', description: 'Filter by floor' },
      category: { type: 'string', description: 'Filter by complaint category' }
    }
  }
};

const getComplaintsByTenant = {
  name: 'get_complaints_by_tenant',
  description: 'Get complaints filed by a specific tenant.',
  parameters: {
    type: 'object',
    properties: {
      tenantId: { type: 'string', description: 'Tenant ID' }
    }
  }
};

// ==========================================
// VISITOR FUNCTIONS
// ==========================================
const getTodayVisitors = {
  name: 'get_today_visitors',
  description: 'Get list of visitors for today. Use when someone asks "show today visitors" or "who visited today".',
  parameters: {
    type: 'object',
    properties: {
      date: { type: 'string', description: 'Specific date in YYYY-MM-DD format. Defaults to today.' }
    }
  }
};

// ==========================================
// NOTICE FUNCTIONS
// ==========================================
const generateNotice = {
  name: 'generate_notice',
  description: 'Generate a professional notice from rough input. AI creates the notice and translates it. Use when owner says "create notice about..." or "notify tenants about...".',
  parameters: {
    type: 'object',
    properties: {
      rawInput: { type: 'string', description: 'The rough text from the owner about what the notice should say' },
      priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], description: 'Notice priority' },
      category: { type: 'string', enum: ['general', 'maintenance', 'payment', 'event', 'rule', 'emergency'] }
    },
    required: ['rawInput']
  }
};

const getNotices = {
  name: 'get_notices',
  description: 'Get active notices. Use when tenant asks "show notices" or "any announcements".',
  parameters: {
    type: 'object',
    properties: {
      category: { type: 'string' },
      limit: { type: 'number', description: 'Number of notices to return' }
    }
  }
};

// ==========================================
// MENU FUNCTIONS
// ==========================================
const getMenu = {
  name: 'get_menu',
  description: 'Get food menu for a specific date. Use when someone asks "show menu", "what is for lunch", "today food".',
  parameters: {
    type: 'object',
    properties: {
      date: { type: 'string', description: 'Date in YYYY-MM-DD format. Defaults to today.' },
      meal: { type: 'string', enum: ['breakfast', 'lunch', 'snacks', 'dinner'], description: 'Specific meal to show' }
    }
  }
};

const getFoodRecommendation = {
  name: 'get_food_recommendation',
  description: 'Get food recommendations based on dietary needs. Use when someone says "need high protein" or "suggest healthy food".',
  parameters: {
    type: 'object',
    properties: {
      dietaryNeed: { type: 'string', description: 'The dietary requirement like high protein, low carb, etc.' },
      restrictions: { type: 'string', description: 'Any dietary restrictions like vegetarian, vegan, etc.' }
    },
    required: ['dietaryNeed']
  }
};

// ==========================================
// MAINTENANCE FUNCTIONS
// ==========================================
const scheduleMaintenance = {
  name: 'schedule_maintenance',
  description: 'Schedule maintenance or any task. Use when someone says "schedule pest control", "plan AC service", etc.',
  parameters: {
    type: 'object',
    properties: {
      type: { type: 'string', enum: ['ac-service', 'plumbing', 'electrical', 'pest-control', 'cleaning', 'painting', 'water-tank', 'generator', 'elevator', 'general'] },
      description: { type: 'string', description: 'Description of the maintenance task' },
      scheduledDate: { type: 'string', description: 'Date to schedule in YYYY-MM-DD format' },
      roomNumber: { type: 'string', description: 'Room number if specific to a room' },
      assignedTo: { type: 'string', description: 'Person or company to assign' }
    },
    required: ['type', 'description', 'scheduledDate']
  }
};

const getMaintenancePredictions = {
  name: 'get_maintenance_predictions',
  description: 'Get AI predictions about upcoming maintenance needs based on history.',
  parameters: {
    type: 'object',
    properties: {
      type: { type: 'string', description: 'Type of maintenance to predict' }
    }
  }
};

// ==========================================
// REPORT FUNCTIONS
// ==========================================
const generateMonthlyReport = {
  name: 'generate_monthly_report',
  description: 'Generate comprehensive monthly report with income, expenses, occupancy, complaints, etc.',
  parameters: {
    type: 'object',
    properties: {
      month: { type: 'number', description: 'Month number' },
      year: { type: 'number', description: 'Year' }
    }
  }
};

const getDailySummary = {
  name: 'get_daily_summary',
  description: 'Get AI-generated daily summary with occupancy, income, complaints, suggestions, and to-do list.',
  parameters: {
    type: 'object',
    properties: {
      date: { type: 'string', description: 'Date in YYYY-MM-DD format. Defaults to today.' }
    }
  }
};

const getBusinessInsights = {
  name: 'get_business_insights',
  description: 'Get AI-generated business insights like occupancy trends, revenue analysis, and improvement suggestions.',
  parameters: {
    type: 'object',
    properties: {}
  }
};

// ==========================================
// TENANT INFO FUNCTIONS
// ==========================================
const getRoommateInfo = {
  name: 'get_roommate_info',
  description: 'Get information about a tenant\'s roommate(s). Use when someone asks "who is my roommate".',
  parameters: {
    type: 'object',
    properties: {
      tenantId: { type: 'string', description: 'The tenant asking about their roommate' }
    }
  }
};

const getFacilities = {
  name: 'get_facilities',
  description: 'Get information about PG facilities and amenities. Use when someone asks "what facilities are available".',
  parameters: {
    type: 'object',
    properties: {}
  }
};

const getRoommateMatch = {
  name: 'get_roommate_match',
  description: 'Find compatible roommates based on preferences like sleep timing, habits, interests.',
  parameters: {
    type: 'object',
    properties: {
      tenantId: { type: 'string', description: 'Tenant looking for roommate' },
      sleepTiming: { type: 'string', enum: ['early-sleeper', 'night-owl', 'flexible'] },
      smokingPreference: { type: 'string', enum: ['smoker', 'non-smoker', 'no-preference'] },
      cleanlinessLevel: { type: 'number', min: 1, max: 5 },
      language: { type: 'string' },
      interests: { type: 'string', description: 'Comma-separated interests' }
    }
  }
};

// ==========================================
// SMART SEARCH
// ==========================================
const smartSearch = {
  name: 'smart_search',
  description: 'Convert natural language query to database search. Use for complex queries like "show girls who haven\'t paid rent" or "rooms becoming empty next week".',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'The natural language search query' },
      entityType: { type: 'string', enum: ['tenants', 'rooms', 'payments', 'complaints'], description: 'What type of data to search' }
    },
    required: ['query']
  }
};

// ==========================================
// COMMUNICATION FUNCTIONS
// ==========================================
const generateEmail = {
  name: 'generate_email',
  description: 'Generate a professional email. Types: welcome, rent-reminder, move-out, complaint-response, notice.',
  parameters: {
    type: 'object',
    properties: {
      type: { type: 'string', enum: ['welcome', 'rent-reminder', 'move-out', 'complaint-response', 'notice', 'custom'] },
      recipientName: { type: 'string' },
      context: { type: 'string', description: 'Additional context for the email' }
    },
    required: ['type']
  }
};

const generateWhatsAppMessage = {
  name: 'generate_whatsapp_message',
  description: 'Generate a professional WhatsApp message for various purposes.',
  parameters: {
    type: 'object',
    properties: {
      purpose: { type: 'string', description: 'Purpose of the message' },
      recipientName: { type: 'string' },
      context: { type: 'string', description: 'Additional context' }
    },
    required: ['purpose']
  }
};

// ==========================================
// EXPENSE FUNCTIONS
// ==========================================
const getExpenseSummary = {
  name: 'get_expense_summary',
  description: 'Get expense breakdown by category. Use when someone asks about expenses or costs.',
  parameters: {
    type: 'object',
    properties: {
      month: { type: 'number' },
      year: { type: 'number' },
      category: { type: 'string' }
    }
  }
};

const getExpensePrediction = {
  name: 'get_expense_prediction',
  description: 'Predict next month expenses based on historical data.',
  parameters: {
    type: 'object',
    properties: {}
  }
};

// ==========================================
// KNOWLEDGE BASE (RAG)
// ==========================================
const searchKnowledgeBase = {
  name: 'search_knowledge_base',
  description: 'Search the PG knowledge base (rules, policies, agreements) to answer questions. Use for questions about PG rules, refund policy, food policy, visitor rules, etc.',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'The question to search for' },
      category: { type: 'string', enum: ['pg-rules', 'food-policy', 'refund-policy', 'agreement', 'visitor-rules', 'safety', 'amenities'] }
    },
    required: ['query']
  }
};

// ==========================================
// VIOLATION & RISK
// ==========================================
const getRiskyTenants = {
  name: 'get_risky_tenants',
  description: 'Get tenants with high violation scores or risky behavior patterns.',
  parameters: {
    type: 'object',
    properties: {}
  }
};

// ==========================================
// OCCUPANCY PREDICTION
// ==========================================
const getOccupancyPrediction = {
  name: 'get_occupancy_prediction',
  description: 'Predict occupancy for upcoming periods — next week, next month, festival season, vacation season.',
  parameters: {
    type: 'object',
    properties: {
      period: { type: 'string', enum: ['next-week', 'next-month', 'festival-season', 'vacation-season'], description: 'Period to predict' }
    }
  }
};

// ==========================================
// REVENUE OPTIMIZER
// ==========================================
const getRevenueOptimization = {
  name: 'get_revenue_optimization',
  description: 'Get AI suggestions for revenue optimization — rent adjustments, discounts, underpriced rooms.',
  parameters: {
    type: 'object',
    properties: {}
  }
};

// ==========================================
// TODO LIST
// ==========================================
const getSmartTodoList = {
  name: 'get_smart_todo_list',
  description: 'Get AI-generated smart to-do list for today. Includes rent collection, repairs, approvals, etc.',
  parameters: {
    type: 'object',
    properties: {}
  }
};

// ==========================================
// EXPORT ALL FUNCTIONS
// ==========================================

// Functions available for owner role
export const ownerFunctions = [
  searchRooms, getEmptyRooms, getRoomDetails, getAutoRoomMatch,
  getIncomeReport, getUnpaidTenants, getRentStatus, processPayment, getRentPrediction,
  createComplaint, getPendingComplaints, getComplaintsByTenant,
  getTodayVisitors,
  generateNotice, getNotices,
  getMenu, getFoodRecommendation,
  scheduleMaintenance, getMaintenancePredictions,
  generateMonthlyReport, getDailySummary, getBusinessInsights,
  getRoommateInfo, getFacilities, getRoommateMatch,
  smartSearch,
  generateEmail, generateWhatsAppMessage,
  getExpenseSummary, getExpensePrediction,
  searchKnowledgeBase,
  getRiskyTenants,
  getOccupancyPrediction,
  getRevenueOptimization,
  getSmartTodoList
];

// Functions available for tenant role
export const tenantFunctions = [
  searchRooms, getEmptyRooms, getRoomDetails,
  getRentStatus, processPayment,
  createComplaint, getComplaintsByTenant,
  getNotices,
  getMenu, getFoodRecommendation,
  getRoommateInfo, getFacilities,
  searchKnowledgeBase
];

// Functions available for visitor role
export const visitorFunctions = [
  searchRooms, getEmptyRooms, getRoomDetails,
  getNotices,
  getFacilities,
  searchKnowledgeBase
];

// Get functions by role
export function getFunctionsByRole(role) {
  switch (role) {
    case 'owner': return ownerFunctions;
    case 'tenant': return tenantFunctions;
    case 'visitor': return visitorFunctions;
    default: return visitorFunctions;
  }
}

// Get all function names
export function getAllFunctionNames() {
  return ownerFunctions.map(f => f.name);
}
