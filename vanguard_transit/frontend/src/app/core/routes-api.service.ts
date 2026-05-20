import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { API_BASE_URL } from './api-url';
import { TransitLine } from './api.models';

@Injectable({ providedIn: 'root' })
export class RoutesApiService {
  constructor(
    private readonly http: HttpClient,
    @Inject(API_BASE_URL) private readonly apiBaseUrl: string,
  ) {}

  getLines(): Observable<TransitLine[]> {
    return this.http.get<TransitLine[]>(`${this.apiBaseUrl}/routes/lines`).pipe(
      map((lines) =>
        lines.map((line) => ({
          ...line,
          name: line.name.replaceAll('\u00e2\u20ac\u201c', '\u2013'),
        })),
      ),
    );
  }
}
