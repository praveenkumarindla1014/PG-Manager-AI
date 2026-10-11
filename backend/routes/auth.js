import express from 'express';
import User from '../models/User.js';
import { generateToken, protect } from '../middleware/auth.js';
import { ah, pick, httpError } from '../utils/http.js';

const router = express.Router();

const SAFE_FIELDS = '-password -aadhaarImage -selfieImage';

function authPayload(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    gender: user.gender,
    roomId: user.roomId,
    preferredLanguage: user.preferredLanguage,
    token: generateToken(user._id)
  };
}

// POST /api/auth/register
// Public sign-up creates tenant accounts. The very first account on a fresh
// install may be an owner, so a new PG can be set up without the seed data.
router.post('/register', ah(async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name?.trim() || !email?.trim() || !password || !phone?.trim()) throw httpError(400, 'Name, email, phone and password are required');
  if (password.length < 6) throw httpError(400, 'Password must be at least 6 characters');
  if (!/^\S+@\S+\.\S+$/.test(email)) throw httpError(400, 'Please enter a valid email');

  const exists = await User.findOne({ email: email.toLowerCase().trim() });
  if (exists) throw httpError(409, 'An account with this email already exists');

  const ownerExists = await User.exists({ role: 'owner' });
  const role = req.body.role === 'owner' && !ownerExists ? 'owner' : 'tenant';

  const user = await User.create({
    ...pick(req.body, ['gender', 'age', 'preferences']),
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password,
    phone: phone.trim(),
    role
  });
  res.status(201).json({ success: true, data: authPayload(user) });
}));

// POST /api/auth/login
router.post('/login', ah(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw httpError(400, 'Email and password are required');
  const user = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (!user || !(await user.comparePassword(password))) throw httpError(401, 'Incorrect email or password');
  if (!user.isActive) throw httpError(403, 'This account has been deactivated. Please contact the PG office.');
  res.json({ success: true, data: authPayload(user) });
}));

// GET /api/auth/me
router.get('/me', protect, ah(async (req, res) => {
  const user = await User.findById(req.user._id).select(SAFE_FIELDS).populate('roomId');
  res.json({ success: true, data: user });
}));

// PUT /api/auth/profile — only personal fields; role/room/verification are owner-controlled
router.put('/profile', protect, ah(async (req, res) => {
  const updates = pick(req.body, ['name', 'phone', 'gender', 'age', 'address', 'avatar', 'preferredLanguage', 'preferences']);
  if (updates.name !== undefined && !String(updates.name).trim()) throw httpError(400, 'Name cannot be empty');
  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true })
    .select(SAFE_FIELDS).populate('roomId');
  res.json({ success: true, data: user });
}));

// PUT /api/auth/password
router.put('/password', protect, ah(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) throw httpError(400, 'New password must be at least 6 characters');
  const user = await User.findById(req.user._id);
  if (!(await user.comparePassword(currentPassword || ''))) throw httpError(400, 'Current password is incorrect');
  user.password = newPassword;
  await user.save();
  res.json({ success: true, message: 'Password updated' });
}));

export default router;
