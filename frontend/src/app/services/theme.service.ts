import { Injectable, signal } from '@angular/core';

export type ThemeMode = 'dark' | 'light';

// A Service is like a helper that can be shared across our entire app
@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  // A "signal" is Angular's way of remembering a value (like 'dark' or 'light')
  // and instantly updating the screen if this value ever changes.
  currentTheme = signal<ThemeMode>('dark');

  constructor() {
    this.initTheme();
  }

  private initTheme(): void {
    const savedTheme = localStorage.getItem('jobtrack_theme') as ThemeMode | null;
    if (savedTheme === 'dark' || savedTheme === 'light') {
      this.setTheme(savedTheme);
    } else {
      const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
      this.setTheme(prefersLight ? 'light' : 'dark');
    }

    // Listen for system theme changes if no explicit user preference saved
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
      if (!localStorage.getItem('jobtrack_theme')) {
        this.setTheme(e.matches ? 'light' : 'dark');
      }
    });
  }

  // This function switches between light and dark mode when the user clicks a button
  toggleTheme(event?: MouseEvent): void {
    const nextTheme: ThemeMode = this.currentTheme() === 'dark' ? 'light' : 'dark';

    // The "View Transitions API" is a cool modern browser feature that lets us do smooth animations!
    // It takes a "screenshot" of the old screen, changes the theme, and then animates to the new screen.
    if (typeof document !== 'undefined' && 'startViewTransition' in document) {
      // Find exactly where the user clicked their mouse so the animation starts from there
      const x = event?.clientX ?? window.innerWidth / 2;
      const y = event?.clientY ?? window.innerHeight / 2;
      const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      );

      const transition = (document as any).startViewTransition(() => {
        this.setTheme(nextTheme);
      });

      transition.ready.then(() => {
        const clipPath = [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${endRadius}px at ${x}px ${y}px)`
        ];
        document.documentElement.animate(
          {
            clipPath: nextTheme === 'dark' ? clipPath : clipPath.reverse()
          },
          {
            duration: 500,
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
            pseudoElement: nextTheme === 'dark' ? '::view-transition-old(root)' : '::view-transition-new(root)'
          }
        );
      });
    } else {
      this.setTheme(nextTheme);
    }
  }

  setTheme(theme: ThemeMode): void {
    this.currentTheme.set(theme);
    localStorage.setItem('jobtrack_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }
}
