import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-planning-optimization',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="px-4 py-6 md:px-8 md:py-8">
      <header class="mb-6">
        <p class="font-label text-[10px] font-bold uppercase tracking-widest text-primary">Planificación operacional</p>
        <h1 class="mt-1 font-headline text-2xl font-bold uppercase tracking-tight text-on-surface md:text-3xl">Por optimización</h1>
        <p class="mt-2 max-w-2xl text-sm leading-relaxed text-on-surface-variant">
          Generación de planes operacionales mediante modelos de optimización matemática (programación lineal / entera).
        </p>
      </header>

      <article class="card-accent-primary">
        <div class="flex items-start gap-4">
          <span class="material-symbols-outlined text-3xl text-primary">tune</span>
          <div>
            <h2 class="section-title">Módulo en construcción</h2>
            <p class="mt-2 text-sm leading-relaxed text-on-surface-variant">
              Aquí se configurará la formulación del problema, los parámetros del solver y el resultado del plan óptimo.
            </p>
          </div>
        </div>
      </article>
    </section>
  `,
})
export class PlanningOptimizationPage {}
