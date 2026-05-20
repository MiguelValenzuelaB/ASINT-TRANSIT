import { Router } from 'express';

const router = Router();

router.get('/dashboard/kpis', (_req, res) => {
  res.json({
    activeFleet: { value: 1248, unit: 'Vehicles', trend: '+12.4% vs last cycle' },
    efficiencyRate: { value: 94.2, unit: '%', target: 92.0 },
    fuelConsumption: { value: 38.4, unit: 'L/100km', trend: '-2.1% optimization' },
    deadheadDistance: { value: 412, unit: 'km', alert: 'Critical: Zone Alpha' },
  });
});

router.get('/dashboard/activity', (_req, res) => {
  res.json([
    {
      id: 1,
      type: 'error',
      title: 'Route Delay: Line 42',
      description: 'Congestion at Sector 7 causing 12min backup. Redirect recommended.',
      time: '02:14 PM',
    },
    {
      id: 2,
      type: 'success',
      title: 'Deadhead Recalc Complete',
      description: 'Optimization engine reduced total distance by 14km today.',
      time: '01:55 PM',
    },
    {
      id: 3,
      type: 'info',
      title: 'Fleet Expansion',
      description: '4 new electric units integrated into active duty rotation.',
      time: '11:30 AM',
    },
  ]);
});

router.get('/analytics/metrics', (_req, res) => {
  res.json({
    avgReliability: { value: '98.4%', trend: '+2.1% from prev.' },
    opDensity: { value: 42.8, unit: 'UNIT / KM-SQ', status: 'Stable' },
    fuelVariance: { value: '+12.4%', status: 'Critical Threshold' },
  });
});

router.get('/analytics/costs', (_req, res) => {
  res.json([
    { category: 'Fuel & Energy', currentMonth: '$142,850.00', variance: '+12.4%', status: 'Critical' },
    { category: 'Vehicle Maintenance', currentMonth: '$58,200.00', variance: '-2.1%', status: 'Optimized' },
    { category: 'Personnel Logistics', currentMonth: '$215,000.00', variance: '+0.5%', status: 'Stable' },
    { category: 'Infrastructure Fees', currentMonth: '$12,400.00', variance: '0.0%', status: 'Fixed' },
    { category: 'Emergency Repairs', currentMonth: '$8,900.00', variance: '+4.2%', status: 'Caution' },
  ]);
});

router.get('/deadhead/routes', (_req, res) => {
  res.json([
    { id: 'DH-00452-A', distance: '12.4 km', duration: '24m', cost: '$18.40', savings: '+$4.20', status: 'Optimal' },
    { id: 'DH-00452-B', distance: '14.1 km', duration: '31m', cost: '$22.10', savings: '+$0.50', status: 'Sub-Optimal' },
    { id: 'DH-00452-C', distance: '18.2 km', duration: '42m', cost: '$31.50', savings: '-$8.90', status: 'Excessive' },
    { id: 'DH-00452-D', distance: '13.0 km', duration: '26m', cost: '$19.80', savings: '+$2.80', status: 'Optimal' },
  ]);
});

router.get('/routes/lines', (_req, res) => {
  res.json([
    { id: 'ROUTE 45-B', name: 'Central - East Station', eta: '04:12m', status: 'on-time' },
    { id: 'ROUTE 22-A', name: 'University Loop', delay: '+02:30m', status: 'delayed' },
    { id: 'ROUTE 10-X', name: 'Harbor Express', eta: '09:45m', status: 'on-time' },
  ]);
});

export default router;
