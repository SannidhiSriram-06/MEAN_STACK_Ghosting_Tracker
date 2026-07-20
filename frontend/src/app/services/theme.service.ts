import { Injectable, signal, effect } from '@angular/core';

export type ThemeMode = 'dark' | 'light';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
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

  toggleTheme(): void {
    const nextTheme: ThemeMode = this.currentTheme() === 'dark' ? 'light' : 'dark';
    this.setTheme(nextTheme);
  }

  setTheme(theme: ThemeMode): void {
    this.currentTheme.set(theme);
    localStorage.setItem('jobtrack_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }
}
