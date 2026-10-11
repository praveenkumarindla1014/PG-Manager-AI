import express from 'express';
import Menu from '../models/Menu.js';
import { protect, isOwner } from '../middleware/auth.js';
import { getMenuForDay, getMenuForDate, computeTotals, dayName, DAYS } from '../services/menuService.js';
import { ah } from '../utils/http.js';
import { analyzeMenuNutrition, getAIFoodRecommendation } from '../services/ai/nutritionAnalyzer.js';

const router = express.Router();

// GET /api/menu?day=monday | ?date=YYYY-MM-DD (default today)
router.get('/', protect, ah(async (req, res) => {
  const menu = req.query.day
    ? await getMenuForDay(req.query.day)
    : await getMenuForDate(req.query.date ? new Date(req.query.date) : new Date());
  res.json({ success: true, data: menu });
}));

// GET /api/menu/week — all seven days
router.get('/week', protect, ah(async (req, res) => {
  const week = await Promise.all(DAYS.map(async d => ({ day: d, menu: await getMenuForDay(d) })));
  res.json({ success: true, data: week, today: dayName() });
}));

router.post('/', protect, isOwner, ah(async (req, res) => {
  {
    const { date, dayOfWeek, breakfast, lunch, snacks, dinner } = req.body;
    const targetDate = date ? new Date(date) : new Date();
    const targetDay = (dayOfWeek || targetDate.toLocaleDateString('en', { weekday: 'long' })).toLowerCase();

    // Analyze nutrition for all items
    const allItems = [
      ...(breakfast?.items || []),
      ...(lunch?.items || []),
      ...(snacks?.items || []),
      ...(dinner?.items || [])
    ];

    // Only items without nutrition data are sent to the AI for estimation.
    const needsAnalysis = allItems.some(i => !i.nutrition?.calories);
    if (allItems.length > 0 && needsAnalysis) {
      try {
        const nutrition = await analyzeMenuNutrition(allItems);
        let idx = 0;
        for (const meal of [breakfast, lunch, snacks, dinner]) {
          if (meal?.items) {
            for (let i = 0; i < meal.items.length; i++) {
              if (nutrition[idx] && !meal.items[i].nutrition?.calories) {
                meal.items[i].nutrition = nutrition[idx];
                meal.items[i].healthierAlternative = nutrition[idx].healthierAlternative;
              }
              idx++;
            }
          }
        }
      } catch (err) {
        console.warn('Nutrition auto-analysis notice:', err.message);
      }
    }

    // One saved menu per weekday (the menu repeats every week)
    const doc = { date: targetDate, dayOfWeek: targetDay, breakfast, lunch, snacks, dinner, createdBy: req.user._id };
    doc.totalNutrition = computeTotals(doc);
    await Menu.deleteMany({ dayOfWeek: targetDay });
    const menu = await Menu.create(doc);

    res.status(200).json({ success: true, data: menu });
  }
}));

router.post('/recommend', protect, ah(async (req, res) => {
  const { dietaryNeed, restrictions } = req.body;
  if (!dietaryNeed?.trim()) return res.status(400).json({ success: false, message: 'Tell me your dietary goal' });
  res.json({ success: true, data: await getAIFoodRecommendation(dietaryNeed, restrictions) });
}));

export default router;
