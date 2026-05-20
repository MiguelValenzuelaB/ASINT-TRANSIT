import { routes } from './app.routes';

describe('app routes', () => {
  it('redirects the root path to planning/optimization', () => {
    const rootRoute = routes.find((route) => route.path === '');

    expect(rootRoute?.redirectTo).toBe('planning/optimization');
    expect(rootRoute?.pathMatch).toBe('full');
  });

  it('keeps the main feature routes available', () => {
    const routePaths = routes.map((route) => route.path);

    expect(routePaths).toContain('planning/optimization');
    expect(routePaths).toContain('planning/heuristic');
    expect(routePaths).toContain('execution/management');
    expect(routePaths).toContain('execution/kpi');
    expect(routePaths).toContain('dashboard');
    expect(routePaths).toContain('deadhead');
    expect(routePaths).toContain('routes');
    expect(routePaths).toContain('analytics');
  });
});
