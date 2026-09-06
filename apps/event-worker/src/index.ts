import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import { processNexoraOrderCompleted } from '../../api-conexa/src/eventConsumer.js';

const SCHEDULE = 'every 5 minutes';
const BATCH_LIMIT = 20;

export const processNexoraOutbox = onSchedule(
  {
    schedule: SCHEDULE,
    region: 'us-central1',
    timeoutSeconds: 120,
    memory: '256MiB',
  },
  async () => {
    const processed = await processNexoraOrderCompleted(BATCH_LIMIT);
    logger.info('Nexora outbox worker completed', {
      processed,
      batchLimit: BATCH_LIMIT,
    });
  },
);
