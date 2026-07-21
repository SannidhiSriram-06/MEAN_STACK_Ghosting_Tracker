import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:5001/api';

  // Auth header helper
  private getHeaders(): HttpHeaders {
    // If Clerk auth token is stored in local storage, append it
    const token = localStorage.getItem('token');
    if (token) {
      return new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });
    }
    // Default headers
    return new HttpHeaders();
  }

  getApplications(status?: string, sort?: string): Observable<any[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    if (sort) params = params.set('sort', sort);
    return this.http.get<any[]>(`${this.baseUrl}/applications`, { headers: this.getHeaders(), params });
  }

  createApplication(application: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/applications`, application, { headers: this.getHeaders() });
  }

  updateApplication(id: string, application: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/applications/${id}`, application, { headers: this.getHeaders() });
  }

  deleteApplication(id: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/applications/${id}`, { headers: this.getHeaders() });
  }

  checkGhosting(): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/applications/check-ghosting`, {}, { headers: this.getHeaders() });
  }

  runFitScore(id: string, payload: { resumeId?: string; cvText?: string }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/applications/${id}/fit-score`, payload, { headers: this.getHeaders() });
  }

  uploadResume(formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/applications/upload-resume`, formData, { headers: this.getHeaders() });
  }

  getResumes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/applications/resumes/list`, { headers: this.getHeaders() });
  }

  deleteUserData(): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/applications/users/me/data`, { headers: this.getHeaders() });
  }

  deleteAccount(): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/applications/users/me`, { headers: this.getHeaders() });
  }

  getStats(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/stats`, { headers: this.getHeaders() });
  }

  getSkillGap(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/insights/skill-gap`, { headers: this.getHeaders() });
  }
}
