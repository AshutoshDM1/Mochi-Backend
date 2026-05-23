import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { executeUrlCheck } from './url-checker.service';
import { updateUrlStatistics } from './stats-updater.service';
import { sendEmail } from '../utils/resend';

// Store scheduled tasks
const scheduledTasks: Map<string, cron.ScheduledTask> = new Map();

let executionHeaderPrinted = false;

function isDownLike(status: string): boolean {
  return status === 'DOWN' || status === 'ERROR';
}

/**
 * Execute a single cron job: check URL and update statistics
 */
async function executeCronJob(cronId: string, urlId: string, urlString: string): Promise<void> {
  try {
    // Get previous status + user email (for alerting)
    const urlRecord = await prisma.url.findUnique({
      where: { id: urlId },
      include: {
        cron: {
          include: {
            user: true,
          },
        },
      },
    });

    const previousStatus = urlRecord?.status ?? 'PENDING';

    // Check the URL and log result
    const result = await executeUrlCheck(urlId, urlString);

    // Update URL statistics
    await updateUrlStatistics(urlId, result);

    // Send an alert only when the site transitions into DOWN/ERROR from a non-down state.
    // This avoids sending on initial PENDING/UP and prevents repeat spam every cron tick.
    if (urlRecord?.cron?.user?.email) {
      const transitionedToDown =
        isDownLike(result.status) && !isDownLike(String(previousStatus));

      if (transitionedToDown) {
        try {
          await sendEmail({
            to: urlRecord.cron.user.email,
            subject: `💀 Website Down: ${urlString}`,
            userName: urlRecord.cron.user.username ?? 'User',
            userEmail: urlRecord.cron.user.email,
            websiteUrl: urlString,
            currentStatus: result.status,
            lastCheckedAt: new Date().toISOString(),
            lastStatus: previousStatus,
            totalChecks: urlRecord.totalChecks,
            averageResponseTimeMs: urlRecord.averageResponseTime,
            totalUpTimeSeconds: urlRecord.totalUpTime,
            totalDownTimeSeconds: urlRecord.totalDownTime,
            cronInterval: urlRecord.cron.interval,
            statusCode: result.statusCode ?? null,
            responseTimeMs: result.responseTime ?? null,
            errorType: result.errorType ?? null,
            errorMessage: result.errorMessage ?? null,
          });
        } catch (e) {
          console.error('[Email] Failed to send down alert:', e);
        }
      }
    }

    // Keep logs minimal and tabular: URL + computed status.
    if (!executionHeaderPrinted) {
      console.log('\n=== Cron Execution ===');
      executionHeaderPrinted = true;
    }

    const displayUrl =
      urlString.length > 67 ? `${urlString.slice(0, 67)}...` : urlString;

    console.table([
      {
        url: displayUrl,
        status: result.status,
      },
    ]);
  } catch (error) {
    // If something unexpected fails, still print URL + ERROR.
    if (!executionHeaderPrinted) {
      console.log('\n=== Cron Execution ===');
      executionHeaderPrinted = true;
    }
    const displayUrl =
      urlString.length > 67 ? `${urlString.slice(0, 67)}...` : urlString;

    console.table([
      {
        url: displayUrl,
        status: 'ERROR',
      },
    ]);
  }
}

/**
 * Schedule a single cron job
 */
function scheduleCronJob(
  cronId: string,
  urlId: string,
  urlString: string,
  interval: string
): boolean {
  try {
    // Validate cron expression
    if (!cron.validate(interval)) {
      console.error(`[Cron Scheduler] Invalid cron expression: ${interval} for cron ${cronId}`);
      return false;
    }

    // If task already exists, stop it first
    if (scheduledTasks.has(cronId)) {
      const existingTask = scheduledTasks.get(cronId);
      existingTask?.stop();
      scheduledTasks.delete(cronId);
    }

    // Schedule the task
    const task = cron.schedule(
      interval,
      async () => {
        await executeCronJob(cronId, urlId, urlString);
      },
      {
        scheduled: true,
        timezone: 'UTC', // Use UTC timezone
      }
    );

    scheduledTasks.set(cronId, task);
    return true;
  } catch (error) {
    console.error(`[Cron Scheduler] Error scheduling cron job ${cronId}:`, error);
    return false;
  }
}

/**
 * Schedule a cron job by its DB id (and its related URL).
 * Used to update the running scheduler immediately on create/delete.
 */
export async function scheduleCronJobById(cronId: string): Promise<boolean> {
  try {
    const cronJob = await prisma.cron.findUnique({
      where: { id: cronId },
      include: { url: true },
    });

    if (!cronJob) {
      console.warn(`[Cron Scheduler] scheduleCronJobById: cron not found: ${cronId}`);
      return false;
    }

    if (!cronJob.url) {
      console.warn(
        `[Cron Scheduler] scheduleCronJobById: cron ${cronId} has no URL, skipping`
      );
      return false;
    }

    const scheduled = scheduleCronJob(
      cronJob.id,
      cronJob.url.id,
      cronJob.url.url,
      cronJob.interval
    );

    if (scheduled) {
      console.log('\n=== Cron Scheduler ===');
      console.table([
        {
          url: cronJob.url.url,
          state: 'SCHEDULED',
        },
      ]);
    }

    return scheduled;
  } catch (error) {
    console.error(`[Cron Scheduler] Error scheduling cron job by id (${cronId}):`, error);
    return false;
  }
}

/**
 * Stop a scheduled cron job
 */
export function stopCronJob(cronId: string): boolean {
  const task = scheduledTasks.get(cronId);
  if (task) {
    task.stop();
    scheduledTasks.delete(cronId);
    return true;
  }
  return false;
}

/**
 * Initialize all cron jobs from database
 */
export async function initializeCronJobs(): Promise<void> {
  try {
    // Fetch all cron jobs with their URLs
    const cronJobs = await prisma.cron.findMany({
      include: {
        url: true,
      },
    });

    let scheduledCount = 0;
    const scheduledRows: Array<{ url: string; state: string }> = [];

    // Schedule each cron job
    for (const cronJob of cronJobs) {
      if (!cronJob.url) {
        console.warn(`[Cron Scheduler] Cron ${cronJob.id} has no associated URL, skipping`);
        continue;
      }

      const success = scheduleCronJob(
        cronJob.id,
        cronJob.url.id,
        cronJob.url.url,
        cronJob.interval
      );

      if (success) {
        scheduledCount++;
        scheduledRows.push({ url: cronJob.url.url, state: 'SCHEDULED' });
      }
    }

    if (scheduledRows.length > 0) {
      console.log('\n=== Cron Scheduler ===');
      console.table(scheduledRows);
      console.log(`[Cron Scheduler] Scheduled ${scheduledCount} job(s)`);
    }
  } catch (error) {
    console.error('[Cron Scheduler] Error initializing cron jobs:', error);
    throw error;
  }
}

/**
 * Stop all scheduled cron jobs
 */
export function stopAllCronJobs(): void {
  scheduledTasks.forEach((task, cronId) => {
    task.stop();
  });

  scheduledTasks.clear();
}

/**
 * Get status of all scheduled jobs
 */
export function getScheduledJobsStatus(): Array<{
  cronId: string;
  isRunning: boolean;
}> {
  const status: Array<{ cronId: string; isRunning: boolean }> = [];
  
  scheduledTasks.forEach((task, cronId) => {
    status.push({
      cronId,
      isRunning: true, // If it's in the map, it's running
    });
  });
  
  return status;
}

/**
 * Reload cron jobs from database (useful after adding/updating/deleting crons)
 */
export async function reloadCronJobs(): Promise<void> {
  stopAllCronJobs();
  await initializeCronJobs();
}
