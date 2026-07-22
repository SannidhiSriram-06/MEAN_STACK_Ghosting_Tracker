import { Component, signal, inject, OnInit, HostListener, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from './services/api.service';
import { AuthService } from './services/auth.service';
import { ThemeService } from './services/theme.service';
import { ThemeToggleComponent } from './components/theme-toggle/theme-toggle.component';

export interface CommandItem {
  id: string;
  category: 'Pages' | 'Actions' | 'Applications';
  label: string;
  icon: string;
  action: () => void;
}

import { DragDropModule } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, ThemeToggleComponent, DragDropModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  // Services
  protected readonly api = inject(ApiService);
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);

  // Navigation & View Tabs
  protected readonly activeTab = signal<'dashboard' | 'kanban' | 'applications' | 'account-privacy'>((localStorage.getItem('activeTab') as any) || 'dashboard');
  protected readonly sidebarCollapsed = signal<boolean>(false);
  protected readonly isProfileDropdownOpen = signal<boolean>(false);

  // Cmd+K / Skiper92 Command Palette State
  protected readonly isCmdKOpen = signal<boolean>(false);
  protected cmdKQuery = '';
  protected readonly cmdKSelectedIndex = signal<number>(0);

  // App Data State
  protected readonly applications = signal<any[]>([]);
  protected readonly resumes = signal<any[]>([]);
  protected readonly stats = signal<any>({
    totalApplications: 0,
    byStatus: { applied: 0, screening: 0, interview: 0, offer: 0, rejected: 0, ghosted: 0 },
    bySource: {},
    ghostingRate: 0,
    responseRate: 0,
    averageFitScore: null,
    avgDaysToFirstResponse: 0
  });
  protected readonly skillGap = signal<any[]>([]);

  // Search & Filter
  protected readonly searchQuery = signal<string>('');
  protected readonly selectedStatusFilter = signal<string>('all');

  // Modals & Selections
  protected readonly isCreateOpen = signal<boolean>(false);
  protected readonly isDetailOpen = signal<boolean>(false);
  protected readonly selectedApp = signal<any>(null);
  protected readonly runningFitCheck = signal<boolean>(false);
  protected readonly isVerdictOpen = signal<boolean>(false);

  // Destructive Modals State (Phase 4)
  protected readonly isDeleteDataOpen = signal<boolean>(false);
  protected readonly isDeleteAccountOpen = signal<boolean>(false);
  protected deleteConfirmText = '';
  protected deleteError = '';


  // Form Models — defined via factory to allow clean resets
  private getDefaultApp() {
    return {
      company: '',
      role: '',
      jobDescription: '',
      dateApplied: new Date().toISOString().split('T')[0],
      location: '',
      source: 'LinkedIn',
      notes: ''
    };
  }
  protected newApp = this.getDefaultApp();

  // Auth Page Form Models
  protected authMode = signal<'login' | 'signup'>('login');
  protected showPassword = signal<boolean>(false);
  protected authEmail = '';
  protected authPassword = '';
  protected authError = '';

  // CV Text Version State
  protected newCvText = '';
  protected newCvVersionName = '';
  protected savingCvVersion = signal<boolean>(false);
  protected cvSaveStatus = '';
  protected cvSaveError = '';

  // Fit Check State — plain text only
  protected pastedCvText = '';

  // Per-application PDF CV state
  protected pendingCvFile: File | null = null;
  protected cvUploadError = '';
  protected cvUploading = signal<boolean>(false);

  constructor() {
    effect(() => {
      if (this.auth.isAuthenticated()) {
        this.loadAllData();
        if (this.activeTab() === 'account-privacy' && this.auth.isClerkConfigured()) {
          this.scheduleMountClerkProfile();
        }
      } else if (this.auth.isClerkConfigured()) {
        // Mount only once when Clerk is ready and container exists
        setTimeout(() => {
          this.mountClerkSignIn();
        }, 200);
      }
    });
  }

  private mountClerkSignIn(retries = 10) {
    const Clerk = this.auth.getClerkInstance();
    const container = document.getElementById('clerk-auth-container');
    if (!Clerk || !container) return;

    // Check if Clerk is already mounted in this container to prevent duplicate mounts
    if (container.querySelector('.cl-rootBox')) {
      return;
    }

    try {
      container.innerHTML = ''; // Clear loading spinner
      Clerk.mountSignIn(container, {
        appearance: {
          elements: {
            card: {
              boxShadow: 'none',
              border: 'none',
              background: 'transparent',
              width: '100%',
              padding: '0'
            },
            headerTitle: { display: 'none' },
            headerSubtitle: { display: 'none' },
            logoImage: { display: 'none' },
            footer: { background: 'transparent' }
          },
          variables: {
            colorPrimary: '#FDBA5E',
            colorBackground: 'transparent'
          }
        }
      });
    } catch (error: any) {
      if (error.message && error.message.includes('not ready yet') && retries > 0) {
        console.log(`Clerk components not ready yet, retrying in 100ms... (${retries} retries left)`);
        setTimeout(() => {
          this.mountClerkSignIn(retries - 1);
        }, 100);
      } else {
        console.error('Failed to mount Clerk Sign In:', error);
      }
    }
  }

  ngOnInit() {
    if (this.auth.isAuthenticated()) {
      this.loadAllData();
    }
  }

  // Keyboard shortcut listener for 'f' / 'F' (Skiper92) and Cmd+K / Ctrl+K & Escape & Arrows
  @HostListener('window:keydown', ['$event'])
  handleGlobalKeydown(event: KeyboardEvent) {
    const activeEl = document.activeElement;
    const isTyping = activeEl && (
      activeEl.tagName === 'INPUT' ||
      activeEl.tagName === 'TEXTAREA' ||
      activeEl.tagName === 'SELECT' ||
      activeEl.getAttribute('contenteditable') === 'true'
    );

    // Cmd+K / Ctrl+K trigger
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.toggleCmdK();
      return;
    }

    // Skiper92 'F' shortcut when NOT typing in an input
    if (!isTyping && event.key.toLowerCase() === 'f' && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      this.toggleCmdK();
      return;
    }

    // Command Palette Navigation
    if (this.isCmdKOpen()) {
      const items = this.cmdKItems;
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        this.cmdKSelectedIndex.update(idx => (idx + 1) % Math.max(1, items.length));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        this.cmdKSelectedIndex.update(idx => (idx - 1 + items.length) % Math.max(1, items.length));
      } else if (event.key === 'Enter') {
        event.preventDefault();
        if (items.length > 0 && items[this.cmdKSelectedIndex()]) {
          items[this.cmdKSelectedIndex()].action();
        }
      } else if (event.key === 'Escape') {
        this.isCmdKOpen.set(false);
      }
      return;
    }

    if (event.key === 'Escape') {
      if (this.isCreateOpen()) this.closeCreateModal();
      if (this.isDetailOpen()) this.closeDetailModal();
      if (this.isDeleteDataOpen()) this.isDeleteDataOpen.set(false);
      if (this.isDeleteAccountOpen()) this.isDeleteAccountOpen.set(false);
    }
  }

  protected toggleCmdK() {
    this.isCmdKOpen.update(v => !v);
    this.cmdKQuery = '';
    this.cmdKSelectedIndex.set(0);
  }

  // Computed command palette items with Vercel grouping (Skiper92 style)
  protected get cmdKItems(): CommandItem[] {
    const query = this.cmdKQuery.trim().toLowerCase();
    const items: CommandItem[] = [];

    // Pages
    const pages: CommandItem[] = [
      { id: 'page-dashboard', category: 'Pages', label: 'Dashboard', icon: 'fa-chart-simple', action: () => this.runCmdKAction('nav', 'dashboard') },
      { id: 'page-kanban', category: 'Pages', label: 'Kanban Board', icon: 'fa-table-columns', action: () => this.runCmdKAction('nav', 'kanban') },
      { id: 'page-applications', category: 'Pages', label: 'All Applications', icon: 'fa-list-check', action: () => this.runCmdKAction('nav', 'applications') },
      { id: 'page-account-privacy', category: 'Pages', label: 'Account & Privacy', icon: 'fa-user-gear', action: () => this.runCmdKAction('nav', 'account-privacy') }
    ];

    // Actions
    const actions: CommandItem[] = [
      { id: 'action-log', category: 'Actions', label: 'Log New Job Application', icon: 'fa-plus', action: () => this.runCmdKAction('create') },
      { id: 'action-theme', category: 'Actions', label: 'Toggle Light/Dark Theme', icon: 'fa-circle-half-stroke', action: () => this.runCmdKAction('theme') },

      { id: 'action-export-json', category: 'Actions', label: 'Export Applications as JSON', icon: 'fa-file-code', action: () => { this.isCmdKOpen.set(false); this.exportDataJSON(); } },
      { id: 'action-export-csv', category: 'Actions', label: 'Export Applications as CSV', icon: 'fa-file-csv', action: () => { this.isCmdKOpen.set(false); this.exportDataCSV(); } }
    ];

    // Filter pages and actions by query
    pages.forEach(p => {
      if (!query || p.label.toLowerCase().includes(query)) items.push(p);
    });

    actions.forEach(a => {
      if (!query || a.label.toLowerCase().includes(query)) items.push(a);
    });

    // Applications matching query
    if (query) {
      const matchingApps = this.applications().filter(app =>
        app.company.toLowerCase().includes(query) || app.role.toLowerCase().includes(query)
      );

      matchingApps.slice(0, 5).forEach(app => {
        items.push({
          id: `app-${app._id}`,
          category: 'Applications',
          label: `${app.company} — ${app.role} (${app.status})`,
          icon: 'fa-building',
          action: () => {
            this.isCmdKOpen.set(false);
            this.openDetailModal(app);
          }
        });
      });
    }

    return items;
  }

  // Command Palette execution
  protected runCmdKAction(action: string, param?: string) {
    this.isCmdKOpen.set(false);
    this.cmdKQuery = '';

    switch (action) {
      case 'nav':
        if (param) this.changeTab(param as any);
        break;
      case 'create':
        this.openCreateModal();
        break;
      case 'theme':
        this.theme.toggleTheme();
        break;
    }
  }

  // Tab Navigation Helper
  protected changeTab(tab: 'dashboard' | 'kanban' | 'applications' | 'account-privacy') {
    this.activeTab.set(tab);
    localStorage.setItem('activeTab', tab);
    if (tab === 'dashboard' || tab === 'applications' || tab === 'kanban') {
      this.loadAllData();
    } else if (tab === 'account-privacy' && this.auth.isClerkConfigured()) {
      this.scheduleMountClerkProfile();
    }
  }

  // Load backend content
  protected loadAllData() {
    this.loadApplications();
    this.loadStats();
    this.loadSkillGap();
    this.loadResumes();
  }

  private loadApplications() {
    this.api.getApplications().subscribe({
      next: (data) => this.applications.set(data),
      error: (err) => console.error('Failed to load applications:', err)
    });
  }

  private loadStats() {
    this.api.getStats().subscribe({
      next: (data) => this.stats.set(data),
      error: (err) => console.error('Failed to load stats:', err)
    });
  }

  private loadSkillGap() {
    this.api.getSkillGap().subscribe({
      next: (data) => this.skillGap.set(data),
      error: (err) => console.error('Failed to load skill gap:', err)
    });
  }

  private loadResumes() {
    this.api.getResumes().subscribe({
      next: (data) => this.resumes.set(data),
      error: (err) => console.error('Failed to load resumes:', err)
    });
  }

  // Helper getters
  protected get filteredApplications() {
    return this.applications().filter(app => {
      const matchesSearch = !this.searchQuery() ||
        app.company.toLowerCase().includes(this.searchQuery().toLowerCase()) ||
        app.role.toLowerCase().includes(this.searchQuery().toLowerCase());

      const matchesStatus = this.selectedStatusFilter() === 'all' || app.status === this.selectedStatusFilter();

      return matchesSearch && matchesStatus;
    });
  }

  protected getApplicationsByStatus(status: string) {
    return this.applications().filter(app => app.status === status);
  }

  protected getMaxStatusCount(): number {
    const s = this.stats().byStatus || {};
    return Math.max(s.applied||0, s.screening||0, s.interview||0, s.offer||0, s.rejected||0, s.ghosted||0, 1);
  }

  protected getBarHeight(count: number): number {
    const max = this.getMaxStatusCount();
    return Math.max(12, Math.round((count / max) * 160));
  }

  // Actions
  protected handleAuthSubmit() {
    this.authError = '';
    if (this.authMode() === 'login') {
      this.auth.login(this.authEmail, this.authPassword)
        .then(() => this.loadAllData())
        .catch((err: any) => this.authError = err?.message || 'Login failed');
    } else {
      this.auth.signup(this.authEmail, this.authPassword)
        .then(() => {
          this.authMode.set('login');
          this.handleAuthSubmit();
        })
        .catch((err: any) => this.authError = err?.message || 'Registration failed');
    }
  }

  protected openCreateModal() {
    this.isCreateOpen.set(true);
    this.pendingCvFile = null;
    this.cvUploadError = '';
  }

  protected closeCreateModal() {
    this.isCreateOpen.set(false);
    this.pendingCvFile = null;
    this.cvUploadError = '';
  }

  protected onCvFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.cvUploadError = '';
    if (!file) { this.pendingCvFile = null; return; }
    if (file.type !== 'application/pdf') {
      this.cvUploadError = 'Only PDF files are accepted.';
      this.pendingCvFile = null;
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.cvUploadError = 'File must be under 5 MB.';
      this.pendingCvFile = null;
      return;
    }
    this.pendingCvFile = file;
  }

  protected createApplicationSubmit() {
    this.api.createApplication(this.newApp).subscribe({
      next: (created) => {
        const file = this.pendingCvFile;
        this.newApp = this.getDefaultApp();
        this.pendingCvFile = null;

        if (file) {
          // Upload the PDF after the application is created
          this.cvUploading.set(true);
          this.api.uploadApplicationCv(created._id, file).subscribe({
            next: () => {
              this.cvUploading.set(false);
              this.closeCreateModal();
              this.loadAllData();
            },
            error: (err) => {
              this.cvUploading.set(false);
              this.cvUploadError = err?.error?.error || 'CV upload failed. Application was saved.';
              this.closeCreateModal();
              this.loadAllData();
            }
          });
        } else {
          this.closeCreateModal();
          this.loadAllData();
        }
      },
      error: (err) => console.error('Failed to create application:', err)
    });
  }

  protected downloadAppCv(app: any) {
    this.api.downloadApplicationCv(app._id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = app.cvPdf?.originalName || `${app.company}-cv.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err) => console.error('Failed to download CV:', err)
    });
  }

  protected openDetailModal(app: any) {
    this.selectedApp.set(app);
    this.isDetailOpen.set(true);
  }

  protected closeDetailModal() {
    this.isDetailOpen.set(false);
    this.selectedApp.set(null);
  }

  protected updateAppStatus(id: string, newStatus: string) {
    this.api.updateApplication(id, { status: newStatus }).subscribe({
      next: (updated) => {
        this.selectedApp.set(updated);
        this.loadAllData();
      },
      error: (err) => console.error('Failed to update status:', err)
    });
  }

  // Handle CDK drag-and-drop actions across columns
  protected onCardDrop(event: any) {
    if (event.previousContainer === event.container) {
      return;
    }
    const item = event.item.data;
    const newStatus = event.container.id; // column ID maps to application status
    this.updateAppStatus(item._id, newStatus);
  }

  // Get difference in days since the last status change or applied date
  protected getDaysInStage(app: any): number {
    const date = app.lastStatusChange || app.dateApplied || app.createdAt;
    if (!date) return 0;
    const changeDate = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - changeDate.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  // Verify if a card is aging (>7 days in Applied or Screening)
  protected isAging(app: any): boolean {
    const days = this.getDaysInStage(app);
    return days > 7 && (app.status === 'applied' || app.status === 'screening');
  }

  protected triggerFitCheck(id: string) {
    this.runningFitCheck.set(true);
    const payload: any = {};
    if (this.pastedCvText.trim()) {
      payload.cvText = this.pastedCvText.trim();
    }

    this.api.runFitScore(id, payload).subscribe({
      next: (fitScore) => {
        this.runningFitCheck.set(false);
        const current = this.selectedApp();
        if (current) {
          this.selectedApp.set({ ...current, fitScore });
        }
        this.loadAllData();
        // Auto-open the verdict panel
        this.isVerdictOpen.set(true);
      },
      error: (err) => {
        this.runningFitCheck.set(false);
        console.error('Fit check error:', err);
      }
    });
  }

  protected openVerdictPanel() {
    this.isVerdictOpen.set(true);
  }

  protected closeVerdictPanel() {
    this.isVerdictOpen.set(false);
  }

  protected getFitScoreColor(score: number): string {
    if (score >= 75) return 'var(--accent-success)';
    if (score >= 45) return 'var(--accent-warning)';
    return 'var(--accent-danger)';
  }



  protected deleteApplication(id: string) {
    if (confirm('Are you sure you want to delete this application?')) {
      this.api.deleteApplication(id).subscribe({
        next: () => {
          this.closeDetailModal();
          this.loadAllData();
        },
        error: (err) => console.error('Failed to delete app:', err)
      });
    }
  }

  // Account & Export Actions (Phase 4)
  protected exportDataJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.applications(), null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `jobtrack_applications_${new Date().toISOString().split('T')[0]}.json`);
    dlAnchorElem.click();
  }

  protected exportDataCSV() {
    const apps = this.applications();
    if (apps.length === 0) return;

    const headers = ["Company", "Role", "Status", "Date Applied", "Location", "Source", "Fit Score"];
    const rows = apps.map(a => [
      `"${a.company || ''}"`,
      `"${a.role || ''}"`,
      `"${a.status || ''}"`,
      `"${a.dateApplied ? new Date(a.dateApplied).toISOString().split('T')[0] : ''}"`,
      `"${a.location || ''}"`,
      `"${a.source || ''}"`,
      `"${a.fitScore?.score || ''}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `jobtrack_applications_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  protected wipeUserDataSubmit() {
    if (this.deleteConfirmText !== 'DELETE') {
      this.deleteError = 'Please type DELETE exactly to confirm.';
      return;
    }
    this.api.deleteUserData().subscribe({
      next: () => {
        this.isDeleteDataOpen.set(false);
        this.deleteConfirmText = '';
        this.deleteError = '';
        this.loadAllData();
      },
      error: (err) => this.deleteError = err.error?.error || 'Failed to wipe data.'
    });
  }

  protected wipeAccountSubmit() {
    if (this.deleteConfirmText !== 'DELETE') {
      this.deleteError = 'Please type DELETE exactly to confirm.';
      return;
    }
    this.api.deleteAccount().subscribe({
      next: async () => {
        try {
          await this.auth.deleteCurrentUser();
          this.isDeleteAccountOpen.set(false);
          this.deleteConfirmText = '';
          this.deleteError = '';
        } catch (err: any) {
          this.deleteError = err.message || 'Failed to wipe Clerk account.';
        }
      },
      error: (err) => this.deleteError = err.error?.error || 'Failed to delete account.'
    });
  }

  // ── CV Text Version Handlers ───────────────────────────────────────────────

  protected saveCvVersion() {
    const text = this.newCvText.trim();
    if (!text || text.length < 20) {
      this.cvSaveError = 'Please paste your full CV text (at least 20 characters).';
      return;
    }
    this.cvSaveError = '';
    this.cvSaveStatus = '';
    this.savingCvVersion.set(true);

    this.api.saveTextResume({ versionName: this.newCvVersionName.trim(), cvText: text }).subscribe({
      next: () => {
        this.savingCvVersion.set(false);
        this.cvSaveStatus = 'CV version saved!';
        this.newCvText = '';
        this.newCvVersionName = '';
        this.loadResumes();
        setTimeout(() => this.cvSaveStatus = '', 3000);
      },
      error: (err) => {
        this.savingCvVersion.set(false);
        this.cvSaveError = err?.error?.error || 'Failed to save CV version.';
      }
    });
  }

  protected deleteResumeVersion(id: string, event: MouseEvent) {
    event.stopPropagation();
    if (!confirm('Delete this CV version?')) return;
    this.api.deleteResume(id).subscribe({
      next: () => this.loadResumes(),
      error: (err) => console.error('Failed to delete CV version:', err)
    });
  }

  protected downloadResumeVersion(resume: any, event: MouseEvent) {
    event.stopPropagation();
    const text = resume.cvText || '';
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${resume.fileName || 'cv-version'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Clerk Profile Mount ─────────────────────────────────────────────────────

  private mountProfileTimeout: any;

  private scheduleMountClerkProfile() {
    clearTimeout(this.mountProfileTimeout);
    this.mountProfileTimeout = setTimeout(() => {
      this.mountClerkUserProfile();
    }, 200);
  }

  private mountClerkUserProfile(retries = 15) {
    const Clerk = this.auth.getClerkInstance();
    const container = document.getElementById('clerk-profile-container');
    if (!Clerk || !container) {
      if (retries > 0) setTimeout(() => this.mountClerkUserProfile(retries - 1), 200);
      return;
    }

    // Check if Clerk is already mounted in this container to prevent duplicate mounts
    if (container.querySelector('.cl-rootBox')) {
      return;
    }

    // Always unmount first to force a clean re-render
    try { Clerk.unmountUserProfile(container); } catch (_) {}
    container.innerHTML = '';

    try {
      Clerk.mountUserProfile(container, {
        routing: 'virtual',
        appearance: {
          elements: {
            rootBox: { width: '100%' },
            card: { boxShadow: 'none', border: 'none', background: 'transparent' }
          },
          variables: {
            colorPrimary: '#FDBA5E',
            colorBackground: 'transparent',
            colorText: 'var(--text-primary)',
            borderRadius: '12px'
          }
        }
      });
    } catch (error: any) {
      if (retries > 0) {
        setTimeout(() => this.mountClerkUserProfile(retries - 1), 200);
      } else {
        console.error('Failed to mount Clerk user profile:', error);
      }
    }
  }
}
