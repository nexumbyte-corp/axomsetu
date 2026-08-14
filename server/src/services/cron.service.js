import { backupService } from './backup.service.js';

let cronInterval = null;

/**
 * Initialize automated in-app background scheduler for daily database backups.
 * Runs recurring backups every 24 hours automatically inside the running Node server process.
 */
export const initCronScheduler = () => {
  if (cronInterval) return;

  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

  console.log('[Cron Scheduler]: Automated daily database backup scheduler initialized.');

  // Schedule recurring 24-hour backup cycle
  cronInterval = setInterval(async () => {
    try {
      console.log('[Cron Scheduler]: Triggering scheduled automated daily backup...');
      const result = await backupService.runDatabaseBackup();
      console.log(`[Cron Scheduler]: Scheduled backup completed successfully (${result.sizeMb}). File: ${result.fileName}`);
    } catch (err) {
      console.error('[Cron Scheduler Error]: Scheduled daily backup failed:', err.message);
    }
  }, TWENTY_FOUR_HOURS);
};

export const stopCronScheduler = () => {
  if (cronInterval) {
    clearInterval(cronInterval);
    cronInterval = null;
    console.log('[Cron Scheduler]: Scheduler stopped cleanly.');
  }
};
