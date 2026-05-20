import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from './api-url';
import { DeadheadRoute } from './api.models';

@Injectable({ providedIn: 'root' })
export class DeadheadApiService {
  constructor(
    private readonly http: HttpClient,
    @Inject(API_BASE_URL) private readonly apiBaseUrl: string,
  ) {}

  getRoutes(): Observable<DeadheadRoute[]> {
    return this.http.get<DeadheadRoute[]>(`${this.apiBaseUrl}/deadhead/routes`);
  }
}
