import express from 'express';
import Expense from '../models/Expense.js';
import { protect, isOwner } from '../middleware/auth.js';
import { predictExpenses } from '../services/ai/predictionEngine.js';

const router = express.Router();

router.get('/', protect, isOwner, async (req, res) => {
  try {
    const { month, year, category } = req.query;
    const query = {};
    if (month) query.month = parseInt(month);
    if (year) query.year = parseInt(year);
    if (category) query.category = category;
    const expenses = await Expense.find(query).sort({ date: -1 });
    const total = expenses.reduce((s, e) => s + e.amount, 0);
    res.json({ success: true, data: expenses, total, count: expenses.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', protect, isOwner, async (req, res) => {
  try {
    const expense = await Expense.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: expense });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/predictions', protect, isOwner, async (req, res) => {
  try {
    const predictions = await predictExpenses();
    res.json({ success: true, data: predictions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
