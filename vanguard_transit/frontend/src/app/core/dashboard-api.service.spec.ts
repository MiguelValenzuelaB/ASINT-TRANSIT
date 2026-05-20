import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { API_BASE_URL } from './api-url';
import { DashboardApiService } from './dashboard-api.service';

describe('DashboardApiService', () => {
  let service: DashboardApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api/vanguard-transit' },
      ],
    });

    service = TestBed.inject(DashboardApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads dashboard KPIs from the backend API', () => {
    service.getKpis().subscribe((kpis) => {
      expect(kpis.activeFleet.value).toBe(1248);
    });

    const request = httpMock.expectOne('/api/vanguard-transit/dashboard/kpis');
    expect(request.request.method).toBe('GET');
    request.flush({
      activeFleet: { value: 1248, unit: 'Vehículos' },
      efficiencyRate: { value: 94.2, unit: '%' },
      fuelConsumption: { value: 38.4, unit: 'L/100km' },
      deadheadDistance: { value: 412, unit: 'km' },
    });
  });
});
