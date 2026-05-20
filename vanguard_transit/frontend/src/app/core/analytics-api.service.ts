import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from './api-url';
import { AnalyticsMetrics, CostRecord } from './api.models';

@Injectable({ providedIn: 'root' })
export class AnalyticsApiService {
  constructor(
    private readonly http: HttpClient,
    @Inject(API_BASE_URL) private readonly apiBaseUrl: string,
  ) {}

  getMetrics(): Observable<AnalyticsMetrics> {
    return this.http.get<AnalyticsMetrics>(`${this.apiBaseUrl}/analytics/metrics`);
  }

  getCosts(): Observable<CostRecord[]> {
    return this.http.get<CostRecord[]>(`${this.apiBaseUrl}/analytics/costs`);
  }
}
