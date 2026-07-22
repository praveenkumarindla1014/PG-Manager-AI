import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  
  amount: { type: Number, required: true },
  dueDate: { type: Date, required: true },
  paidDate: { type: Date },
  
  status: { type: String, enum: ['pending', 'paid', 'overdue', 'partial'], default: 'pending' },
  method: { type: String, enum: ['cash', 'upi', 'bank-transfer', 'card', 'other'], default: 'cash' },
  
  // Payment proof
  screenshot: { type: String },
  transactionId: { type: String },
  
  // Feature #19 - Fraud Detection
  fraudFlag: { type: Boolean, default: false },
  fraudReason: { type: String },
  fraudConfidence: { type: Number },
  
  // Late payment tracking
  daysLate: { type: Number, default: 0 },
  lateFee: { type: Number, default: 0 },
  
  // Month/Year for tracking
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  
  notes: { type: String }
  
}, { timestamps: true });

// Calculate days late
paymentSchema.pre('save', function(next) {
  if (this.paidDate && this.dueDate) {
    const diff = this.paidDate - this.dueDate;
    this.daysLate = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }
  if (!this.paidDate && new Date() > this.dueDate) {
    this.status = 'overdue';
  }
  next();
});

export default mongoose.model('Payment', paymentSchema);
