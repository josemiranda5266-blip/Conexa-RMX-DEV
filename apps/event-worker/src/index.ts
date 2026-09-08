import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import { processNexoraOrderCompleted } from '../../api-conexa/src/eventConsumer.js';
import { expireAndReleaseEligibleEscrows } from '../../api-nexora/src/escrowService.js';
import { expireOverdueChargebackCases } from '../../api-nexora/src/chargebackExpiry.js';

const SCHEDULE = process.env.NEXORA_OUTBOX_SCHEDULE || 'every 5 minutes';
const BATCH_LIMIT = parseBoundedInteger(process.env.NEXORA_OUTBOX_BATCH_LIMIT, 20, 1, 50);
const MAX_INSTANCES = parseBoundedInteger(process.env.NEXORA_OUTBOX_MAX_INSTANCES, 1, 1, 10);
const ESCROW_SCHEDULE = process.env.NEXORA_ESCROW_SCHEDULE || 'every 15 minutes';
const ESCROW_BATCH_LIMIT = parseBoundedInteger(process.env.NEXORA_ESCROW_BATCH_LIMIT, 100, 1, 100);
const ESCROW_MAX_INSTANCES = parseBoundedInteger(process.env.NEXORA_ESCROW_MAX_INSTANCES, 1, 1, 10);
const CHARGEBACK_EXPIRY_SCHEDULE = process.env.NEXORA_CHARGEBACK_EXPIRY_SCHEDULE || 'every 15 minutes';
const CHARGEBACK_EXPIRY_MAX_INSTANCES = parseBoundedInteger(process.env.NEXORA_CHARGEBACK_EXPIRY_MAX_INSTANCES, 1, 1, 10);

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

export async function runNexoraEscrowWorker(): Promise<{ scanned: number; released: number }> {
  const startedAt = Date.now();
  const result = await expireAndReleaseEligibleEscrows(ESCROW_BATCH_LIMIT);
  logger.info('Nexora escrow worker completed', {
    ...result,
    batchLimit: ESCROW_BATCH_LIMIT,
    durationMs: Date.now() - startedAt,
  });
  return result;
}

export async function runNexoraChargebackExpiryWorker(): Promise<number> {
  const startedAt = Date.now();
  const expired = await expireOverdueChargebackCases();
  logger.info('Nexora chargeback expiry worker completed', {
    expired,
    durationMs: Date.now() - startedAt,
  });
  return expired;
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

export const processNexoraEscrow = onSchedule(
  {
    schedule: ESCROW_SCHEDULE,
    region: 'us-central1',
    timeoutSeconds: 120,
    memory: '256MiB',
    maxInstances: ESCROW_MAX_INSTANCES,
  },
  async () => {
    try {
      await runNexoraEscrowWorker();
    } catch (error) {
      logger.error('Nexora escrow worker failed', {
        error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
      });
      throw error;
    }
  },
);

export const processNexoraChargebackExpiry = onSchedule(
  {
    schedule: CHARGEBACK_EXPIRY_SCHEDULE,
    region: 'us-central1',
    timeoutSeconds: 120,
    memory: '256MiB',
    maxInstances: CHARGEBACK_EXPIRY_MAX_INSTANCES,
  },
  async () => {
    try {
      await runNexoraChargebackExpiryWorker();
    } catch (error) {
      logger.error('Nexora chargeback expiry worker failed', {
        error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
      });
      throw error;
    }
  },
);
