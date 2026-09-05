import express from 'express';

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, domain: 'NEXORA' });
});

app.post('/api/orders/completed-event', (req, res) => {
  // Production implementation will persist the order transition and outbox event atomically.
  res.status(202).json({ accepted: true, eventType: 'NEXORA_ORDER_COMPLETED' });
});

export { app };

if (process.env.NODE_ENV !== 'test') {
  const port = Number(process.env.PORT ?? 4102);
  app.listen(port, () => console.log(`Nexora API listening on ${port}`));
}
