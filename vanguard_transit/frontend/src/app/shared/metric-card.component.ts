import { DecimalPipe, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-metric-card',
  standalone: true,
  imports: [DecimalPipe, NgClass],
  template: `
    <article class="rounded-xl border-l-2 bg-surface-container-low p-5 transition-colors hover:bg-surface-container-high" [ngClass]="accentClass">
      <p class="mb-2 font-label text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">{{ label }}</p>
      <div class="flex items-baseline gap-2">
        <span class="font-headline text-3xl font-bold" [ngClass]="valueClass">
          @if (isNumeric(value)) {
            {{ value | number }}
          } @else {
            {{ value }}
          }
        </span>
        @if (unit) {
          <span class="font-label text-[10px] font-bold uppercase text-on-surface-variant/70">{{ unit }}</span>
        }
      </div>
      @if (meta) {
        <div class="mt-4 flex items-center gap-1 font-label text-[10px]" [ngClass]="valueClass">
          <span class="material-symbols-outlined text-xs">{{ icon }}</span>
          <span>{{ meta }}</span>
        </div>
      }
    </article>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricCardComponent {
  @Input({ required: true }) label = '';
  @Input({ required: true }) value: number | string = '';
  @Input() unit = '';
  @Input() meta = '';
  @Input() icon = 'trending_up';
  @Input() tone: 'primary' | 'secondary' | 'tertiary' | 'error' = 'primary';

  get accentClass(): string {
    return {
      primary: 'border-primary',
      secondary: 'border-secondary',
      tertiary: 'border-tertiary',
      error: 'border-error',
    }[this.tone];
  }

  get valueClass(): string {
    return {
      primary: 'text-primary',
      secondary: 'text-secondary',
      tertiary: 'text-tertiary',
      error: 'text-error',
    }[this.tone];
  }

  isNumeric(value: number | string): value is number {
    return typeof value === 'number';
  }
}
