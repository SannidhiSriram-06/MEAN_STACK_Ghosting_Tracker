import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:5001/api';

  // Auth header helper
  private getHeaders(): HttpHeaders {
    // If Cognito auth token is stored in local storage, append it
    const token = localStorage.getItem('token');
    if (token) {
      return new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });
    }
    // Default headers
    return new HttpHeaders();
  }

  getHealth(): Observable<any> {
    return this.http.get('http://localhost:5001/health');
  }

  getApplications(status?: string, sort?: string): Observable<any[]> {
    let url = `${this.baseUrl}/applications`;
    const params: string[] = [];
    if (status) params.push(`status=${status}`);
    if (sort) params.push(`sort=${sort}`);
    if (params.length > 0) url += `?${params.join('&')}`;

    return this.http.get<any[]>(url, { headers: this.getHeaders() });
  }

  getApplication(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/applications/${id}`, { headers: this.getHeaders() });
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
    return this.http.post<any>(`${this.baseUrl}/applications/resumes/upload`, formData, { headers: this.getHeaders() });
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
