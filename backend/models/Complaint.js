import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: false },
  
  description: { type: String, required: true },
  
  // AI Analysis (Feature #5)
  aiCategory: { 
    type: String, 
    enum: ['electrical', 'plumbing', 'furniture', 'cleaning', 'pest-control', 'wifi-internet', 'ac-cooling', 'water-supply', 'security', 'noise', 'food', 'other'],
    default: 'other'
  },
  aiPriority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'emergency'],
    default: 'medium'
  },
  aiEstimatedTime: { type: String, default: '4 Hours' },
  aiSuggestedStaff: { type: String, default: 'General Maintenance' },
  aiGeneratedReply: { type: String },
  
  // Feature #9 - Sentiment Analysis
  aiSentiment: {
    type: String,
    enum: ['happy', 'neutral', 'angry', 'emergency'],
    default: 'neutral'
  },
  sentimentEmoji: { type: String, default: '😐' },
  urgencyScore: { type: Number, min: 0, max: 10, default: 5 },
  
  // Feature #6 - Duplicate Detection
  masterComplaintId: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint' },
  isDuplicate: { type: Boolean, default: false },
  duplicateCount: { type: Number, default: 0 },
  linkedComplaints: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Complaint' }],
  
  // Feature #26 - Emergency Detection
  isEmergency: { type: Boolean, default: false },
  emergencyType: { type: String, enum: ['gas-leak', 'fire', 'medical', 'security', 'other'] },
  emergencyNotified: { type: Boolean, default: false },
  
  // Status tracking
  status: { type: String, enum: ['open', 'in-progress', 'resolved', 'closed'], default: 'open' },
  assignedTo: { type: String },
  resolvedDate: { type: Date },
  
  // Images
  images: [{ type: String }],
  
  // Response
  ownerResponse: { type: String },

  // Tenant feedback after the fix
  rating: { type: Number, min: 1, max: 5 },
  feedback: { type: String }
  
}, { timestamps: true });

// Index for duplicate detection
complaintSchema.index({ aiCategory: 1, status: 1, createdAt: -1 });
complaintSchema.index({ tenant: 1, createdAt: -1 });

export default mongoose.model('Complaint', complaintSchema);
