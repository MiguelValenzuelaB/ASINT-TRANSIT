import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-execution-management',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="px-4 py-6 md:px-8 md:py-8">
      <header class="mb-6">
        <p class="font-label text-[10px] font-bold uppercase tracking-widest text-primary">Ejecución operacional</p>
        <h1 class="mt-1 font-headline text-2xl font-bold uppercase tracking-tight text-on-surface md:text-3xl">Gestión</h1>
        <p class="mt-2 max-w-2xl text-sm leading-relaxed text-on-surface-variant">
          Gestión en terreno integrada con el bot de Telegram de Josué para comunicación operacional con conductores.
        </p>
      </header>

      <article class="card-accent-primary">
        <div class="flex items-start gap-4">
          <span class="material-symbols-outlined text-3xl text-primary">forum</span>
          <div>
            <h2 class="section-title">Integración Telegram</h2>
            <p class="mt-2 text-sm leading-relaxed text-on-surface-variant">
              Aquí se mostrará la consola de mensajes, las incidencias reportadas y el estado de la flota en terreno.
            </p>
          </div>
        </div>
      </article>
    </section>
  `,
})
export class ExecutionManagementPage {}
