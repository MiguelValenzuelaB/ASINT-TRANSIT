import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, of } from 'rxjs';

import { TransitLine } from '../../core/api.models';
import { RoutesApiService } from '../../core/routes-api.service';
import { StatusBadgeComponent } from '../../shared/status-badge.component';

const FALLBACK_LINES: readonly TransitLine[] = [
  { id: 'ROUTE 45-B', name: 'Central - Estación Este', eta: '04:12m', status: 'on-time' },
  { id: 'ROUTE 22-A', name: 'Bucle Universitario', delay: '+02:30m', status: 'delayed' },
  { id: 'ROUTE 10-X', name: 'Expreso Puerto', eta: '09:45m', status: 'on-time' },
];

@Component({
  selector: 'app-route-planner-page',
  standalone: true,
  imports: [NgClass, ReactiveFormsModule, StatusBadgeComponent],
  templateUrl: './route-planner.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoutePlannerPage {
  readonly weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const;
  readonly timelineHours = ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00', '00:00', '02:00', '04:00'] as const;
  readonly lines = signal<TransitLine[]>([...FALLBACK_LINES]);
  readonly selectedDayIndex = signal(1);
  readonly period = signal<'daily' | 'weekly'>('daily');
  readonly capacity = signal(58);
  readonly createPanelOpen = signal(false);
  readonly routeForm = this.formBuilder.group({
    id: 'ROUTE 80-N',
    name: 'Nuevo corredor norte',
    eta: '07:30m',
    status: 'on-time',
  });

  readonly selectedDateLabel = computed(() => {
    const names = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    return `${names[this.selectedDayIndex()]}, 24 Oct`;
  });
  readonly operationalPercent = computed(() => {
    const total = this.lines().length || 1;
    const healthy = this.lines().filter((line) => line.status !== 'delayed').length;
    return Math.round((healthy / total) * 100);
  });
  readonly driverAvailability = computed(() => [
    { color: 'bg-primary', label: 'Servicio activo', count: String(Math.round(this.capacity() / 4)), tone: 'primary' },
    { color: 'bg-tertiary', label: 'En espera', count: String(Math.max(2, 10 - this.selectedDayIndex())), tone: 'tertiary' },
    { color: 'bg-error', label: 'Fuera de servicio', count: String(this.period() === 'weekly' ? 5 : 8), tone: 'error' },
  ]);
  readonly timelineSlots = computed(() => {
    const dayOffset = this.selectedDayIndex() * 4;
    const densityOffset = Math.max(0, Math.round((this.capacity() - 32) / 8));
    const weeklyBoost = this.period() === 'weekly' ? 8 : 0;

    return [
      { id: 'LINE 402-A', name: 'Centro de Tránsito Norte', left: `${10 + dayOffset / 4}%`, width: `${32 + densityOffset + weeklyBoost}%`, label: 'TURNO MAÑANA - OP-45', color: 'primary' },
      { id: 'LINE 110-C', name: 'Expreso Centro', left: `${15 + dayOffset / 5}%`, width: `${28 + densityOffset}%`, label: 'HORAS PICO - OP-12', color: 'tertiary' },
      { id: 'LINE 99-Z', name: 'Bucle Industrial', left: `${5 + dayOffset / 6}%`, width: `${24 + weeklyBoost}%`, label: 'CICLO NOCTURNO - OP-88', color: 'primary' },
    ];
  });

  constructor(
    private readonly routesApi: RoutesApiService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly formBuilder: NonNullableFormBuilder,
  ) {
    this.routesApi
      .getLines()
      .pipe(catchError(() => of([...FALLBACK_LINES])))
      .subscribe((lines) => this.lines.set(lines.map((line) => ({ ...line, name: line.name.replace('East Station', 'Estación Este') }))));

    this.route.queryParamMap.subscribe((params) => {
      if (params.get('newRoute') === 'true') {
        this.createPanelOpen.set(true);
      }
      if (params.get('mode') === 'weekly') {
        this.period.set('weekly');
      }
    });
  }

  setPeriod(period: 'daily' | 'weekly'): void {
    this.period.set(period);
  }

  selectDay(index: number): void {
    this.selectedDayIndex.set(index);
  }

  updateCapacity(value: string): void {
    this.capacity.set(Number(value));
  }

  openCreatePanel(): void {
    this.createPanelOpen.set(true);
  }

  closeCreatePanel(): void {
    this.createPanelOpen.set(false);
    void this.router.navigate([], { relativeTo: this.route, queryParams: { newRoute: null }, queryParamsHandling: 'merge' });
  }

  createRoute(): void {
    const values = this.routeForm.getRawValue();
    const nextLine: TransitLine = {
      id: values.id.trim().toUpperCase(),
      name: values.name.trim(),
      eta: values.status === 'delayed' ? undefined : values.eta,
      delay: values.status === 'delayed' ? '+03:00m' : undefined,
      status: values.status,
    };

    this.lines.update((lines) => [nextLine, ...lines]);
    this.closeCreatePanel();
  }

  lineIcon(status: string): string {
    return status === 'delayed' ? 'warning' : 'check_circle';
  }
}
