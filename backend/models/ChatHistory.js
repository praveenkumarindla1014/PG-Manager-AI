import mongoose from 'mongoose';

const chatHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['owner', 'tenant', 'visitor'], required: true },
  sessionId: { type: String, required: true },
  title: { type: String },
  
  messages: [{
    role: { type: String, enum: ['user', 'assistant', 'system', 'function'], required: true },
    content: { type: String },
    functionCall: {
      name: { type: String },
      arguments: { type: String }
    },
    functionResult: { type: String },
    // Structured results rendered as cards in the chat UI
    cards: [{ type: mongoose.Schema.Types.Mixed }],
    functionsExecuted: [{ type: mongoose.Schema.Types.Mixed }],
    timestamp: { type: Date, default: Date.now }
  }],
  
  // Feature #27 - Context memory
  context: {
    lastTopic: { type: String },
    recentEntities: [{ type: String }],
    preferences: { type: Map, of: String }
  },
  
  // Language
  detectedLanguage: { type: String, default: 'en' },
  
  isActive: { type: Boolean, default: true },
  lastActivity: { type: Date, default: Date.now }
  
}, { timestamps: true });

chatHistorySchema.index({ userId: 1, sessionId: 1 });
chatHistorySchema.index({ lastActivity: -1 });

export default mongoose.model('ChatHistory', chatHistorySchema);
