import mongoose from 'mongoose';

const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  isVeg: { type: Boolean, default: true },
  
  // Feature #8 - AI Nutrition Analysis
  nutrition: {
    calories: { type: Number, default: 0 },
    protein: { type: Number, default: 0 },
    carbs: { type: Number, default: 0 },
    fat: { type: Number, default: 0 },
    fiber: { type: Number, default: 0 }
  },
  healthierAlternative: { type: String }
});

const menuSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  dayOfWeek: { type: String, enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] },
  
  breakfast: {
    items: [menuItemSchema],
    timing: { type: String, default: '7:30 AM - 9:30 AM' }
  },
  lunch: {
    items: [menuItemSchema],
    timing: { type: String, default: '12:30 PM - 2:30 PM' }
  },
  snacks: {
    items: [menuItemSchema],
    timing: { type: String, default: '4:30 PM - 5:30 PM' }
  },
  dinner: {
    items: [menuItemSchema],
    timing: { type: String, default: '7:30 PM - 9:30 PM' }
  },
  
  // AI totals
  totalNutrition: {
    calories: { type: Number, default: 0 },
    protein: { type: Number, default: 0 },
    carbs: { type: Number, default: 0 },
    fat: { type: Number, default: 0 }
  },
  
  aiSuggestions: [{ type: String }],
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  
}, { timestamps: true });

menuSchema.index({ date: 1 }, { unique: true });

export default mongoose.model('Menu', menuSchema);
