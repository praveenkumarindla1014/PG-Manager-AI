import mongoose from 'mongoose';

const knowledgeBaseSchema = new mongoose.Schema({
  documentName: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['pg-rules', 'food-policy', 'refund-policy', 'agreement', 'visitor-rules', 'safety', 'amenities', 'other'],
    required: true 
  },
  
  // Original content
  originalContent: { type: String, required: true },
  
  // Chunked content for RAG
  chunks: [{
    content: { type: String },
    embedding: [{ type: Number }],
    chunkIndex: { type: Number }
  }],
  
  // File info
  fileType: { type: String },
  fileUrl: { type: String },
  
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  isActive: { type: Boolean, default: true },
  
  // Metadata
  wordCount: { type: Number },
  lastQueried: { type: Date },
  queryCount: { type: Number, default: 0 }
  
}, { timestamps: true });

knowledgeBaseSchema.index({ category: 1 });

export default mongoose.model('KnowledgeBase', knowledgeBaseSchema);
