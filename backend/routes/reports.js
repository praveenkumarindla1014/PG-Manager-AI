import express from 'express';
import { protect, isOwner } from '../middleware/auth.js';
import { generateDailySummary, generateInsights, generateSmartTodo } from '../services/ai/insightsGenerator.js';
import { predictOccupancy } from '../services/ai/predictionEngine.js';
import { getRevenueOptimizationSuggestions } from '../services/ai/revenueOptimizer.js';

const router = express.Router();

router.get('/daily-summary', protect, isOwner, async (req, res) => {
  try {
    const summary = await generateDailySummary(req.query.date);
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/insights', protect, isOwner, async (req, res) => {
  try {
    const insights = await generateInsights();
    res.json({ success: true, data: insights });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/occupancy-prediction', protect, isOwner, async (req, res) => {
  try {
    const prediction = await predictOccupancy(req.query.period);
    res.json({ success: true, data: prediction });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/revenue-optimization', protect, isOwner, async (req, res) => {
  try {
    const suggestions = await getRevenueOptimizationSuggestions();
    res.json({ success: true, data: suggestions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/todo', protect, isOwner, async (req, res) => {
  try {
    const todos = await generateSmartTodo();
    res.json({ success: true, data: todos });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
