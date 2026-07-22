import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  category: { 
    type: String, 
    enum: ['food', 'electricity', 'water', 'gas', 'maintenance', 'salary', 'rent-building', 'internet', 'cleaning', 'pest-control', 'equipment', 'miscellaneous'],
    required: true 
  },
  
  amount: { type: Number, required: true },
  date: { type: Date, required: true },
  description: { type: String },
  
  // Vendor/Payee
  vendorName: { type: String },
  
  // Receipt
  receipt: { type: String },
  
  // Recurring
  isRecurring: { type: Boolean, default: false },
  recurringFrequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'yearly'] },
  
  // Feature #18 - AI Expense Analysis
  aiPredictedNextMonth: { type: Number },
  aiCategory: { type: String },
  aiInsight: { type: String },
  
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  
}, { timestamps: true });

expenseSchema.index({ category: 1, month: 1, year: 1 });
expenseSchema.index({ date: -1 });

export default mongoose.model('Expense', expenseSchema);
