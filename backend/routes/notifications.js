import express from 'express';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.js';
import { notificationQueryFor } from '../services/notify.js';
import { ah } from '../utils/http.js';

const router = express.Router();

// GET /api/notifications — latest 40 with unread count
router.get('/', protect, ah(async (req, res) => {
  const query = notificationQueryFor(req.user);
  const items = await Notification.find(query).sort({ createdAt: -1 }).limit(40).lean();
  const uid = String(req.user._id);
  const data = items.map(n => ({ ...n, isRead: (n.readBy || []).some(id => String(id) === uid), readBy: undefined }));
  res.json({ success: true, data, unread: data.filter(n => !n.isRead).length });
}));

router.post('/read-all', protect, ah(async (req, res) => {
  await Notification.updateMany(notificationQueryFor(req.user), { $addToSet: { readBy: req.user._id } });
  res.json({ success: true });
}));

router.post('/:id/read', protect, ah(async (req, res) => {
  await Notification.updateOne({ _id: req.params.id, ...notificationQueryFor(req.user) }, { $addToSet: { readBy: req.user._id } });
  res.json({ success: true });
}));

export default router;
