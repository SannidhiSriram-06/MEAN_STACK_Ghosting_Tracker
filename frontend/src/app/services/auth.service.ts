import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Signals for reactive state
  readonly isAuthenticated = signal<boolean>(false);
  readonly currentUser = signal<any>(null);
  readonly isCognitoConfigured = signal<boolean>(false);

  constructor() {
    this.checkInitialState();
  }

  private checkInitialState() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    const hasAwsConfig = !!localStorage.getItem('cognito_user_pool_id');

    this.isCognitoConfigured.set(hasAwsConfig);

    if (token) {
      this.isAuthenticated.set(true);
      this.currentUser.set(user ? JSON.parse(user) : { name: 'Viva Candidate', email: 'student@example.edu' });
    }
  }

  /**
   * Updates AWS Cognito variables in local storage.
   */
  saveCognitoConfig(userPoolId: string, clientId: string, region: string) {
    if (userPoolId && clientId) {
      localStorage.setItem('cognito_user_pool_id', userPoolId);
      localStorage.setItem('cognito_client_id', clientId);
      localStorage.setItem('cognito_region', region);
      this.isCognitoConfigured.set(true);
    } else {
      localStorage.removeItem('cognito_user_pool_id');
      localStorage.removeItem('cognito_client_id');
      localStorage.removeItem('cognito_region');
      this.isCognitoConfigured.set(false);
    }
  }

  getCognitoConfig() {
    return {
      userPoolId: localStorage.getItem('cognito_user_pool_id') || '',
      clientId: localStorage.getItem('cognito_client_id') || '',
      region: localStorage.getItem('cognito_region') || 'us-east-1'
    };
  }

  /**
   * Signs in user.
   * If Cognito details are set, we simulate authenticating or make actual Cognito calls.
   * Otherwise, we set mock token to proceed with local-first dev.
   */
  login(email: string, password: string): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Create mock jwt token
        const mockToken = 'mock-jwt-header.' + btoa(JSON.stringify({ sub: 'mock-user-123', email })) + '.mock-signature';
        const user = { name: email.split('@')[0], email };

        localStorage.setItem('token', mockToken);
        localStorage.setItem('user', JSON.stringify(user));

        this.isAuthenticated.set(true);
        this.currentUser.set(user);
        resolve(true);
      }, 500);
    });
  }

  signup(email: string, password: string): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true); // Mock signup success
      }, 500);
    });
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.isAuthenticated.set(false);
    this.currentUser.set(null);
  }
}
