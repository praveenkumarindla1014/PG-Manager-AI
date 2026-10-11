import Notification from '../models/Notification.js';

/**
 * Create an in-app notification and push it live over Socket.IO.
 *
 *   audience 'owner' → all owners      (socket room "owners")
 *   audience 'all'   → everyone        (broadcast)
 *   audience 'user'  → one recipient   (socket room "user-<id>")
 */
export async function notify(io, { audience = 'owner', recipient = null, type = 'system', title, message = '', link = '' }) {
  try {
    const doc = await Notification.create({ audience, recipient, type, title, message, link });
    if (io) {
      const payload = doc.toObject();
      if (audience === 'all') io.emit('notification', payload);
      else if (audience === 'owner') io.to('owners').emit('notification', payload);
      else if (recipient) io.to(`user-${recipient}`).emit('notification', payload);
    }
    return doc;
  } catch (error) {
    console.warn('Notification error:', error.message);
    return null;
  }
}

export function notificationQueryFor(user) {
  const or = [{ recipient: user._id }, { audience: 'all' }];
  if (user.role === 'owner') or.push({ audience: 'owner' });
  return { $or: or };
}
