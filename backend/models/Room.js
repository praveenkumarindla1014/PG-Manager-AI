import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  roomNumber: { type: String, required: true, unique: true },
  floor: { type: Number, required: true },
  type: { type: String, enum: ['single', 'double', 'triple', 'dormitory'], required: true },
  
  // Pricing
  rent: { type: Number, required: true },
  deposit: { type: Number, default: 0 },
  
  // Features
  hasAC: { type: Boolean, default: false },
  hasAttachedBathroom: { type: Boolean, default: false },
  hasBalcony: { type: Boolean, default: false },
  hasParking: { type: Boolean, default: false },
  hasWifi: { type: Boolean, default: true },
  hasTv: { type: Boolean, default: false },
  hasGeyser: { type: Boolean, default: false },
  hasCupboard: { type: Boolean, default: true },
  
  // Furnishing
  furnishing: { type: String, enum: ['fully-furnished', 'semi-furnished', 'unfurnished'], default: 'semi-furnished' },
  
  // Occupancy
  maxOccupants: { type: Number, required: true },
  currentOccupants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  status: { type: String, enum: ['available', 'occupied', 'partially-occupied', 'maintenance', 'reserved'], default: 'available' },
  
  // Availability
  availableFrom: { type: Date, default: Date.now },
  
  // Gender restriction
  genderPreference: { type: String, enum: ['male', 'female', 'any'], default: 'any' },
  
  // AI Features
  // Feature #16 - Maintenance Prediction
  maintenanceHistory: [{
    type: { type: String },
    description: String,
    date: Date,
    cost: Number,
    resolvedDate: Date
  }],
  predictedMaintenance: [{
    type: { type: String },
    probability: Number,
    estimatedDate: Date,
    estimatedCost: Number
  }],
  
  // Feature #31 - Revenue Optimizer
  marketRentEstimate: { type: Number },
  occupancyRate: { type: Number, default: 0 },
  
  // Images
  images: [{ type: String }],
  
  // Description
  description: { type: String }
  
}, { timestamps: true });

// Virtual for vacancy count
roomSchema.virtual('vacancies').get(function() {
  return this.maxOccupants - this.currentOccupants.length;
});

// Update status based on occupancy
roomSchema.pre('save', function(next) {
  if (this.currentOccupants.length === 0) {
    this.status = 'available';
  } else if (this.currentOccupants.length < this.maxOccupants) {
    this.status = 'partially-occupied';
  } else {
    this.status = 'occupied';
  }
  next();
});

roomSchema.set('toJSON', { virtuals: true });
roomSchema.set('toObject', { virtuals: true });

export default mongoose.model('Room', roomSchema);
