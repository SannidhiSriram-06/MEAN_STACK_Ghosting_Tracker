import { Component, Input, Output, EventEmitter, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate, stagger, query } from '@angular/animations';
import { LucideAngularModule, AudioLines, ShieldCheck, Globe2, ArrowRight } from 'lucide-angular';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';

export interface NavLink {
  label: string;
  href: string;
}

export interface FeatureItem {
  title: string;
  description: string;
  icon: 'audio' | 'shield' | 'globe';
}

@Component({
  selector: 'app-hero-22',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ThemeToggleComponent],
  templateUrl: './hero-22.component.html',
  styleUrls: ['./hero-22.component.css'],
  animations: [
    trigger('imageAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(1.08)' }),
        animate('1200ms cubic-bezier(0.25, 1, 0.5, 1)', style({ opacity: 1, transform: 'scale(1)' }))
      ])
    ]),
    trigger('navAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-20px) scale(0.97)' }),
        animate('800ms 100ms cubic-bezier(0.25, 1, 0.5, 1)', style({ opacity: 1, transform: 'translateY(0) scale(1)' }))
      ])
    ]),
    trigger('copyAnimation', [
      transition(':enter', [
        query('.copy-element', [
          style({ opacity: 0, transform: 'scale(0.94)', filter: 'blur(6px)' }),
          stagger(130, [
            animate('800ms 200ms cubic-bezier(0.25, 1, 0.5, 1)', style({ opacity: 1, transform: 'scale(1)', filter: 'blur(0px)' }))
          ])
        ], { optional: true })
      ])
    ]),
    trigger('featureAnimation', [
      transition(':enter', [
        query('.feature-element', [
          style({ opacity: 0, transform: 'translateY(22px) rotateX(18deg) scale(0.96)' }),
          stagger(140, [
            animate('800ms 300ms cubic-bezier(0.25, 1, 0.5, 1)', style({ opacity: 1, transform: 'translateY(0) rotateX(0) scale(1)' }))
          ])
        ], { optional: true })
      ])
    ])
  ]
})
export class Hero22Component {
  // SVG Icon definitions
  readonly AudioLinesIcon = AudioLines;
  readonly ShieldCheckIcon = ShieldCheck;
  readonly Globe2Icon = Globe2;
  readonly ArrowRightIcon = ArrowRight;

  @HostBinding('@copyAnimation') copyAnimation = true;
  @HostBinding('@featureAnimation') featureAnimation = true;

  @Input() brandName = 'JobTrack';
  @Input() navLinks: NavLink[] = [
    { label: 'Features', href: '#' },
    { label: 'Architecture', href: '#' },
    { label: 'Stack', href: '#' }
  ];
  @Input() headingLine1 = 'Track Applications.';
  @Input() headingLine2Prefix = 'Never Get';
  @Input() headingHighlight = 'Ghosted.';
  @Input() description = 'A job application tracking portal designed to automate application tracking, detect recruiter ghosting, and evaluate resume alignment using AI.';
  @Input() primaryCtaLabel = 'Start Tracking Free';
  @Input() secondaryCtaLabel = 'Log In';
  @Input() loginLabel = 'Log in';
  @Input() signupLabel = 'Get Started';
  @Input() features: FeatureItem[] = [
    { title: 'AI Fit Score', description: 'powered by Groq', icon: 'shield' },
    { title: 'Ghosting Detection', description: 'daily cron scans', icon: 'globe' },
    { title: 'Stats Dashboard', description: 'live MongoDB metrics', icon: 'audio' },
  ];
  @Input() backgroundImage = 'https://assets.watermelon.sh/hero-22-bg.avif';

  @Output() primaryCtaClick = new EventEmitter<void>();
  @Output() secondaryCtaClick = new EventEmitter<void>();
  @Output() loginClick = new EventEmitter<void>();
  @Output() signupClick = new EventEmitter<void>();

  getIcon(iconName: string) {
    switch (iconName) {
      case 'audio': return this.AudioLinesIcon;
      case 'shield': return this.ShieldCheckIcon;
      case 'globe': return this.Globe2Icon;
      default: return this.Globe2Icon;
    }
  }

  onPrimaryClick(event: Event) {
    event.preventDefault();
    this.primaryCtaClick.emit();
  }

  onSecondaryClick(event: Event) {
    event.preventDefault();
    this.secondaryCtaClick.emit();
  }

  onLoginClick(event: Event) {
    event.preventDefault();
    this.loginClick.emit();
  }

  onSignupClick(event: Event) {
    event.preventDefault();
    this.signupClick.emit();
  }
}
