import mongoose from 'mongoose';

// In-app notifications shown in the header bell (also pushed live over Socket.IO).
const notificationSchema = new mongoose.Schema({
  // null recipient + audience 'owner' => every owner sees it
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  audience: { type: String, enum: ['user', 'owner', 'all'], default: 'user' },

  type: {
    type: String,
    enum: ['complaint', 'emergency', 'payment', 'notice', 'visitor', 'maintenance', 'system'],
    default: 'system'
  },
  title: { type: String, required: true },
  message: { type: String },
  link: { type: String },

  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ audience: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
