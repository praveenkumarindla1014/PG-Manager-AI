import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  phone: { type: String, required: true },
  role: { type: String, enum: ['owner', 'tenant', 'visitor'], default: 'tenant' },
  
  // Profile
  avatar: { type: String, default: '' },
  gender: { type: String, enum: ['male', 'female', 'other'], default: 'male' },
  age: { type: Number },
  dateOfBirth: { type: Date },
  address: { type: String },
  
  // ID Verification (Feature #20, #21)
  aadhaarNumber: { type: String },
  aadhaarImage: { type: String },
  selfieImage: { type: String },
  idVerified: { type: Boolean, default: false },
  extractedAadhaarData: {
    name: String,
    dob: String,
    gender: String,
    address: String,
    idNumber: String
  },
  
  // Tenant-specific
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  moveInDate: { type: Date },
  moveOutDate: { type: Date },
  isActive: { type: Boolean, default: true },
  
  // Preferences (Feature #13, #14 - Room & Roommate Matching)
  preferences: {
    budget: { min: Number, max: Number },
    foodPreference: { type: String, enum: ['veg', 'non-veg', 'vegan', 'any'], default: 'any' },
    acPreference: { type: Boolean, default: false },
    smokingPreference: { type: String, enum: ['smoker', 'non-smoker', 'no-preference'], default: 'no-preference' },
    studyPreference: { type: String, enum: ['quiet', 'moderate', 'no-preference'], default: 'no-preference' },
    noisePreference: { type: String, enum: ['silent', 'moderate', 'loud', 'no-preference'], default: 'no-preference' },
    occupation: { type: String, enum: ['student', 'working-professional', 'other'], default: 'other' },
    sleepTiming: { type: String, enum: ['early-sleeper', 'night-owl', 'flexible'], default: 'flexible' },
    college: { type: String },
    office: { type: String },
    language: [{ type: String }],
    musicPreference: { type: String, enum: ['yes', 'no', 'headphones-only', 'no-preference'], default: 'no-preference' },
    cleanlinessLevel: { type: Number, min: 1, max: 5, default: 3 },
    interests: [{ type: String }],
    parkingNeeded: { type: Boolean, default: false }
  },
  
  // AI Features
  // Feature #15 - Rule Violation Detection
  violationScore: { type: Number, default: 0 },
  violations: [{
    type: { type: String },
    description: String,
    date: Date,
    severity: { type: String, enum: ['low', 'medium', 'high'] }
  }],
  
  // Feature #10 - Rent Prediction
  paymentBehavior: {
    averageDaysLate: { type: Number, default: 0 },
    latePaymentCount: { type: Number, default: 0 },
    earlyPaymentCount: { type: Number, default: 0 },
    onTimePaymentCount: { type: Number, default: 0 },
    lateProbability: { type: Number, default: 0 }
  },

  // Feature #28 - Multi-language
  preferredLanguage: { type: String, default: 'en' }
  
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('User', userSchema);
