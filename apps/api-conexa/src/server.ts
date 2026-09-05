import express from 'express';

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, domain: 'CONEXA' });
});

export { app };

if (process.env.NODE_ENV !== 'test') {
  const port = Number(process.env.PORT ?? 4101);
  app.listen(port, () => console.log(`Conexa API listening on ${port}`));
}
