import mongoose from 'mongoose';

const dailySummarySchema = new mongoose.Schema({
  date: { type: Date, required: true, unique: true },
  
  // Occupancy
  totalRooms: { type: Number },
  occupiedRooms: { type: Number },
  availableRooms: { type: Number },
  occupancyRate: { type: Number },
  
  // Financial
  todayIncome: { type: Number, default: 0 },
  expectedIncome: { type: Number, default: 0 },
  pendingRent: { type: Number, default: 0 },
  totalExpenses: { type: Number, default: 0 },
  
  // Tenants
  newTenants: { type: Number, default: 0 },
  movingOutSoon: { type: Number, default: 0 },
  totalTenants: { type: Number, default: 0 },
  
  // Complaints
  newComplaints: { type: Number, default: 0 },
  pendingComplaints: { type: Number, default: 0 },
  resolvedComplaints: { type: Number, default: 0 },
  emergencyComplaints: { type: Number, default: 0 },
  
  // Visitors
  todayVisitors: { type: Number, default: 0 },
  
  // Late payments
  latePayments: { type: Number, default: 0 },
  latePaymentAmount: { type: Number, default: 0 },
  
  // AI Insights (Feature #32)
  aiInsights: [{ type: String }],
  
  // AI Suggestions (Feature #12)
  aiSuggestions: [{ type: String }],
  
  // AI To-do List (Feature #33)
  todoList: [{
    task: String,
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'] },
    category: String,
    completed: { type: Boolean, default: false }
  }],
  
  // Predictions
  predictedOccupancyNextWeek: { type: Number },
  predictedIncomeNextMonth: { type: Number }
  
}, { timestamps: true });

export default mongoose.model('DailySummary', dailySummarySchema);
