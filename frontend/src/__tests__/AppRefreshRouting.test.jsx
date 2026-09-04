import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file) =>
  fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');
const app = read('src/App.jsx');
const skeleton = read('src/components/loading/RouteRefreshSkeleton.jsx');
const login = read('src/pages/Login.jsx');
const guard = read('src/components/RoleGuard.jsx');

describe('refresh loading and route preservation contract', () => {
  it('uses the full branded loader only when no cached user exists', () => {
    expect(app).toContain('if (!hydrated && !useAuthStore.getState().user)');
    expect(app).not.toContain('if (!hydrated && useAuthStore.getState().user)');
    expect(app).not.toContain(
      'DashboardLayout content={<RouteRefreshSkeleton />}'
    );
    expect(app).toContain('return user ? children : null;');
    expect(app).toContain('Loading InternOps');
  });

  it('shows a content-only skeleton and delayed slow-loading message', () => {
    expect(app).not.toContain('<aside className="hidden w-64');
    expect(skeleton).toContain('min-h-[calc(100vh-7rem)]');
    expect(skeleton).toContain('Loading page...');
    expect(skeleton).toContain('This is taking longer than usual...');
    expect(skeleton).toContain('window.setTimeout');
  });

  it('does not render a separate top progress line', () => {
    expect(skeleton).not.toContain('fixed inset-x-0 top-0 z-[100] h-1');
  });

  it('uses one authenticated Team skeleton without loading text', () => {
    const team = read('src/pages/Team.jsx');

    expect(team).not.toContain('Loading team...');
    expect(team).toContain('enabled: hydrated && !!accessToken');
    expect(team).toContain('if (!hydrated || !accessToken || isLoading)');
    expect(team).not.toContain('<div className="animate-fade-in-up">');
  });

  it('covers nested department and role-specific refresh structures', () => {
    expect(skeleton).toContain("'project-detail'");
    expect(skeleton).toContain("'department-projects'");
    expect(skeleton).toContain("'department-attendance'");
    expect(skeleton).toContain("'department-ratings'");
    expect(skeleton).toContain("'department-tasks'");
    expect(skeleton).toMatch(/role\s*===\s*'INTERN'/);
  });
  it('uses one animated Dashboard loading owner', () => {
    const home = read('src/pages/Home.jsx');
    expect(skeleton).toContain(
      "const pulse = 'animate-pulse bg-slate-200 dark:bg-slate-700/80'"
    );
    expect(app).toContain("import Dashboard from './pages/Dashboard';");
    expect(app).not.toContain(
      "const Dashboard = lazy(() => import('./pages/Dashboard'))"
    );
    expect(home).not.toContain(
      'animate-fade-in-up text-slate-900 dark:text-white'
    );
    expect(home).not.toContain(
      'animate-fade-in text-slate-900 dark:text-white'
    );
  });

  it('does not keep intermediate Dashboard text loaders', () => {
    const home = read('src/pages/Home.jsx');
    expect(home).not.toContain('Loading profile...');
    expect(home).not.toContain('Loading dashboard...');
    expect(
      home.match(/if \(!hydrated \|\| !accessToken \|\| isLoading\)/g)
    ).toHaveLength(2);
  });

  it('uses the route skeleton for first-time lazy page loading', () => {
    expect(app).toContain('function PageLoader()');
    expect(app).toContain('return <RouteRefreshSkeleton />;');
    expect(skeleton).toMatch(/return\s+'task-detail'/);
    expect(skeleton).toMatch(/kind\s*===\s*'meetings'/);
    expect(skeleton).toMatch(/kind\s*===\s*'analytics'/);
  });

  it('does not await feature flags before authentication hydration', () => {
    expect(app).toContain('Promise.resolve(fetchFlags())');
    expect(app).not.toContain('await fetchFlags()');
    expect(app).toContain('.finally(() =>');
    expect(app).toContain('setHydrated();');
  });

  it('preserves requested private and role-protected routes for login', () => {
    expect(app).toContain('state={{ from: location }}');
    expect(guard).toContain('state={{ from: location }}');
    expect(guard).toContain('to="/dashboard"');
  });

  it('returns a normal login to the original safe route', () => {
    expect(login).toContain('location.state?.from?.pathname');
    expect(login).toContain("requestedPath.startsWith('/')");
    expect(login).toContain("!requestedPath.startsWith('//')");
    expect(login).toContain(
      "data.user?.mustChangePassword ? '/profile' : safeDestination"
    );
  });

  it('keeps the single boot refresh promise and one Profile route', () => {
    expect(app).toContain('let bootRefreshPromise = null');
    expect(app).toContain('refreshSession()');
    expect(app).not.toContain("api.post('/auth/refresh'");
    expect(app.match(/path="profile"/g)).toHaveLength(1);
  });
  it('keeps Profile hidden behind its exact page skeleton until data is ready', () => {
    const profile = read('src/pages/Profile.jsx');
    expect(profile).toContain(
      "import RouteRefreshSkeleton from '../components/loading/RouteRefreshSkeleton';"
    );
    expect(profile).toContain(
      'if (!isError && (!hydrated || !accessToken || isLoading || !profile))'
    );
    expect(profile).toContain('return <RouteRefreshSkeleton />;');
    expect(profile).not.toContain('Spinner label="Loading profile..."');
    expect(skeleton).toContain('function ProfileSkeleton()');
    expect(skeleton).toContain('xl:w-[500px]');
    expect(skeleton).toContain('lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]');
    expect(skeleton).toContain('Array.from({ length: 6 }');
  });
  it('keeps the public Login route out of the dashboard skeleton fallback', () => {
    expect(app).toContain("import Login from './pages/Login';");
    expect(app).not.toMatch(/const\s+Login\s*=\s*lazy/);
    expect(app).toContain('path="/login" element={<Login />}');
    expect(app).toContain('<Suspense fallback={<PageLoader />}>');
  });
});
