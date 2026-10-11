/**
 * Scheduler — background jobs that keep the PG running on autopilot.
 */

import cron from 'node-cron';
import { generateDailySummary } from './ai/insightsGenerator.js';
import { updateViolationScores } from './ai/violationDetector.js';
import { generateMonthlyDues, refreshOverdue } from './paymentService.js';
import { notify } from './notify.js';

async function safe(label, fn) {
  try {
    return await fn();
  } catch (error) {
    console.error(`⏰ ${label} failed:`, error.message);
  }
}

export function initScheduler(io) {
  // On startup: make sure this month's rent dues exist and overdue flags are current.
  safe('startup rent sync', async () => {
    const { created } = await generateMonthlyDues();
    const overdue = await refreshOverdue();
    if (created || overdue) console.log(`💰 Rent sync: ${created} new due(s), ${overdue} marked overdue`);
  });

  // 1st of every month, 6 AM — create rent dues for everyone.
  cron.schedule('0 6 1 * *', () => safe('monthly dues', async () => {
    const { created, month, year } = await generateMonthlyDues();
    await notify(io, { audience: 'owner', type: 'payment', title: 'Rent dues created', message: `${created} rent due(s) generated for ${month}/${year}.`, link: '/payments' });
    await notify(io, { audience: 'all', type: 'payment', title: 'Rent for this month is due on the 5th', message: 'Pay via UPI or at the office. Ask the AI assistant for payment details.', link: '/payments' });
  }));

  // Every day 00:15 — flip unpaid past-due rents to overdue.
  cron.schedule('15 0 * * *', () => safe('overdue refresh', refreshOverdue));

  // Every day 7 AM — fresh daily brief for the owner.
  cron.schedule('0 7 * * *', () => safe('daily summary', async () => {
    const summary = await generateDailySummary(null, { refresh: true });
    await notify(io, {
      audience: 'owner', type: 'system', title: '☀️ Your morning brief is ready',
      message: summary?.aiInsights?.[0] || 'Open the dashboard to see today’s priorities.', link: '/owner-dashboard'
    });
  }));

  // Sundays at midnight — recompute tenant risk scores.
  cron.schedule('0 0 * * 0', () => safe('violation scores', updateViolationScores));

  console.log('⏰ Scheduled jobs ready');
}
