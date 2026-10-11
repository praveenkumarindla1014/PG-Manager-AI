import express from 'express';
import Expense from '../models/Expense.js';
import { protect, isOwner } from '../middleware/auth.js';
import { predictExpenses } from '../services/ai/predictionEngine.js';
import { ah, pick, httpError } from '../utils/http.js';

const router = express.Router();
const FIELDS = ['category', 'amount', 'date', 'description', 'vendorName', 'isRecurring', 'recurringFrequency', 'receipt'];

function withMonth(data) {
  const date = data.date ? new Date(data.date) : new Date();
  if (isNaN(date)) throw httpError(400, 'Invalid date');
  return { ...data, date, month: date.getMonth() + 1, year: date.getFullYear() };
}

router.get('/', protect, isOwner, ah(async (req, res) => {
  const { month, year, category } = req.query;
  const query = {};
  if (month) query.month = Number(month);
  if (year) query.year = Number(year);
  if (category) query.category = category;
  const expenses = await Expense.find(query).sort({ date: -1 }).limit(500);
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const byCategory = {};
  for (const e of expenses) byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
  res.json({ success: true, data: expenses, total, byCategory, count: expenses.length });
}));

router.get('/predictions', protect, isOwner, ah(async (req, res) => {
  res.json({ success: true, data: await predictExpenses() });
}));

router.post('/', protect, isOwner, ah(async (req, res) => {
  const data = pick(req.body, FIELDS);
  if (!data.category || !(Number(data.amount) > 0)) throw httpError(400, 'Category and a positive amount are required');
  const expense = await Expense.create({ ...withMonth(data), amount: Number(data.amount), createdBy: req.user._id });
  res.status(201).json({ success: true, data: expense });
}));

router.put('/:id', protect, isOwner, ah(async (req, res) => {
  const data = pick(req.body, FIELDS);
  const expense = await Expense.findByIdAndUpdate(req.params.id, data.date ? withMonth(data) : data, { new: true, runValidators: true });
  if (!expense) throw httpError(404, 'Expense not found');
  res.json({ success: true, data: expense });
}));

router.delete('/:id', protect, isOwner, ah(async (req, res) => {
  const expense = await Expense.findByIdAndDelete(req.params.id);
  if (!expense) throw httpError(404, 'Expense not found');
  res.json({ success: true, message: 'Expense deleted' });
}));

export default router;
