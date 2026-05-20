import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [NgClass],
  template: `<span class="badge" [ngClass]="badgeClass">{{ label }}</span>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBadgeComponent {
  @Input({ required: true }) label = '';
  @Input() tone: 'primary' | 'secondary' | 'tertiary' | 'error' | 'neutral' = 'neutral';

  get badgeClass(): string {
    return {
      primary: 'bg-primary/15 text-primary',
      secondary: 'bg-secondary/15 text-secondary',
      tertiary: 'bg-tertiary/15 text-tertiary',
      error: 'bg-error/15 text-error',
      neutral: 'bg-surface-container-high text-on-surface-variant',
    }[this.tone];
  }
}
