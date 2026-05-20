import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-execution-kpi',
  standalone: true,
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

      <article class="card-accent-secondary">
        <div class="flex items-start gap-4">
          <span class="material-symbols-outlined text-3xl text-secondary">monitoring</span>
          <div>
            <h2 class="section-title">Tablero de KPI</h2>
            <p class="mt-2 text-sm leading-relaxed text-on-surface-variant">
              Aquí se mostrarán los KPI principales, sus metas y la comparación entre lo planificado y lo ejecutado.
            </p>
          </div>
        </div>
      </article>
    </section>
  `,
})
export class ExecutionKpiPage {}
