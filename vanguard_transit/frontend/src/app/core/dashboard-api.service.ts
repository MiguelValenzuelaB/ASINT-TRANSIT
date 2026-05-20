import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from './api-url';
import { ActivityItem, DashboardKpis } from './api.models';

@Injectable({ providedIn: 'root' })
export class DashboardApiService {
  constructor(
    private readonly http: HttpClient,
    @Inject(API_BASE_URL) private readonly apiBaseUrl: string,
  ) {}

  getKpis(): Observable<DashboardKpis> {
    return this.http.get<DashboardKpis>(`${this.apiBaseUrl}/dashboard/kpis`);
  }

  getActivity(): Observable<ActivityItem[]> {
    return this.http.get<ActivityItem[]>(`${this.apiBaseUrl}/dashboard/activity`);
  }
}
