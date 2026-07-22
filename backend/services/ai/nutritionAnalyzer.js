/**
 * Nutrition Analyzer (Features #8, #24)
 * Analyze menu nutrition and provide food recommendations.
 */

import { getCompletion } from './openaiClient.js';
import Menu from '../../models/Menu.js';

/**
 * Analyze nutrition of menu items (Feature #8)
 */
export async function analyzeMenuNutrition(menuItems) {
  try {
    const prompt = `Analyze the nutritional content of these Indian food items and provide estimates.

Items: ${menuItems.map(item => item.name || item).join(', ')}

Return ONLY valid JSON array:
[
  {
    "name": "item name",
    "calories": estimated calories per serving (number),
    "protein": grams of protein (number),
    "carbs": grams of carbs (number),
    "fat": grams of fat (number),
    "fiber": grams of fiber (number),
    "healthierAlternative": "a healthier alternative suggestion"
  }
]`;

    const result = await getCompletion(prompt, 'You are a nutritionist specializing in Indian food. Provide reasonable nutritional estimates per standard serving.', {
      temperature: 0.3,
      maxTokens: 1000
    });
    
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('Invalid response');
    
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Nutrition analysis error:', error);
    return menuItems.map(item => ({
      name: item.name || item,
      calories: 200,
      protein: 8,
      carbs: 30,
      fat: 7,
      fiber: 3,
      healthierAlternative: 'Data unavailable'
    }));
  }
}

/**
 * Get food recommendations based on dietary needs (Feature #24)
 */
export async function getAIFoodRecommendation(dietaryNeed, restrictions = '') {
  try {
    // Get today's menu
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayMenu = await Menu.findOne({
      date: { $gte: today, $lt: tomorrow }
    });
    
    let menuContext = '';
    if (todayMenu) {
      const allItems = [];
      ['breakfast', 'lunch', 'snacks', 'dinner'].forEach(meal => {
        if (todayMenu[meal]?.items) {
          todayMenu[meal].items.forEach(item => {
            allItems.push(`${meal}: ${item.name} (${item.nutrition?.calories || '?'} cal, ${item.nutrition?.protein || '?'}g protein)`);
          });
        }
      });
      menuContext = `Today's menu:\n${allItems.join('\n')}`;
    }
    
    const prompt = `A PG tenant needs food recommendations.

Dietary need: ${dietaryNeed}
${restrictions ? `Restrictions: ${restrictions}` : ''}
${menuContext || 'No menu available for today.'}

Provide recommendations in JSON:
{
  "recommendations": [
    {
      "meal": "breakfast/lunch/dinner",
      "recommended_items": ["item1", "item2"],
      "reason": "why these items match the need"
    }
  ],
  "generalAdvice": "general dietary advice for the need",
  "additionalSuggestions": ["suggestion1", "suggestion2"]
}`;

    const result = await getCompletion(prompt, 'You are a nutrition advisor for an Indian PG hostel. Recommend from available menu items when possible.', {
      temperature: 0.5,
      maxTokens: 800
    });
    
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid response');
    
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Food recommendation error:', error);
    return {
      recommendations: [],
      generalAdvice: 'Please consult the menu board for today\'s options.',
      additionalSuggestions: ['Consider balanced meals with protein, carbs, and vegetables']
    };
  }
}
