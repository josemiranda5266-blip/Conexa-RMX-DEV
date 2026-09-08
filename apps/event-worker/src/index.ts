import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import { processNexoraOrderCompleted } from '../../api-conexa/src/eventConsumer.js';

const SCHEDULE = process.env.NEXORA_OUTBOX_SCHEDULE || 'every 5 minutes';
const BATCH_LIMIT = parseBoundedInteger(process.env.NEXORA_OUTBOX_BATCH_LIMIT, 20, 1, 50);
const MAX_INSTANCES = parseBoundedInteger(process.env.NEXORA_OUTBOX_MAX_INSTANCES, 1, 1, 10);

function parseBoundedInteger(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

export async function runNexoraOutboxWorker(): Promise<number> {
  const startedAt = Date.now();
  const processed = await processNexoraOrderCompleted(BATCH_LIMIT);
  logger.info('Nexora outbox worker completed', {
    processed,
    batchLimit: BATCH_LIMIT,
    durationMs: Date.now() - startedAt,
  });
  return processed;
}

export const processNexoraOutbox = onSchedule(
  {
    schedule: SCHEDULE,
    region: 'us-central1',
    timeoutSeconds: 120,
    memory: '256MiB',
    maxInstances: MAX_INSTANCES,
  },
  async () => {
    try {
      await runNexoraOutboxWorker();
    } catch (error) {
      logger.error('Nexora outbox worker failed', {
        error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
      });
      throw error;
    }
  },
);
