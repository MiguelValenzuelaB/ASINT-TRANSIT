export interface KpiMetric {
  readonly value: number | string;
  readonly unit?: string;
  readonly trend?: string;
  readonly target?: number;
  readonly alert?: string;
  readonly status?: string;
}

export interface DashboardKpis {
  readonly activeFleet: KpiMetric;
  readonly efficiencyRate: KpiMetric;
  readonly fuelConsumption: KpiMetric;
  readonly deadheadDistance: KpiMetric;
}

export interface ActivityItem {
  readonly id: number;
  readonly type: 'error' | 'success' | 'info';
  readonly title: string;
  readonly description: string;
  readonly time: string;
}

export interface AnalyticsMetrics {
  readonly avgReliability: KpiMetric;
  readonly opDensity: KpiMetric;
  readonly fuelVariance: KpiMetric;
}

export interface CostRecord {
  readonly category: string;
  readonly currentMonth: string;
  readonly variance: string;
  readonly status: string;
}

export interface DeadheadRoute {
  readonly id: string;
  readonly distance: string;
  readonly duration: string;
  readonly cost: string;
  readonly savings: string;
  readonly status: string;
}

export interface TransitLine {
  readonly id: string;
  readonly name: string;
  readonly eta?: string;
  readonly delay?: string;
  readonly status: 'on-time' | 'delayed' | string;
}
