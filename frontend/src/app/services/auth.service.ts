import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Signals for reactive state
  readonly isAuthenticated = signal<boolean>(false);
  readonly currentUser = signal<any>(null);
  readonly isClerkConfigured = signal<boolean>(false);

  constructor() {
    this.checkInitialState();
  }

  private checkInitialState() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    const hasClerkConfig = !!localStorage.getItem('clerk_pem_public_key');

    this.isClerkConfigured.set(hasClerkConfig);

    if (token) {
      this.isAuthenticated.set(true);
      this.currentUser.set(user ? JSON.parse(user) : { name: 'Viva Candidate', email: 'student@example.edu' });
    }
  }

  /**
   * Updates Clerk variables in local storage.
   */
  saveClerkConfig(pemPublicKey: string) {
    if (pemPublicKey) {
      localStorage.setItem('clerk_pem_public_key', pemPublicKey);
      this.isClerkConfigured.set(true);
    } else {
      localStorage.removeItem('clerk_pem_public_key');
      this.isClerkConfigured.set(false);
    }
  }

  getClerkConfig() {
    return {
      pemPublicKey: localStorage.getItem('clerk_pem_public_key') || ''
    };
  }

  /**
   * Signs in user.
   * If Clerk details are set, we simulate authenticating or make actual Clerk calls.
   * Otherwise, we set mock token to proceed with local-first dev.
   */
  login(email: string, _password: string): Promise<boolean> {
    // Mock auth: creates a local JWT-shaped token for dev/local mode
    const mockToken = 'mock-jwt-header.' + btoa(JSON.stringify({ sub: 'mock-user-123', email })) + '.mock-signature';
    const user = { name: email.split('@')[0], email };
    localStorage.setItem('token', mockToken);
    localStorage.setItem('user', JSON.stringify(user));
    this.isAuthenticated.set(true);
    this.currentUser.set(user);
    return Promise.resolve(true);
  }

  signup(_email: string, _password: string): Promise<boolean> {
    return Promise.resolve(true); // Mock signup
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.isAuthenticated.set(false);
    this.currentUser.set(null);
  }
}
