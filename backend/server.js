import express from 'express';
import cors from 'cors';
import vanguardTransitRouter from './routes/vanguardTransit.js';
import heuristicRouter from './routes/heuristic.js';

const app = express();
const PORT = process.env.PORT || 3001;
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.get('/api', (_req, res) => {
  res.json({
    status: 'NOMINAL',
    services: {
      vanguardTransit: '/api/vanguard-transit',
      heuristic: '/api/heuristic',
    },
  });
});

app.use('/api/vanguard-transit', vanguardTransitRouter);
app.use('/api/heuristic', heuristicRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'NOMINAL', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`[ASINT] Central backend running on http://localhost:${PORT}`);
});
