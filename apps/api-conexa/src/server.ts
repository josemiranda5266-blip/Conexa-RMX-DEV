import express from 'express';
import { timingSafeEqual } from 'node:crypto';
import { processNexoraOrderCompleted } from './eventConsumer.js';

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, domain: 'CONEXA' }));

function validInternalSecret(value: string | undefined): boolean {
  const expected = process.env.INTERNAL_EVENT_SECRET;
  if (!expected || !value) return false;
  const a = Buffer.from(value);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

app.post('/internal/events/process-nexora', async (req, res) => {
  if (!validInternalSecret(req.header('x-internal-event-secret'))) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const processed = await processNexoraOrderCompleted(Number(req.body?.limit) || 20);
    return res.json({ processed });
  } catch { return res.status(500).json({ error: 'Unable to process event outbox' }); }
});

export { app };

if (process.env.NODE_ENV !== 'test') {
  const port = Number(process.env.PORT ?? 4101);
  app.listen(port, () => console.log(`Conexa API listening on ${port}`));
}
