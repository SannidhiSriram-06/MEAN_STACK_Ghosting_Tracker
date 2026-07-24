import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // --- Signals ---
  // Signals are variables that automatically tell the website to update if they change
  readonly isAuthenticated = signal<boolean>(false); // Are they logged in?
  readonly isAuthLoading = signal<boolean>(true); // Are we still checking if they are logged in?
  readonly currentUser = signal<any>(null); // Details about the logged-in user
  readonly isClerkConfigured = signal<boolean>(false); // Did the developer set up Clerk?
  
  private clerkInstance: any = null;

  constructor() {
    this.checkInitialState();
  }

  // Check if the user is already logged in when they first load the page
  private async checkInitialState() {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const baseUrl = isLocalhost ? 'http://localhost:5001/api' : '/api';

    try {
      // Try to ask the backend server for our secure Clerk API keys
      const response = await fetch(`${baseUrl}/auth-config`);
      if (response.ok) {
        const config = await response.json();
        // If the backend has Clerk set up, we save the key and initialize Clerk!
        if (config && config.clerkEnabled && config.publishableKey) {
          this.isClerkConfigured.set(true);
          localStorage.setItem('clerk_pem_public_key', config.publishableKey); // Save it to the browser
          await this.initClerk(config.publishableKey);
          this.isAuthLoading.set(false); // We are done loading
          return;
        }
      }
    } catch (error) {
      console.error('Failed to sync auth configuration from backend, falling back to local storage:', error);
    }

    const publishableKey = localStorage.getItem('clerk_pem_public_key');
    const hasClerkConfig = !!publishableKey;
    this.isClerkConfigured.set(hasClerkConfig);

    if (hasClerkConfig && publishableKey) {
      try {
        await this.initClerk(publishableKey);
      } catch (err) {
        console.error('Failed to initialize Clerk:', err);
      }
    } else {
      // Local Mock Auth fallback
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      if (token) {
        this.isAuthenticated.set(true);
        this.currentUser.set(user ? JSON.parse(user) : { name: 'Viva Candidate', email: 'student@example.edu' });
      }
    }
    
    this.isAuthLoading.set(false);
  }

  private getDomainFromPublishableKey(publishableKey: string): string | null {
    if (!publishableKey || !publishableKey.startsWith('pk_')) return null;
    try {
      const parts = publishableKey.split('_');
      const base64Part = parts[2] || parts[1];
      const decoded = atob(base64Part);
      return decoded.replace('$', '');
    } catch (error) {
      console.error('Failed to decode Clerk publishable key:', error);
      return null;
    }
  }

  private loadClerkScript(publishableKey: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((window as any).Clerk) {
        resolve();
        return;
      }
      
      const domain = this.getDomainFromPublishableKey(publishableKey);
      if (!domain) {
        reject(new Error('Invalid Clerk Publishable Key format.'));
        return;
      }

      const script = document.createElement('script');
      script.src = `https://${domain}/npm/@clerk/clerk-js@5/dist/clerk.browser.js`;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.setAttribute('data-clerk-publishable-key', publishableKey);
      script.onload = () => resolve();
      script.onerror = (err) => reject(err);
      document.head.appendChild(script);
    });
  }

  async initClerk(publishableKey: string) {
    await this.loadClerkScript(publishableKey);
    const Clerk = (window as any).Clerk;
    this.clerkInstance = Clerk;
    await Clerk.load();

    // Check if user is signed in
    if (Clerk.user) {
      this.isAuthenticated.set(true);
      const email = Clerk.user.primaryEmailAddress.emailAddress;
      const user = {
        name: Clerk.user.fullName || Clerk.user.username || email,
        email
      };
      this.currentUser.set(user);
      
      const token = await Clerk.session.getToken();
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      this.isAuthenticated.set(false);
      this.currentUser.set(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }

  getClerkInstance() {
    return this.clerkInstance;
  }

  /**
   * Updates Clerk variables in local storage.
   */
  async saveClerkConfig(pemPublicKey: string) {
    if (pemPublicKey) {
      localStorage.setItem('clerk_pem_public_key', pemPublicKey);
      this.isClerkConfigured.set(true);
      await this.initClerk(pemPublicKey);
    } else {
      localStorage.removeItem('clerk_pem_public_key');
      this.isClerkConfigured.set(false);
      this.clerkInstance = null;
      this.logout();
    }
  }

  getClerkConfig() {
    return {
      pemPublicKey: localStorage.getItem('clerk_pem_public_key') || ''
    };
  }

  /**
   * Signs in user (Mock fallback fallback).
   */
  login(email: string, _password: string): Promise<boolean> {
    if (this.isClerkConfigured()) {
      return Promise.reject(new Error('Clerk auth is active. Please use the Clerk sign-in form.'));
    }
    
    // Mock auth
    const mockToken = 'mock-jwt-header.' + btoa(JSON.stringify({ sub: 'mock-user-123', email })) + '.mock-signature';
    const user = { name: email.split('@')[0], email };
    localStorage.setItem('token', mockToken);
    localStorage.setItem('user', JSON.stringify(user));
    this.isAuthenticated.set(true);
    this.currentUser.set(user);
    return Promise.resolve(true);
  }

  signup(_email: string, _password: string): Promise<boolean> {
    if (this.isClerkConfigured()) {
      return Promise.reject(new Error('Clerk auth is active. Please use the Clerk sign-up form.'));
    }
    return Promise.resolve(true);
  }

  async getFreshToken(): Promise<string | null> {
    if (this.clerkInstance && this.clerkInstance.session) {
      try {
        const token = await this.clerkInstance.session.getToken();
        localStorage.setItem('token', token);
        return token;
      } catch (err) {
        console.error('Failed to get fresh Clerk token:', err);
        return null;
      }
    }
    return localStorage.getItem('token');
  }

  async deleteCurrentUser() {
    if (this.clerkInstance && this.clerkInstance.user) {
      try {
        await this.clerkInstance.user.delete();
      } catch (err) {
        console.error('Failed to delete user in Clerk:', err);
        throw err;
      }
    }
    this.logout();
  }

  logout() {
    if (this.clerkInstance && this.clerkInstance.user) {
      this.clerkInstance.signOut();
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.isAuthenticated.set(false);
    this.currentUser.set(null);
  }
}
