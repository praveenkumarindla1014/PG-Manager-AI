import mongoose from 'mongoose';

const noticeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  
  // Feature #7 - AI generated professional notice
  originalInput: { type: String }, // Raw owner input
  aiGenerated: { type: Boolean, default: false },
  
  // Multi-language translations (Feature #28)
  translations: {
    en: { type: String },
    hi: { type: String }, // Hindi
    te: { type: String }, // Telugu
    ta: { type: String }, // Tamil
    kn: { type: String }  // Kannada
  },
  
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  category: { type: String, enum: ['general', 'maintenance', 'payment', 'event', 'rule', 'emergency'], default: 'general' },
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Target audience
  targetAudience: { type: String, enum: ['all', 'tenants', 'specific-floor', 'specific-room'], default: 'all' },
  targetFloor: { type: Number },
  targetRooms: [{ type: String }],
  
  // Read tracking
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  
  expiresAt: { type: Date },
  isActive: { type: Boolean, default: true }
  
}, { timestamps: true });

export default mongoose.model('Notice', noticeSchema);
