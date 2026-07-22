/**
 * Scheduler (Phase 5)
 * Cron jobs for automated AI tasks.
 */

import cron from 'node-cron';
import { generateDailySummary } from './ai/insightsGenerator.js';
import { updateViolationScores } from './ai/violationDetector.js';

export function initScheduler(io) {
  console.log('⏰ Initializing scheduled jobs...');
  
  // Daily 7 AM - Generate daily summary + to-do list
  cron.schedule('0 7 * * *', async () => {
    console.log('📊 Running daily summary generation...');
    try {
      const summary = await generateDailySummary();
      if (io && summary) {
        io.emit('daily-summary', { message: '📊 Daily summary ready!', data: summary });
      }
    } catch (error) {
      console.error('Daily summary cron error:', error);
    }
  });
  
  // Weekly Sunday midnight - Update violation scores
  cron.schedule('0 0 * * 0', async () => {
    console.log('⚠️ Updating violation scores...');
    try {
      await updateViolationScores();
    } catch (error) {
      console.error('Violation update cron error:', error);
    }
  });
  
  console.log('✅ Scheduled jobs initialized');
}
