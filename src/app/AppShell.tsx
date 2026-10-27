import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { Icon } from './icons';
import { READY_NAV_ITEMS, PLANNED_NAV_ITEMS } from './routes';
import type { NavItem } from './routes';
import { ThemeToggle } from './ThemeToggle';
import { useApp } from '../store/appStore';

interface NavEntryProps {
  readonly item: NavItem;
  readonly currentPath: string;
}

function NavEntry({ item, currentPath }: NavEntryProps) {
  const { t } = useTranslation();
  const active = currentPath === item.path;

  return (
    <li>
      <Link href={item.path} className="nav-item" aria-current={active ? 'page' : undefined}>
        <Icon name={item.icon} className="nav-item__icon" />
        <span className="grow">{t(item.labelKey)}</span>
        <span className="nav-item__tag">
          {item.status === 'ready' ? t('nav.tagReady') : t('nav.tagPlanned')}
        </span>
      </Link>
    </li>
  );
}

export function AppShell({ children }: { readonly children: ReactNode }) {
  const { t } = useTranslation();
  const [location] = useLocation();
  const navigationOpen = useApp((state) => state.navigationOpen);
  const setNavigationOpen = useApp((state) => state.setNavigationOpen);

  useEffect(() => {
    setNavigationOpen(false);
  }, [location, setNavigationOpen]);

  useEffect(() => {
    document.body.style.overflow = navigationOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [navigationOpen]);

  return (
    <div className="app-shell" data-nav-open={navigationOpen}>
      <div className="brand">
        <Icon name="logo" className="brand__mark" />
        <span className="brand__name">{t('app.title')}</span>
        <span className="brand__tag">{t('app.version')}</span>
      </div>

      <header className="app-header">
        <button
          type="button"
          className="btn btn--ghost btn--icon nav-toggle"
          onClick={() => setNavigationOpen(true)}
          aria-label={t('nav.open')}
          aria-expanded={navigationOpen}
        >
          <Icon name="menu" />
        </button>
        <span className="app-header__brand">
          <Icon name="logo" className="brand__mark" />
          {t('app.title')}
        </span>
        <div className="grow" />
        <span className="badge badge--accent nowrap">{t('app.tagline')}</span>
        <ThemeToggle />
      </header>

      <nav className="sidebar" aria-label={t('nav.menu')}>
        <div className="sidebar__group">
          <div className="sidebar__title">{t('nav.sectionLab')}</div>
          <ul className="nav-list">
            {READY_NAV_ITEMS.map((item) => (
              <NavEntry key={item.id} item={item} currentPath={location} />
            ))}
          </ul>
        </div>
        <div className="sidebar__group">
          <div className="sidebar__title">{t('nav.sectionPlanned')}</div>
          <ul className="nav-list">
            {PLANNED_NAV_ITEMS.map((item) => (
              <NavEntry key={item.id} item={item} currentPath={location} />
            ))}
          </ul>
        </div>
      </nav>

      <button
        type="button"
        className="backdrop"
        aria-label={t('nav.close')}
        onClick={() => setNavigationOpen(false)}
      />

      <main className="app-main">{children}</main>
    </div>
  );
}
