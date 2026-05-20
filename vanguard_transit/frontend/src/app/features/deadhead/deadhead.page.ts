import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { catchError, of } from 'rxjs';

import { DeadheadRoute } from '../../core/api.models';
import { DeadheadApiService } from '../../core/deadhead-api.service';
import { downloadTextFile, toCsv } from '../../shared/download-file';
import { StatusBadgeComponent } from '../../shared/status-badge.component';

const FALLBACK_ROUTES: readonly DeadheadRoute[] = [
  { id: 'DH-00452-A', distance: '12.4 km', duration: '24m', cost: '$18.40', savings: '+$4.20', status: 'Óptimo' },
  { id: 'DH-00452-B', distance: '14.1 km', duration: '31m', cost: '$22.10', savings: '+$0.50', status: 'Subóptimo' },
  { id: 'DH-00452-C', distance: '18.2 km', duration: '42m', cost: '$31.50', savings: '-$8.90', status: 'Excesivo' },
  { id: 'DH-00452-D', distance: '13.0 km', duration: '26m', cost: '$19.80', savings: '+$2.80', status: 'Óptimo' },
];

interface DeadheadStats {
  readonly savings: string;
  readonly co2: string;
  readonly optimizedRoutes: number;
  readonly efficiency: number;
  readonly note: string;
}

@Component({
  selector: 'app-deadhead-page',
  standalone: true,
  imports: [NgClass, ReactiveFormsModule, MatCheckboxModule, MatFormFieldModule, MatInputModule, MatSelectModule, StatusBadgeComponent],
  templateUrl: './deadhead.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeadheadPage {
  readonly form = this.formBuilder.group({
    origin: 'CENTRAL METRO (HUB-01)',
    destination: 'TERMINAL OESTE (HUB-02)',
    windowStart: '23:00',
    windowEnd: '04:30',
    electricBus: true,
    dieselBus: true,
    hydrogenBus: false,
  });

  readonly origins = ['CENTRAL METRO (HUB-01)', 'PUERTA SUR (SUB-04)', 'ANEXO CENTRO (HUB-03)'] as const;
  readonly destinations = ['TERMINAL OESTE (HUB-02)', 'PLAZA NORTE (SUB-09)', 'DEPOSITO RIO (HUB-05)'] as const;
  readonly routes = signal<DeadheadRoute[]>([...FALLBACK_ROUTES]);
  readonly trendBars = signal([40, 55, 45, 70, 60, 85, 50, 65, 40, 55, 95, 60, 45, 55, 40]);
  readonly stats = signal<DeadheadStats>({
    savings: '$4,280',
    co2: '1.2t',
    optimizedRoutes: 18,
    efficiency: 94.2,
    note: 'El cálculo aprovecha tarificación valle Zona 4 para consumo energético optimizado.',
  });
  readonly lastCalculated = signal('Resultado base cargado desde API central');

  constructor(
    private readonly formBuilder: NonNullableFormBuilder,
    private readonly deadheadApi: DeadheadApiService,
  ) {
    this.deadheadApi
      .getRoutes()
      .pipe(catchError(() => of([...FALLBACK_ROUTES])))
      .subscribe((routes) => this.routes.set(routes.map((route) => ({ ...route, status: this.localizeStatus(route.status) }))));
  }

  calculate(): void {
    const values = this.form.getRawValue();
    const selectedFleet = [values.electricBus, values.dieselBus, values.hydrogenBus].filter(Boolean).length || 1;
    const windowHours = this.windowHours(values.windowStart, values.windowEnd);
    const baseDistance = 10.8 + this.locationFactor(values.origin) + this.locationFactor(values.destination) + Math.max(0, 6 - windowHours) * 0.8;
    const energyFactor = values.electricBus ? 0.88 : values.hydrogenBus ? 0.94 : 1.08;
    const baselineCost = baseDistance * 2.45;
    const variants = [0.92, 1, 1.18, 0.97];

    const nextRoutes = variants.map((factor, index) => {
      const distance = baseDistance * factor;
      const duration = Math.round(distance * (1.75 + index * 0.18));
      const cost = distance * 1.62 * energyFactor;
      const savings = baselineCost - cost;
      const status = index === 2 ? 'Excesivo' : savings > 2 ? 'Óptimo' : 'Subóptimo';

      return {
        id: `DH-${String(Math.round(baseDistance * 100)).padStart(5, '0')}-${String.fromCharCode(65 + index)}`,
        distance: `${distance.toFixed(1)} km`,
        duration: `${duration}m`,
        cost: this.money(cost),
        savings: `${savings >= 0 ? '+' : '-'}${this.money(Math.abs(savings))}`,
        status,
      };
    });

    const efficiency = Math.min(98, Math.max(78, 82 + selectedFleet * 3.2 + windowHours * 0.7 - baseDistance * 0.18));
    const monthlySavings = nextRoutes.reduce((sum, route) => sum + this.parseMoney(route.savings), 0) * 240;
    const co2 = Math.max(0.7, baseDistance * 0.085 * selectedFleet);

    this.routes.set(nextRoutes);
    this.stats.set({
      savings: this.money(monthlySavings),
      co2: `${co2.toFixed(1)}t`,
      optimizedRoutes: nextRoutes.filter((route) => route.status === 'Óptimo').length * 6,
      efficiency: Number(efficiency.toFixed(1)),
      note: `Ventana operacional de ${windowHours.toFixed(1)}h entre ${values.origin} y ${values.destination}.`,
    });
    this.trendBars.set(nextRoutes.concat(nextRoutes, nextRoutes, nextRoutes).slice(0, 15).map((route, index) => Math.min(96, 38 + this.parseMoney(route.savings) * 7 + index * 3)));
    this.lastCalculated.set(`Calculado ${new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`);
  }

  exportReport(): void {
    const values = this.form.getRawValue();
    const csv = toCsv([
      ['Campo', 'Valor'],
      ['Origen', values.origin],
      ['Destino', values.destination],
      ['Ventana', `${values.windowStart} - ${values.windowEnd}`],
      ['Eficiencia', `${this.stats().efficiency}%`],
      [],
      ['Ruta', 'Distancia', 'Duración', 'Costo', 'Ahorro', 'Estado'],
      ...this.routes().map((route) => [route.id, route.distance, route.duration, route.cost, route.savings, route.status]),
    ]);

    downloadTextFile('movimientos-en-vacio.csv', csv);
    this.lastCalculated.set('Informe descargado');
  }

  statusTone(status: string): 'primary' | 'tertiary' | 'error' | 'neutral' {
    const normalized = status.toLowerCase();
    if (normalized.includes('optimal') || normalized.includes('óptimo')) {
      return 'primary';
    }
    if (normalized.includes('excessive') || normalized.includes('excesivo')) {
      return 'error';
    }
    if (normalized.includes('sub')) {
      return 'tertiary';
    }
    return 'neutral';
  }

  savingsClass(value: string): string {
    return value.startsWith('-') ? 'text-error' : 'text-primary';
  }

  private windowHours(start: string, end: string): number {
    const [startHour, startMinute] = start.split(':').map(Number);
    const [endHour, endMinute] = end.split(':').map(Number);
    const startValue = startHour + startMinute / 60;
    const endValue = endHour + endMinute / 60;
    const diff = endValue - startValue;
    return diff > 0 ? diff : diff + 24;
  }

  private locationFactor(location: string): number {
    if (location.includes('SUR') || location.includes('OESTE')) {
      return 2.4;
    }
    if (location.includes('RIO') || location.includes('NORTE')) {
      return 3.1;
    }
    return 1.2;
  }

  private money(value: number): string {
    return `$${value.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
  }

  private parseMoney(value: string): number {
    const numeric = Number(value.replace(/[+$,]/g, '').trim());
    return Number.isFinite(numeric) ? numeric : 0;
  }

  private localizeStatus(status: string): string {
    return status.replace('Optimal', 'Óptimo').replace('Sub-Optimal', 'Subóptimo').replace('Excessive', 'Excesivo');
  }
}
