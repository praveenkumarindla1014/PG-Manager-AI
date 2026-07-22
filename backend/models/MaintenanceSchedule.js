import mongoose from 'mongoose';

const maintenanceScheduleSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ['ac-service', 'plumbing', 'electrical', 'pest-control', 'cleaning', 'painting', 'water-tank', 'generator', 'elevator', 'general'],
    required: true 
  },
  
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  roomNumber: { type: String },
  floor: { type: Number },
  
  description: { type: String, required: true },
  
  scheduledDate: { type: Date, required: true },
  completedDate: { type: Date },
  
  status: { type: String, enum: ['scheduled', 'in-progress', 'completed', 'cancelled', 'overdue'], default: 'scheduled' },
  
  assignedTo: { type: String },
  assignedContact: { type: String },
  
  estimatedCost: { type: Number },
  actualCost: { type: Number },
  
  // Feature #16 - AI Prediction
  aiPredicted: { type: Boolean, default: false },
  aiConfidence: { type: Number },
  aiReason: { type: String },
  
  // Feature #23 - Meeting Scheduler
  createdViaAI: { type: Boolean, default: false },
  notificationsSent: { type: Boolean, default: false },
  
  // Linked complaint
  complaint: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint' },
  
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  
  notes: { type: String },
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  
}, { timestamps: true });

maintenanceScheduleSchema.index({ scheduledDate: 1, status: 1 });
maintenanceScheduleSchema.index({ room: 1 });

export default mongoose.model('MaintenanceSchedule', maintenanceScheduleSchema);
