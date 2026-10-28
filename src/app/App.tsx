import { useEffect } from 'react';
import { Redirect, Route, Router, Switch } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { AppShell } from './AppShell';
import { ErrorBoundary } from './ErrorBoundary';
import { LoadingScreen } from './LoadingScreen';
import { NotFoundPage } from './NotFoundPage';
import { HOME_REDIRECT, PLANNED_NAV_ITEMS } from './routes';
import { PlannedModulePage } from '../features/planned/PlannedModulePage';
import { RateStudioPage } from '../features/rate-studio/RateStudioPage';
import { useApp } from '../store/appStore';
import { useRateStudio } from '../store/rateStudioStore';

export function App() {
  const theme = useApp((state) => state.theme);
  const hydrated = useRateStudio((state) => state.hydrated);
  const setHydrated = useRateStudio((state) => state.setHydrated);
  const refreshSaved = useRateStudio((state) => state.refreshSaved);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    refreshSaved();
    // Reading localStorage is synchronous; this timeout only guarantees that the
    // shell appears even when storage is blocked by the browser.
    const timer = window.setTimeout(() => setHydrated(true), 0);
    return () => window.clearTimeout(timer);
  }, [refreshSaved, setHydrated]);

  if (!hydrated) {
    return <LoadingScreen />;
  }

  return (
    <ErrorBoundary>
      {/* Hash routing: a static host (GitHub Pages) has no SPA rewrite rules,
          so `/#/rate-studio` must survive a reload while `/rate-studio` would
          404. All internal `<Link>`s render `#/...` automatically. */}
      <Router hook={useHashLocation}>
        <AppShell>
          <Switch>
            <Route path="/">
              <Redirect to={HOME_REDIRECT} />
            </Route>
            <Route path="/rate-studio" component={RateStudioPage} />
            {PLANNED_NAV_ITEMS.map((item) => (
              <Route key={item.id} path={item.path}>
                <PlannedModulePage contentKey={item.contentKey} />
              </Route>
            ))}
            <Route>
              <NotFoundPage />
            </Route>
          </Switch>
        </AppShell>
      </Router>
    </ErrorBoundary>
  );
}
