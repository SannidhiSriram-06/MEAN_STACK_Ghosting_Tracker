import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      type="button"
      class="skiper-theme-toggle"
      [class.is-dark]="theme.currentTheme() === 'dark'"
      (click)="theme.toggleTheme($event)"
      [title]="'Switch to ' + (theme.currentTheme() === 'dark' ? 'Light' : 'Dark') + ' Mode'"
      aria-label="Toggle Theme"
    >
      <svg
        class="skiper-svg"
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <mask id="moon-mask">
          <rect x="0" y="0" width="100%" height="100%" fill="white" />
          <circle class="moon-cutout" cx="12" cy="4" r="8" fill="black" />
        </mask>

        <circle
          class="sun-center"
          cx="12"
          cy="12"
          r="5"
          fill="currentColor"
          mask="url(#moon-mask)"
        />

        <g class="sun-rays" stroke="currentColor">
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </g>
      </svg>
    </button>
  `,
  styles: [`
    .skiper-theme-toggle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      padding: 0;
      border: 1px solid var(--border-subtle);
      border-radius: var(--border-radius-sm);
      background: var(--bg-surface);
      color: var(--text-primary);
      cursor: pointer;
      transition: background 0.2s ease, border-color 0.2s ease, transform 0.15s ease;
    }

    .skiper-theme-toggle:hover {
      background: var(--bg-surface-raised);
      border-color: var(--border-glass);
      transform: scale(1.04);
    }

    .skiper-theme-toggle:active {
      transform: scale(0.96);
    }

    .skiper-svg {
      transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .sun-center {
      transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), r 0.5s cubic-bezier(0.4, 0, 0.2, 1);
      transform-origin: center;
    }

    .moon-cutout {
      transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), cx 0.5s cubic-bezier(0.4, 0, 0.2, 1), cy 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .sun-rays {
      transition: opacity 0.4s ease, transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
      transform-origin: center;
    }

    .skiper-theme-toggle.is-dark .skiper-svg {
      transform: rotate(-30deg);
    }

    .skiper-theme-toggle.is-dark .sun-center {
      transform: scale(1.15);
    }

    .skiper-theme-toggle.is-dark .moon-cutout {
      transform: translate(3px, -3px);
    }

    .skiper-theme-toggle.is-dark .sun-rays {
      opacity: 0;
      transform: rotate(45deg) scale(0.6);
    }

    .skiper-theme-toggle:not(.is-dark) .skiper-svg {
      transform: rotate(90deg);
    }

    .skiper-theme-toggle:not(.is-dark) .moon-cutout {
      transform: translate(10px, -10px);
    }

    .skiper-theme-toggle:not(.is-dark) .sun-rays {
      opacity: 1;
      transform: rotate(0deg) scale(1);
    }
  `]
})
export class ThemeToggleComponent {
  protected readonly theme = inject(ThemeService);
}
