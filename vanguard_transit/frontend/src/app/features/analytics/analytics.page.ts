import { AsyncPipe, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ReactiveFormsModule, NonNullableFormBuilder } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { catchError, combineLatest, map, of } from 'rxjs';

import { AnalyticsMetrics, CostRecord } from '../../core/api.models';
import { AnalyticsApiService } from '../../core/analytics-api.service';
import { downloadTextFile, toCsv } from '../../shared/download-file';
import { MetricCardComponent } from '../../shared/metric-card.component';
import { StatusBadgeComponent } from '../../shared/status-badge.component';

const FALLBACK_METRICS: AnalyticsMetrics = {
  avgReliability: { value: '98.4%', trend: '+2.1% respecto anterior' },
  opDensity: { value: 42.8, unit: 'Unidad / km2', trend: 'Rendimiento estable' },
  fuelVariance: { value: '+12.4%', trend: 'Umbral crítico' },
};

const FALLBACK_COSTS: readonly CostRecord[] = [
  { category: 'Combustible y energía', currentMonth: '$142.850,00', variance: '+12,4%', status: 'Crítico' },
  { category: 'Mantenimiento de vehículos', currentMonth: '$58.200,00', variance: '-2,1%', status: 'Optimizado' },
  { category: 'Logística de personal', currentMonth: '$215.000,00', variance: '+0,5%', status: 'Estable' },
  { category: 'Tasas de infraestructura', currentMonth: '$12.400,00', variance: '0,0%', status: 'Fijo' },
  { category: 'Reparaciones de emergencia', currentMonth: '$8.900,00', variance: '+4,2%', status: 'Precaución' },
];

interface AnalyticsFilters {
  readonly range: string;
  readonly line: string;
}

@Component({
  selector: 'app-analytics-page',
  standalone: true,
  imports: [AsyncPipe, NgClass, ReactiveFormsModule, MatFormFieldModule, MatSelectModule, MetricCardComponent, StatusBadgeComponent],
  templateUrl: './analytics.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsPage {
  readonly filters = this.formBuilder.group({
    range: 'Últimos 30 días',
    line: 'Todas las líneas',
  });
  readonly appliedFilters = signal<AnalyticsFilters>({ range: 'Últimos 30 días', line: 'Todas las líneas' });
  readonly filterSummary = computed(() => `${this.appliedFilters().range} · ${this.appliedFilters().line}`);
  readonly chartLinePath = computed(() => {
    const range = this.appliedFilters().range;
    if (range.includes('12 meses')) {
      return 'M0,162 Q100,120 200,150 T400,86 T600,96 T800,72';
    }
    if (range.includes('T3')) {
      return 'M0,142 Q100,132 200,118 T400,126 T600,74 T800,102';
    }
    return 'M0,150 Q100,138 200,162 T400,102 T600,80 T800,120';
  });
  readonly chartAreaPath = computed(() => `${this.chartLinePath()} L800,220 L0,220 Z`);
  readonly lineComparison = computed(() => {
    const selectedLine = this.appliedFilters().line;
    const base = [
      { name: 'Tránsito rápido A', value: '1.240 km/día', width: 85 },
      { name: 'Núcleo urbano B', value: '980 km/día', width: 65 },
      { name: 'Conexión suburbana', value: '1.510 km/día', width: 95 },
      { name: 'Ciclo express', value: '420 km/día', width: 35 },
      { name: 'Flujo nocturno', value: '210 km/día', width: 15 },
    ];

    return base.map((line) => ({
      ...line,
      selected: selectedLine === 'Todas las líneas' || selectedLine === line.name,
      width: `${selectedLine === line.name ? Math.min(100, line.width + 8) : line.width}%`,
    }));
  });

  readonly viewModel$ = combineLatest({
    metrics: this.analyticsApi.getMetrics().pipe(catchError(() => of(FALLBACK_METRICS))),
    costs: this.analyticsApi.getCosts().pipe(catchError(() => of([...FALLBACK_COSTS]))),
  }).pipe(
    map(({ metrics, costs }) => ({
      metrics,
      costs: costs.map((cost) => this.normalizeCost(cost)),
    })),
  );

  constructor(
    private readonly formBuilder: NonNullableFormBuilder,
    private readonly analyticsApi: AnalyticsApiService,
  ) {}

  applyFilter(): void {
    this.appliedFilters.set(this.filters.getRawValue());
  }

  exportCsv(costs: readonly CostRecord[]): void {
    const filters = this.appliedFilters();
    const csv = toCsv([
      ['Rango', filters.range],
      ['Línea', filters.line],
      [],
      ['Categoría', 'Mes actual', 'Variación', 'Estado'],
      ...costs.map((cost) => [cost.category, cost.currentMonth, cost.variance, cost.status]),
    ]);

    downloadTextFile('costos-operacionales.csv', csv);
  }

  statusTone(status: string): 'primary' | 'tertiary' | 'error' | 'neutral' {
    const normalized = status.toLowerCase();
    if (normalized.includes('critical') || normalized.includes('crítico')) {
      return 'error';
    }
    if (normalized.includes('optimized') || normalized.includes('optimizado')) {
      return 'primary';
    }
    if (normalized.includes('caution') || normalized.includes('precaución')) {
      return 'tertiary';
    }
    return 'neutral';
  }

  varianceClass(variance: string): string {
    if (variance.startsWith('-')) {
      return 'text-primary';
    }
    if (variance.startsWith('+')) {
      return 'text-error';
    }
    return 'text-on-surface-variant';
  }

  private normalizeCost(cost: CostRecord): CostRecord {
    const categoryMap: Record<string, string> = {
      'Fuel & Energy': 'Combustible y energía',
      'Vehicle Maintenance': 'Mantenimiento de vehículos',
      'Personnel Logistics': 'Logística de personal',
      'Infrastructure Fees': 'Tasas de infraestructura',
      'Emergency Repairs': 'Reparaciones de emergencia',
    };

    const statusMap: Record<string, string> = {
      Critical: 'Crítico',
      Optimized: 'Optimizado',
      Stable: 'Estable',
      Fixed: 'Fijo',
      Caution: 'Precaución',
    };

    return {
      ...cost,
      category: categoryMap[cost.category] ?? cost.category,
      status: statusMap[cost.status] ?? cost.status,
      variance: cost.variance.replace('.', ','),
      currentMonth: this.formatCurrency(cost.currentMonth),
    };
  }

  private formatCurrency(value: string): string {
    const usdLike = value.match(/^\$(?<amount>\d[\d,]*)\.(?<decimals>\d{2})$/);
    if (!usdLike?.groups) {
      return value;
    }

    return `$${usdLike.groups['amount'].replaceAll(',', '.')},${usdLike.groups['decimals']}`;
  }
}
