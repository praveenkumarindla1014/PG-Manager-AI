import mongoose from 'mongoose';

const visitorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String },
  
  purpose: { type: String, required: true },
  tenantVisiting: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  roomVisiting: { type: String },
  
  checkIn: { type: Date, default: Date.now },
  checkOut: { type: Date },
  
  idProofType: { type: String, enum: ['aadhaar', 'pan', 'driving-license', 'passport', 'other'] },
  idProofNumber: { type: String },
  idProofImage: { type: String },
  
  // Approval
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'checked-out'], default: 'pending' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  vehicleNumber: { type: String },
  numberOfGuests: { type: Number, default: 1 },
  
  notes: { type: String }
  
}, { timestamps: true });

visitorSchema.index({ checkIn: -1 });
visitorSchema.index({ tenantVisiting: 1 });

export default mongoose.model('Visitor', visitorSchema);
