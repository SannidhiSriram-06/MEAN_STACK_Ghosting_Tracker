import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from './services/api.service';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  // Services
  protected readonly api = inject(ApiService);
  protected readonly auth = inject(AuthService);
  protected readonly Math = Math;

  // Active View Tab
  protected readonly activeTab = signal<'dashboard' | 'kanban' | 'applications' | 'settings'>('dashboard');

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
    // If not authenticated, we stay in Auth screen (handled in HTML)
    if (this.auth.isAuthenticated()) {
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

  // Navigation handlers
  protected changeTab(tab: 'dashboard' | 'kanban' | 'applications' | 'settings') {
    this.activeTab.set(tab);
    if (this.auth.isAuthenticated()) {
      this.loadAllData();
    }
  }

  // Filtered Applications for applications tab
  protected getFilteredApplications() {
    const query = this.searchQuery().toLowerCase().trim();
    const status = this.selectedStatusFilter();

    return this.applications().filter(app => {
      const matchSearch = app.company.toLowerCase().includes(query) || 
                          app.role.toLowerCase().includes(query) || 
                          (app.location && app.location.toLowerCase().includes(query));
      
      const matchStatus = status === 'all' || app.status === status;
      
      return matchSearch && matchStatus;
    });
  }

  // Split applications by status for Kanban Board
  protected getKanbanApplications(status: string) {
    return this.applications().filter(app => app.status === status);
  }

  // Application CRUD handlers
  protected openCreateModal() {
    this.newApp = {
      company: '',
      role: '',
      jobDescription: '',
      dateApplied: new Date().toISOString().split('T')[0],
      location: '',
      source: 'LinkedIn',
      notes: ''
    };
    this.isCreateOpen.set(true);
  }

  protected closeCreateModal() {
    this.isCreateOpen.set(false);
  }

  protected createApplication() {
    this.api.createApplication(this.newApp).subscribe({
      next: () => {
        this.loadAllData();
        this.closeCreateModal();
      },
      error: (err) => alert(err.error?.error || 'Failed to create application')
    });
  }

  protected viewApplication(app: any) {
    this.selectedApp.set(app);
    this.pastedCvText = '';
    this.usePastedText = false;
    this.isDetailOpen.set(true);
  }

  protected closeDetailModal() {
    this.isDetailOpen.set(false);
    this.selectedApp.set(null);
  }

  protected updateAppStatus(appId: string, newStatus: string) {
    this.api.updateApplication(appId, { status: newStatus }).subscribe({
      next: (updated) => {
        this.loadAllData();
        if (this.selectedApp() && this.selectedApp()._id === appId) {
          this.selectedApp.set(updated);
        }
      },
      error: (err) => alert(err.error?.error || 'Failed to update status')
    });
  }

  protected deleteApplication(appId: string) {
    if (confirm('Are you sure you want to delete this application?')) {
      this.api.deleteApplication(appId).subscribe({
        next: () => {
          this.closeDetailModal();
          this.loadAllData();
        },
        error: (err) => alert(err.error?.error || 'Failed to delete application')
      });
    }
  }

  // Ghosting scan manual trigger
  protected triggerGhostScan() {
    this.api.checkGhosting().subscribe({
      next: (res) => {
        alert(`Scan completed successfully! ${res.updatedCount} applications flagged as ghosted.`);
        this.loadAllData();
      },
      error: (err) => alert(err.error?.error || 'Failed to run scan')
    });
  }

  // File selection
  protected onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  // Upload Resume handler
  protected uploadResume() {
    if (!this.selectedFile) return;
    this.uploadingResume.set(true);
    this.fileUploadStatus = 'Uploading and parsing CV... Please wait...';

    this.api.uploadResume(this.selectedFile).subscribe({
      next: (res) => {
        this.fileUploadStatus = 'Upload successful! Text extracted.';
        this.selectedFile = null;
        this.loadResumes();
        this.uploadingResume.set(false);
      },
      error: (err) => {
        this.fileUploadStatus = 'Upload failed: ' + (err.error?.error || 'Unknown error');
        this.uploadingResume.set(false);
      }
    });
  }

  // Fit Scoring Trigger
  protected triggerFitCheck(appId: string) {
    this.runningFitCheck.set(true);
    
    // Choose input method
    const payload: { cvText?: string; resumeId?: string } = {};
    if (this.usePastedText) {
      if (!this.pastedCvText.trim()) {
        alert('Please paste CV text.');
        this.runningFitCheck.set(false);
        return;
      }
      payload.cvText = this.pastedCvText;
    } else {
      // Find selected resume (uses latest if empty)
      const selectElement = document.getElementById('resumeSelect') as HTMLSelectElement;
      if (selectElement && selectElement.value) {
        payload.resumeId = selectElement.value;
      }
    }

    this.api.runFitScore(appId, payload).subscribe({
      next: (fitCheckResult) => {
        this.runningFitCheck.set(false);
        // Refresh detail app view to load newly cached score
        this.api.getApplication(appId).subscribe({
          next: (updatedApp) => {
            this.selectedApp.set(updatedApp);
            this.loadAllData();
          }
        });
      },
      error: (err) => {
        alert('Fit Check failed: ' + (err.error?.error || 'Server error'));
        this.runningFitCheck.set(false);
      }
    });
  }

  // Auth Operations
  protected handleAuthSubmit() {
    this.authError = '';
    if (!this.authEmail || !this.authPassword) {
      this.authError = 'Email and password are required.';
      return;
    }

    if (this.authMode() === 'login') {
      this.auth.login(this.authEmail, this.authPassword).then(() => {
        this.loadAllData();
      });
    } else {
      this.auth.signup(this.authEmail, this.authPassword).then((success) => {
        if (success) {
          this.authMode.set('login');
          alert('Sign up successful! Please log in.');
        } else {
          this.authError = 'Sign up failed.';
        }
      });
    }
  }

  protected handleLogout() {
    this.auth.logout();
    this.applications.set([]);
  }

  // Cognito Configuration Page handler
  protected loadCognitoConfig() {
    const config = this.auth.getCognitoConfig();
    this.cognitoUserPoolId = config.userPoolId;
    this.cognitoClientId = config.clientId;
    this.cognitoRegion = config.region;
  }

  protected saveCognitoConfig() {
    this.auth.saveCognitoConfig(this.cognitoUserPoolId, this.cognitoClientId, this.cognitoRegion);
    alert('Cognito parameters saved. If values were provided, JWT claims will be sent in subsequent requests.');
  }

  protected formatSourceLabel(source: any): string {
    if (!source) return 'Unknown';
    const str = String(source);
    return str.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
  }

  protected getMaxStatusCount(): number {
    const s = this.stats().byStatus;
    return Math.max(1, s.applied || 0, s.screening || 0, s.interview || 0, s.offer || 0, s.rejected || 0, s.ghosted || 0);
  }

  protected getBarHeight(count: number): number {
    const max = this.getMaxStatusCount();
    return (count / max) * 140; // Max height in SVG coordinate system is 140
  }
}
