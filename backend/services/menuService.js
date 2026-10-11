import Menu from '../models/Menu.js';
import { WEEKLY_DEFAULT_MENUS } from '../data/defaultMenus.js';

export const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export function dayName(date = new Date()) {
  return date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
}

/**
 * The menu repeats weekly: the owner's saved menu for that weekday wins,
 * otherwise the built-in default menu is used.
 */
export async function getMenuForDay(day) {
  const key = String(day).toLowerCase();
  const saved = await Menu.findOne({ dayOfWeek: key }).sort({ updatedAt: -1 }).lean();
  return saved || (WEEKLY_DEFAULT_MENUS[key] ? { ...WEEKLY_DEFAULT_MENUS[key], isDefault: true } : null);
}

export function getMenuForDate(date = new Date()) {
  return getMenuForDay(dayName(date));
}

export function computeTotals(menu) {
  const total = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  for (const meal of ['breakfast', 'lunch', 'snacks', 'dinner']) {
    for (const item of menu[meal]?.items || []) {
      for (const k of Object.keys(total)) total[k] += Number(item.nutrition?.[k]) || 0;
    }
  }
  for (const k of Object.keys(total)) total[k] = Math.round(total[k] * 10) / 10;
  return total;
}
