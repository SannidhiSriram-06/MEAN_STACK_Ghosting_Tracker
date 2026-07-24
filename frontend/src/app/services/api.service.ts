import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service';

// @Injectable means this service can be "injected" (used) anywhere in our Angular app
@Injectable({
  providedIn: 'root' // This makes sure there's only one instance of this service for the whole app
})
export class ApiService {
  // Bring in the HttpClient (Angular's tool for making web requests)
  private readonly http = inject(HttpClient);
  // Bring in our AuthService to get the user's secure login token
  private readonly auth = inject(AuthService);
  
  // A helper function to figure out where our backend server is
  private get baseUrl(): string {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    // If we're testing locally, talk to port 5001. If we're live on Vercel, just use /api
    return isLocalhost ? 'http://localhost:5001/api' : '/api';
  }

  // Asynchronous auth headers helper to always fetch a fresh Clerk session token
  private getRequestOptions(params?: HttpParams): Observable<{ headers: HttpHeaders; params?: HttpParams }> {
    return from(this.auth.getFreshToken()).pipe(
      switchMap(token => {
        let headers = new HttpHeaders();
        if (token) {
          headers = headers.set('Authorization', `Bearer ${token}`);
        }
        return [{ headers, params }];
      })
    );
  }

  // This function fetches all job applications from the backend
  // 'Observable' is like a Promise that listens for the data to arrive from the internet
  getApplications(status?: string, sort?: string): Observable<any[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status); // e.g. ?status=interview
    if (sort) params = params.set('sort', sort); // e.g. ?sort=dateApplied
    
    // First, grab the secure token headers, THEN make the HTTP GET request
    return this.getRequestOptions(params).pipe(
      switchMap(options => this.http.get<any[]>(`${this.baseUrl}/applications`, options))
    );
  }

  createApplication(application: any): Observable<any> {
    return this.getRequestOptions().pipe(
      switchMap(options => this.http.post<any>(`${this.baseUrl}/applications`, application, options))
    );
  }

  updateApplication(id: string, application: any): Observable<any> {
    return this.getRequestOptions().pipe(
      switchMap(options => this.http.put<any>(`${this.baseUrl}/applications/${id}`, application, options))
    );
  }

  deleteApplication(id: string): Observable<any> {
    return this.getRequestOptions().pipe(
      switchMap(options => this.http.delete<any>(`${this.baseUrl}/applications/${id}`, options))
    );
  }

  checkGhosting(threshold?: number): Observable<any> {
    let params = new HttpParams();
    if (threshold !== undefined && threshold !== null) {
      params = params.set('threshold', threshold.toString());
    }
    return this.getRequestOptions(params).pipe(
      switchMap(options => this.http.post<any>(`${this.baseUrl}/applications/check-ghosting`, {}, options))
    );
  }

  runFitScore(id: string, payload: { resumeId?: string; cvText?: string }): Observable<any> {
    return this.getRequestOptions().pipe(
      switchMap(options => this.http.post<any>(`${this.baseUrl}/applications/${id}/fit-score`, payload, options))
    );
  }

  uploadApplicationCv(id: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('cvFile', file);
    return this.getRequestOptions().pipe(
      switchMap(options => this.http.post<any>(
        `${this.baseUrl}/applications/${id}/cv-upload`,
        formData,
        { headers: options.headers } // don't set Content-Type; let browser set multipart boundary
      ))
    );
  }

  downloadApplicationCv(id: string): Observable<Blob> {
    return this.getRequestOptions().pipe(
      switchMap(options => this.http.get(
        `${this.baseUrl}/applications/${id}/cv-download`,
        { ...options, responseType: 'blob' }
      ))
    );
  }

  saveTextResume(payload: { versionName: string; cvText: string }): Observable<any> {
    return this.getRequestOptions().pipe(
      switchMap(options => this.http.post<any>(`${this.baseUrl}/applications/upload-resume`, payload, options))
    );
  }

  deleteResume(id: string): Observable<any> {
    return this.getRequestOptions().pipe(
      switchMap(options => this.http.delete<any>(`${this.baseUrl}/applications/resumes/${id}`, options))
    );
  }

  getResumes(): Observable<any[]> {
    return this.getRequestOptions().pipe(
      switchMap(options => this.http.get<any[]>(`${this.baseUrl}/applications/resumes/list`, options))
    );
  }

  deleteUserData(): Observable<any> {
    return this.getRequestOptions().pipe(
      switchMap(options => this.http.delete<any>(`${this.baseUrl}/applications/users/me/data`, options))
    );
  }

  deleteAccount(): Observable<any> {
    return this.getRequestOptions().pipe(
      switchMap(options => this.http.delete<any>(`${this.baseUrl}/applications/users/me`, options))
    );
  }

  // Insights / Stats
  getStats(): Observable<any> {
    return this.getRequestOptions().pipe(
      switchMap(options => this.http.get<any>(`${this.baseUrl}/insights/stats`, options))
    );
  }

  getSkillGap(): Observable<any> {
    return this.getRequestOptions().pipe(
      switchMap(options => this.http.get<any>(`${this.baseUrl}/insights/skill-gap`, options))
    );
  }
}
