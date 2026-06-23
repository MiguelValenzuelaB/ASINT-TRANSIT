import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';

const RENDER_BACKEND = 'https://asint-transit.onrender.com';

function longRunUrl(path: string): string {
  if (typeof window === 'undefined') return path;
  const host = window.location.hostname;
  const isLocal = host === 'localhost' || host === '127.0.0.1';
  return isLocal ? path : `${RENDER_BACKEND}${path}`;
}

export interface RunnerField {
  /** nombre del campo multipart (debe coincidir con el router backend) */
  readonly name: string;
  readonly label: string;
  readonly accept: string;
  readonly hint?: string;
  readonly icon?: string;
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
  readonly files?: OutputFile[];
  readonly stdoutTail?: string;
  readonly stdout?: string;
  readonly stderr?: string;
  readonly error?: string;
  readonly detail?: string;
}

/**
 * Componente reutilizable para ejecutar un indicador Python desde la web:
 * sube N archivos (declarados en `fields`), opcionalmente elige empresa,
 * ejecuta el endpoint y muestra los Excel/gráficos generados.
 */
@Component({
  selector: 'app-indicator-runner',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <header class="mb-6">
        <p class="font-label text-[10px] font-bold uppercase tracking-widest text-primary">{{ eyebrow() }}</p>
        <h2 class="mt-1 font-headline text-xl font-bold uppercase tracking-tight text-on-surface md:text-2xl">{{ title() }}</h2>
        @if (subtitle()) {
          <p class="mt-2 max-w-2xl text-sm leading-relaxed text-on-surface-variant">{{ subtitle() }}</p>
        }
      </header>

      <!-- Carga de archivos + parámetros -->
      <article class="card-accent-secondary mb-6">
        <div class="flex flex-col gap-6">

          @if (showEmpresa()) {
            <div class="flex flex-col gap-2">
              <label class="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Empresa</label>
              <div class="flex gap-1 rounded-lg bg-surface-container p-1 w-fit">
                @for (e of empresas; track e.id) {
                  <button
                    class="rounded-md px-4 py-1.5 font-label text-xs font-bold uppercase tracking-widest transition-colors"
                    [class]="empresa() === e.id ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'"
                    type="button"
                    [disabled]="running()"
                    (click)="empresa.set(e.id)"
                  >
                    {{ e.label }}
                  </button>
                }
              </div>
            </div>
          }

          @for (f of fields(); track f.name) {
            <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div class="flex items-center gap-4">
                <span class="material-symbols-outlined text-3xl text-secondary">{{ f.icon || 'upload_file' }}</span>
                <div>
                  <h3 class="section-title">{{ f.label }}</h3>
                  @if (f.hint) {
                    <p class="mt-1 text-xs text-on-surface-variant">{{ f.hint }}</p>
                  }
                  @if (fileFor(f.name); as file) {
                    <p class="mt-1 font-mono text-xs text-on-surface">
                      {{ file.name }}
                      <span class="text-on-surface-variant">({{ formatBytes(file.size) }})</span>
                    </p>
                  }
                </div>
              </div>
              <div>
                <label class="btn-secondary cursor-pointer">
                  <span class="material-symbols-outlined text-sm">folder_open</span>
                  {{ fileFor(f.name) ? 'Cambiar' : 'Elegir archivo' }}
                  <input class="hidden" type="file" [accept]="f.accept" [disabled]="running()" (change)="onFileSelected(f.name, $event)">
                </label>
              </div>
            </div>
          }

          <div class="border-t border-outline-variant/30 pt-2 flex justify-end">
            <button class="btn-primary" type="button" [disabled]="!canRun()" (click)="run()">
              @if (running()) {
                <span class="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                Procesando...
              } @else {
                <span class="material-symbols-outlined text-sm">play_arrow</span>
                {{ runLabel() }}
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
              <h3 class="section-title mb-4">Reportes Excel ({{ excelFiles().length }})</h3>
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
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                @for (f of imageFiles(); track f.name) {
                  <figure class="overflow-hidden rounded-lg border border-outline-variant/30 bg-surface">
                    <a [href]="fileUrl(r.runId, f.name)" target="_blank" rel="noopener">
                      <img class="block w-full object-contain bg-white" [src]="fileUrl(r.runId, f.name)" [alt]="f.name" loading="lazy">
                    </a>
                    <figcaption class="truncate border-t border-outline-variant/30 px-3 py-2 font-mono text-[10px] text-on-surface-variant" [title]="f.name">{{ f.name }}</figcaption>
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
export class IndicatorRunnerComponent {
  private readonly http = inject(HttpClient);

  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
  readonly eyebrow = input<string>('Control de gestión (KPI)');
  readonly endpoint = input.required<string>();
  readonly fields = input.required<RunnerField[]>();
  readonly showEmpresa = input<boolean>(false);
  readonly runLabel = input<string>('Calcular');

  readonly empresas = [
    { id: 'lider', label: 'Líder' },
    { id: 'toptur', label: 'Top Tur' },
  ];

  readonly empresa = signal<string>('lider');
  readonly selectedFiles = signal<Record<string, File>>({});
  readonly running = signal(false);
  readonly result = signal<RunResponse | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly errorDetail = signal<string | null>(null);

  readonly canRun = computed(() => {
    const sel = this.selectedFiles();
    return this.fields().every((f) => !!sel[f.name]) && !this.running();
  });

  readonly excelFiles = computed(() =>
    (this.result()?.files ?? []).filter((f) => f.ext === '.xlsx' || f.ext === '.xls'),
  );
  readonly imageFiles = computed(() =>
    (this.result()?.files ?? []).filter((f) => ['.png', '.jpg', '.jpeg', '.svg'].includes(f.ext)),
  );

  fileFor(name: string): File | undefined {
    return this.selectedFiles()[name];
  }

  onFileSelected(fieldName: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.selectedFiles.update((m) => ({ ...m, [fieldName]: file }));
    }
    this.clearResults();
  }

  private clearResults(): void {
    this.result.set(null);
    this.errorMessage.set(null);
    this.errorDetail.set(null);
  }

  run(): void {
    if (!this.canRun()) return;

    this.running.set(true);
    this.clearResults();

    const form = new FormData();
    const sel = this.selectedFiles();
    for (const f of this.fields()) {
      const file = sel[f.name];
      form.append(f.name, file, file.name);
    }
    if (this.showEmpresa()) {
      form.append('empresa', this.empresa());
    }

    this.http.post<RunResponse>(longRunUrl(`${this.endpoint()}/run`), form).subscribe({
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
    return `${this.endpoint()}/runs/${encodeURIComponent(runId)}/file?path=${encodeURIComponent(name)}`;
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }
}
