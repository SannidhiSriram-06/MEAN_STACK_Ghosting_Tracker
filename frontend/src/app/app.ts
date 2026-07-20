import { Component, signal, inject, OnInit, HostListener } from '@angular/core';
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

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, ThemeToggleComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  // Services
  protected readonly api = inject(ApiService);
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  protected readonly Math = Math;

  // Navigation & View Tabs
  protected readonly activeTab = signal<'dashboard' | 'kanban' | 'applications' | 'settings' | 'account'>('dashboard');
  protected readonly sidebarCollapsed = signal<boolean>(false);

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

  // Destructive Modals State (Phase 4)
  protected readonly isDeleteDataOpen = signal<boolean>(false);
  protected readonly isDeleteAccountOpen = signal<boolean>(false);
  protected deleteConfirmText = '';
  protected deleteError = '';

  // Form Models
  protected newApp = {
    company: '',
    role: '',
    jobDescription: '',
    dateApplied: new Date().toISOString().split('T')[0],
    location: '',
    source: 'LinkedIn',
    notes: ''
  };

  // Auth Page Form Models
  protected authMode = signal<'login' | 'signup'>('login');
  protected showPassword = signal<boolean>(false);
  protected authEmail = '';
  protected authPassword = '';
  protected authError = '';

  // Cognito Configuration Input Model
  protected cognitoUserPoolId = '';
  protected cognitoClientId = '';
  protected cognitoRegion = 'us-east-1';

  // File Upload State
  protected selectedFile: File | null = null;
  protected uploadingResume = signal<boolean>(false);
  protected pastedCvText = '';
  protected usePastedText = false;
  protected fileUploadStatus = '';

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
      { id: 'page-settings', category: 'Pages', label: 'Settings & Integrations', icon: 'fa-gears', action: () => this.runCmdKAction('nav', 'settings') },
      { id: 'page-account', category: 'Pages', label: 'Account & Data Management', icon: 'fa-user-gear', action: () => this.runCmdKAction('nav', 'account') }
    ];

    // Actions
    const actions: CommandItem[] = [
      { id: 'action-log', category: 'Actions', label: 'Log New Job Application', icon: 'fa-plus', action: () => this.runCmdKAction('create') },
      { id: 'action-theme', category: 'Actions', label: 'Toggle Light/Dark Theme', icon: 'fa-circle-half-stroke', action: () => this.runCmdKAction('theme') },
      { id: 'action-ghost', category: 'Actions', label: 'Scan Ghosting Statuses', icon: 'fa-ghost', action: () => { this.isCmdKOpen.set(false); this.triggerGhostCheck(); } },
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
  protected changeTab(tab: 'dashboard' | 'kanban' | 'applications' | 'settings' | 'account') {
    this.activeTab.set(tab);
    if (tab === 'dashboard' || tab === 'applications' || tab === 'kanban') {
      this.loadAllData();
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
    const counts = [s.applied || 0, s.screening || 0, s.interview || 0, s.offer || 0, s.rejected || 0, s.ghosted || 0];
    return Math.max(...counts, 1);
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
  }

  protected closeCreateModal() {
    this.isCreateOpen.set(false);
  }

  protected createApplicationSubmit() {
    this.api.createApplication(this.newApp).subscribe({
      next: () => {
        this.closeCreateModal();
        this.newApp = {
          company: '',
          role: '',
          jobDescription: '',
          dateApplied: new Date().toISOString().split('T')[0],
          location: '',
          source: 'LinkedIn',
          notes: ''
        };
        this.loadAllData();
      },
      error: (err) => console.error('Failed to create application:', err)
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

  protected triggerFitCheck(id: string) {
    this.runningFitCheck.set(true);
    const payload = this.usePastedText ? { cvText: this.pastedCvText } : {};

    this.api.runFitScore(id, payload).subscribe({
      next: (res) => {
        this.runningFitCheck.set(false);
        this.selectedApp.set(res.application);
        this.loadAllData();
      },
      error: (err) => {
        this.runningFitCheck.set(false);
        console.error('Fit check error:', err);
      }
    });
  }

  protected triggerGhostCheck() {
    this.api.checkGhosting().subscribe({
      next: (res) => {
        alert(res.message || 'Ghosting scan complete');
        this.loadAllData();
      },
      error: (err) => console.error('Ghost check error:', err)
    });
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
      next: () => {
        this.isDeleteAccountOpen.set(false);
        this.deleteConfirmText = '';
        this.deleteError = '';
        this.auth.logout();
      },
      error: (err) => this.deleteError = err.error?.error || 'Failed to delete account.'
    });
  }

  // File Upload Handlers
  protected onFileSelected(event: any) {
    this.selectedFile = event.target.files[0] || null;
  }

  protected uploadSelectedResume() {
    if (!this.selectedFile) return;
    this.uploadingResume.set(true);
    const formData = new FormData();
    formData.append('resume', this.selectedFile);

    this.api.uploadResume(formData).subscribe({
      next: (res) => {
        this.uploadingResume.set(false);
        this.fileUploadStatus = 'Resume uploaded successfully!';
        this.selectedFile = null;
        this.loadResumes();
      },
      error: (err) => {
        this.uploadingResume.set(false);
        this.fileUploadStatus = 'Upload failed.';
        console.error('Resume upload error:', err);
      }
    });
  }

  protected loadCognitoConfig() {
    this.cognitoUserPoolId = localStorage.getItem('cognitoUserPoolId') || '';
    this.cognitoClientId = localStorage.getItem('cognitoClientId') || '';
    this.cognitoRegion = localStorage.getItem('cognitoRegion') || 'us-east-1';
  }

  protected saveCognitoConfig() {
    localStorage.setItem('cognitoUserPoolId', this.cognitoUserPoolId);
    localStorage.setItem('cognitoClientId', this.cognitoClientId);
    localStorage.setItem('cognitoRegion', this.cognitoRegion);
    alert('Cognito parameters saved locally!');
  }
}
