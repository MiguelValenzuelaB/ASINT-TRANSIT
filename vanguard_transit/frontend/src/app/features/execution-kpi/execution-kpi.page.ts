import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { KpiIpComponent } from './kpi-ip.component';

type KpiTab = 'icf' | 'ip' | 'ir';

@Component({
  selector: 'app-execution-kpi',
  standalone: true,
  imports: [KpiIpComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="px-4 py-6 md:px-8 md:py-8">
      <header class="mb-6">
        <p class="font-label text-[10px] font-bold uppercase tracking-widest text-primary">Ejecución operacional</p>
        <h1 class="mt-1 font-headline text-2xl font-bold uppercase tracking-tight text-on-surface md:text-3xl">Control de gestión (KPI)</h1>
        <p class="mt-2 max-w-2xl text-sm leading-relaxed text-on-surface-variant">
          Indicadores clave de desempeño operacional: cumplimiento de planes, eficiencia y desviaciones.
        </p>
      </header>

      <!-- Pestañas -->
      <div class="mb-6 flex gap-1 rounded-xl bg-surface-container p-1">
        @for (tab of tabs; track tab.id) {
          <button
            class="flex-1 rounded-lg px-4 py-2 font-label text-xs font-bold uppercase tracking-widest transition-colors"
            [class]="activeTab() === tab.id
              ? 'bg-surface text-primary shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'"
            type="button"
            (click)="activeTab.set(tab.id)"
          >
            {{ tab.label }}
          </button>
        }
      </div>

      <!-- Contenido por pestaña -->
      @if (activeTab() === 'ip') {
        <app-kpi-ip />
      } @else if (activeTab() === 'icf') {
        <article class="card-accent-secondary">
          <div class="flex items-start gap-4">
            <span class="material-symbols-outlined text-3xl text-secondary">construction</span>
            <div>
              <h2 class="section-title">ICF — Índice de Control de Frecuencia</h2>
              <p class="mt-2 text-sm leading-relaxed text-on-surface-variant">
                Esta sección está en construcción. Próximamente podrás calcular y visualizar el ICF desde aquí.
              </p>
            </div>
          </div>
        </article>
      } @else if (activeTab() === 'ir') {
        <article class="card-accent-secondary">
          <div class="flex items-start gap-4">
            <span class="material-symbols-outlined text-3xl text-secondary">construction</span>
            <div>
              <h2 class="section-title">IR — Índice de Regularidad</h2>
              <p class="mt-2 text-sm leading-relaxed text-on-surface-variant">
                Esta sección está en construcción. Próximamente podrás calcular y visualizar el IR desde aquí.
              </p>
            </div>
          </div>
        </article>
      }
    </section>
  `,
})
export class ExecutionKpiPage {
  readonly activeTab = signal<KpiTab>('ip');

  readonly tabs: { id: KpiTab; label: string }[] = [
    { id: 'icf', label: 'ICF' },
    { id: 'ip',  label: 'IP' },
    { id: 'ir',  label: 'IR' },
  ];
}
