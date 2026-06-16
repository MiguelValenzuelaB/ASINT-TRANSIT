import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

const RENDER_BACKEND = 'https://asint-transit.onrender.com';

function longRunUrl(path: string): string {
  if (typeof window === 'undefined') return path;
  const host = window.location.hostname;
  const isLocal = host === 'localhost' || host === '127.0.0.1';
  return isLocal ? path : `${RENDER_BACKEND}${path}`;
}

interface OutputFile {
  readonly name: string;
  readonly size: number;
  readonly modified: string;
  readonly ext: string;
}

interface RunResponse {
  readonly runId: string;
  readonly success: boolean;
  readonly exitCode: number;
  readonly durationMs: number;
  readonly opFile?: string;
  readonly a5File?: string;
  readonly files?: OutputFile[];
  readonly stdoutTail?: string;
  readonly stdout?: string;
  readonly stderr?: string;
  readonly error?: string;
  readonly detail?: string;
}

@Component({
  selector: 'app-kpi-ip',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <header class="mb-6">
        <p class="font-label text-[10px] font-bold uppercase tracking-widest text-primary">Índice de Puntualidad</p>
        <h2 class="mt-1 font-headline text-xl font-bold uppercase tracking-tight text-on-surface md:text-2xl">IP — Automatización</h2>
        <p class="mt-2 max-w-2xl text-sm leading-relaxed text-on-surface-variant">
          Carga el archivo de <strong>Operación (OP)</strong> y el archivo de <strong>horarios programados (A5)</strong>
          para calcular el indicador de puntualidad. Se generarán 2 Excel y 2 gráficos.
        </p>
      </header>

      <!-- Carga de archivos -->
      <article class="card-accent-secondary mb-6">
        <div class="flex flex-col gap-6">

          <!-- OP -->
          <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div class="flex items-center gap-4">
              <span class="material-symbols-outlined text-3xl text-secondary">upload_file</span>
              <div>
                <h3 class="section-title">Archivo de Operación (OP)</h3>
                <p class="mt-1 text-xs text-on-surface-variant">Excel con columnas: Fecha, Variante, Estado, Dirección, etc.</p>
                @if (opFile()) {
                  <p class="mt-1 font-mono text-xs text-on-surface">
                    {{ opFile()!.name }}
                    <span class="text-on-surface-variant">({{ formatBytes(opFile()!.size) }})</span>
                  </p>
                }
              </div>
            </div>
            <div>
              <input #opInput class="hidden" type="file" accept=".xlsx,.xls" (change)="onOpSelected($event)">
              <button class="btn-secondary" type="button" [disabled]="running()" (click)="opInput.click()">
                <span class="material-symbols-outlined text-sm">folder_open</span>
                {{ opFile() ? 'Cambiar' : 'Elegir archivo' }}
              </button>
            </div>
          </div>

          <div class="border-t border-outline-variant/30"></div>

          <!-- A5 -->
          <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div class="flex items-center gap-4">
              <span class="material-symbols-outlined text-3xl text-secondary">schedule</span>
              <div>
                <h3 class="section-title">Archivo de Horarios (A5)</h3>
                <p class="mt-1 text-xs text-on-surface-variant">Excel con columnas: Servicio, Sentido, Hora programada, etc.</p>
                @if (a5File()) {
                  <p class="mt-1 font-mono text-xs text-on-surface">
                    {{ a5File()!.name }}
                    <span class="text-on-surface-variant">({{ formatBytes(a5File()!.size) }})</span>
                  </p>
                }
              </div>
            </div>
            <div>
              <input #a5Input class="hidden" type="file" accept=".xlsx,.xls" (change)="onA5Selected($event)">
              <button class="btn-secondary" type="button" [disabled]="running()" (click)="a5Input.click()">
                <span class="material-symbols-outlined text-sm">folder_open</span>
                {{ a5File() ? 'Cambiar' : 'Elegir archivo' }}
              </button>
            </div>
          </div>

          <!-- Botón ejecutar -->
          <div class="border-t border-outline-variant/30 pt-2 flex justify-end">
            <button class="btn-primary" type="button" [disabled]="!canRun()" (click)="runPuntualidad()">
              @if (running()) {
                <span class="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                Calculando IP...
              } @else {
                <span class="material-symbols-outlined text-sm">play_arrow</span>
                Calcular IP
              }
            </button>
          </div>

        </div>
      </article>

      <!-- Error -->
      @if (errorMessage()) {
        <article class="card-accent-error mb-6">
          <div class="flex items-start gap-3">
            <span class="material-symbols-outlined text-2xl text-error">error</span>
            <div class="min-w-0 flex-1">
              <h3 class="font-headline text-sm font-bold uppercase tracking-widest text-error">Error</h3>
              <p class="mt-1 text-xs text-on-surface">{{ errorMessage() }}</p>
              @if (errorDetail()) {
                <pre class="mt-3 max-h-64 overflow-auto rounded bg-surface-container p-3 font-mono text-[10px] leading-relaxed text-on-surface-variant">{{ errorDetail() }}</pre>
              }
            </div>
          </div>
        </article>
      }

      <!-- Resultado -->
      @if (result(); as r) {
        @if (r.success) {
          <article class="card-accent-primary mb-6">
            <div class="flex items-start gap-3">
              <span class="material-symbols-outlined text-2xl text-primary">check_circle</span>
              <div class="min-w-0 flex-1">
                <h3 class="font-headline text-sm font-bold uppercase tracking-widest text-primary">Ejecución completada</h3>
                <p class="mt-1 text-xs text-on-surface-variant">
                  Run <span class="font-mono text-on-surface">{{ r.runId }}</span>
                  &middot; {{ (r.durationMs / 1000).toFixed(1) }}s
                  &middot; {{ r.files?.length || 0 }} archivos generados
                </p>
              </div>
            </div>
          </article>

          @if (excelFiles().length > 0) {
            <article class="card mb-6">
              <h3 class="section-title mb-4">Archivos Excel</h3>
              <ul class="space-y-2">
                @for (f of excelFiles(); track f.name) {
                  <li class="flex items-center justify-between rounded-lg border border-outline-variant/30 p-3">
                    <div class="flex items-center gap-3">
                      <span class="material-symbols-outlined text-secondary">table_view</span>
                      <div>
                        <p class="font-mono text-xs text-on-surface">{{ f.name }}</p>
                        <p class="text-[10px] text-on-surface-variant">{{ formatBytes(f.size) }}</p>
                      </div>
                    </div>
                    <a class="btn-secondary" [href]="fileUrl(r.runId, f.name)" download>
                      <span class="material-symbols-outlined text-sm">download</span>
                      Descargar
                    </a>
                  </li>
                }
              </ul>
            </article>
          }

          @if (imageFiles().length > 0) {
            <article class="card mb-6">
              <h3 class="section-title mb-4">Gráficos ({{ imageFiles().length }})</h3>
              <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
                @for (f of imageFiles(); track f.name) {
                  <figure class="overflow-hidden rounded-lg border border-outline-variant/30 bg-surface">
                    <a [href]="fileUrl(r.runId, f.name)" target="_blank" rel="noopener">
                      <img class="block w-full object-contain bg-white" [src]="fileUrl(r.runId, f.name)" [alt]="f.name" loading="lazy">
                    </a>
                    <figcaption class="flex items-center justify-between gap-2 border-t border-outline-variant/30 px-3 py-2">
                      <span class="truncate font-mono text-[10px] text-on-surface-variant" [title]="f.name">{{ f.name }}</span>
                      <a class="text-primary hover:text-primary-dim" [href]="fileUrl(r.runId, f.name)" download [title]="'Descargar ' + f.name">
                        <span class="material-symbols-outlined text-sm">download</span>
                      </a>
                    </figcaption>
                  </figure>
                }
              </div>
            </article>
          }

          @if (r.stdoutTail) {
            <details class="mt-4">
              <summary class="cursor-pointer font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                Ver salida del proceso
              </summary>
              <pre class="mt-2 max-h-80 overflow-auto rounded bg-surface-container p-3 font-mono text-[10px] leading-relaxed text-on-surface-variant">{{ r.stdoutTail }}</pre>
            </details>
          }
        }
      }
    </section>
  `,
})
export class KpiIpComponent {
  private readonly http = inject(HttpClient);

  readonly opFile = signal<File | null>(null);
  readonly a5File = signal<File | null>(null);
  readonly running = signal(false);
  readonly result = signal<RunResponse | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly errorDetail = signal<string | null>(null);

  readonly canRun = computed(() => !!this.opFile() && !!this.a5File() && !this.running());

  readonly excelFiles = computed(() =>
    (this.result()?.files ?? []).filter((f) => f.ext === '.xlsx' || f.ext === '.xls'),
  );
  readonly imageFiles = computed(() =>
    (this.result()?.files ?? []).filter((f) => ['.jpg', '.jpeg', '.png', '.svg'].includes(f.ext)),
  );

  onOpSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.opFile.set(input.files?.[0] ?? null);
    this.clearResults();
  }

  onA5Selected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.a5File.set(input.files?.[0] ?? null);
    this.clearResults();
  }

  private clearResults(): void {
    this.result.set(null);
    this.errorMessage.set(null);
    this.errorDetail.set(null);
  }

  runPuntualidad(): void {
    const op = this.opFile();
    const a5 = this.a5File();
    if (!op || !a5) return;

    this.running.set(true);
    this.clearResults();

    const form = new FormData();
    form.append('opFile', op, op.name);
    form.append('a5File', a5, a5.name);

    this.http.post<RunResponse>(longRunUrl('/api/puntualidad/run'), form).subscribe({
      next: (res) => {
        this.running.set(false);
        this.result.set(res);
        if (!res.success) {
          this.errorMessage.set(res.error || `Python terminó con código ${res.exitCode}.`);
          this.errorDetail.set(res.stderr || res.stdout || res.detail || null);
        }
      },
      error: (err) => {
        this.running.set(false);
        const body = err.error ?? {};
        this.errorMessage.set(body.error || err.message || 'Error desconocido en la ejecución.');
        this.errorDetail.set(body.stderr || body.stdout || body.detail || null);
        if (body.runId) {
          this.result.set(body);
        }
      },
    });
  }

  fileUrl(runId: string, name: string): string {
    return `/api/puntualidad/runs/${encodeURIComponent(runId)}/file?path=${encodeURIComponent(name)}`;
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }
}
