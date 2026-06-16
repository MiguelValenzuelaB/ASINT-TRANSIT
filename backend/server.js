import express from 'express';
import cors from 'cors';
import vanguardTransitRouter from './routes/vanguardTransit.js';
import heuristicRouter from './routes/heuristic.js';
import puntualidadRouter from './routes/puntualidad.js';

const app = express();
const PORT = process.env.PORT || 3001;
const DEFAULT_ORIGINS = [
  'http://localhost:5173',
  'https://asint-transit.netlify.app',
];
const allowedOrigins = (process.env.CORS_ORIGINS || DEFAULT_ORIGINS.join(','))
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
      puntualidad: '/api/puntualidad',
    },
  });
});

app.use('/api/vanguard-transit', vanguardTransitRouter);
app.use('/api/heuristic', heuristicRouter);
app.use('/api/puntualidad', puntualidadRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'NOMINAL', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`[ASINT] Central backend running on http://localhost:${PORT}`);
});
