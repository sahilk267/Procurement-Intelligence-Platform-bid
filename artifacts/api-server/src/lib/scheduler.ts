import cron from 'node-cron';
import { db, ingestionRunsTable } from '@workspace/db';
import { tenantsTable } from '@workspace/db';
import { ingestTendersFromSources } from './data-ingestion';
import { logger } from './logger';
import { config } from '../config';

let scheduledJobs: { [key: string]: cron.ScheduledTask } = {};

/**
 * Initialize scheduled data ingestion jobs
 * Run daily at 02:00 AM IST (20:30 UTC previous day)
 */
export async function initializeIngestionScheduler(): Promise<void> {
  try {
    logger.info('Initializing data ingestion scheduler');

    // Get all tenants
    const tenants = await db.select().from(tenantsTable);

    for (const tenant of tenants) {
      // Schedule daily ingestion for each tenant using configurable cron schedule.
      // Default is 30 13 * * * which equals 6:30 PM IST when server timezone is UTC.
      const job = cron.schedule(config.INGESTION_CRON_SCHEDULE, async () => {
        await runIngestionForTenant(tenant.id);
      });

      scheduledJobs[`tenant-${tenant.id}`] = job;
      logger.info({ tenantId: tenant.id, schedule: config.INGESTION_CRON_SCHEDULE }, 'Scheduled daily ingestion');
    }

    // Also schedule an hourly check for urgent tenders (expiring soon)
    const urgentJob = cron.schedule('0 * * * *', async () => {
      await checkForUrgentTenders();
    });

    scheduledJobs['urgent-check'] = urgentJob;
    logger.info('Scheduled hourly urgent tender check');

  } catch (error) {
    logger.error({ error }, 'Failed to initialize ingestion scheduler');
  }
}

/**
 * Run ingestion for a specific tenant
 */
async function runIngestionForTenant(tenantId: number): Promise<void> {
  const startedAt = new Date();
  try {
    logger.info({ tenantId }, 'Running scheduled ingestion');

    const result = await ingestTendersFromSources(
      tenantId,
      ['GeM', 'CPPP'],
      {
        minValue: 100000, // Only fetch tenders above 1 lakh
        maxValue: 100000000 // Up to 10 crore
      }
    );

    await db.insert(ingestionRunsTable).values({
      tenantId,
      sources: ['GeM', 'CPPP'],
      imported: result.imported,
      skipped: result.skipped,
      errors: result.errors,
      status: 'completed',
      startedAt,
      completedAt: new Date(),
      description: `Scheduled ingestion completed: imported ${result.imported}, skipped ${result.skipped}, errors ${result.errors.length}`
    });

    logger.info({ tenantId, result }, 'Ingestion completed');
  } catch (error: any) {
    await db.insert(ingestionRunsTable).values({
      tenantId,
      sources: ['GeM', 'CPPP'],
      imported: 0,
      skipped: 0,
      errors: [error?.message ?? 'Unknown error'],
      status: 'failed',
      startedAt,
      completedAt: new Date(),
      description: `Scheduled ingestion failed: ${error?.message ?? 'Unknown error'}`
    });
    logger.error({ tenantId, error }, 'Ingestion failed for tenant');
  }
}

/**
 * Check for tenders expiring in next 7 days
 */
async function checkForUrgentTenders(): Promise<void> {
  try {
    logger.debug('Checking for urgent tenders');

    // In production, query tenders expiring in next 7 days
    // and trigger alerts
    // This is a placeholder for the actual implementation

  } catch (error) {
    logger.error({ error }, 'Failed to check urgent tenders');
  }
}

/**
 * Stop all scheduled jobs
 */
export function stopIngestionScheduler(): void {
  try {
    logger.info('Stopping ingestion scheduler');

    for (const [key, job] of Object.entries(scheduledJobs)) {
      job.stop();
      logger.info({ jobId: key }, 'Stopped scheduled job');
    }

    scheduledJobs = {};
  } catch (error) {
    logger.error({ error }, 'Failed to stop scheduler');
  }
}

/**
 * Get scheduler status
 */
export function getSchedulerStatus(): {
  isRunning: boolean;
  activeJobs: number;
  jobs: string[];
} {
  return {
    isRunning: Object.keys(scheduledJobs).length > 0,
    activeJobs: Object.keys(scheduledJobs).length,
    jobs: Object.keys(scheduledJobs)
  };
}

/**
 * Add a new ingestion job for a tenant
 */
export async function addIngestionJobForTenant(tenantId: number): Promise<void> {
  try {
    logger.info({ tenantId }, 'Adding ingestion job for tenant');

    const jobKey = `tenant-${tenantId}`;

    // Check if job already exists
    if (scheduledJobs[jobKey]) {
      logger.warn({ tenantId }, 'Job already exists for tenant');
      return;
    }

    // Schedule daily ingestion
    const job = cron.schedule('30 20 * * *', async () => {
      await runIngestionForTenant(tenantId);
    });

    scheduledJobs[jobKey] = job;
    logger.info({ tenantId }, 'Ingestion job added');
  } catch (error) {
    logger.error({ tenantId, error }, 'Failed to add ingestion job');
  }
}

/**
 * Remove ingestion job for a tenant
 */
export function removeIngestionJobForTenant(tenantId: number): void {
  try {
    logger.info({ tenantId }, 'Removing ingestion job for tenant');

    const jobKey = `tenant-${tenantId}`;

    if (scheduledJobs[jobKey]) {
      scheduledJobs[jobKey].stop();
      delete scheduledJobs[jobKey];
      logger.info({ tenantId }, 'Ingestion job removed');
    }
  } catch (error) {
    logger.error({ tenantId, error }, 'Failed to remove ingestion job');
  }
}
