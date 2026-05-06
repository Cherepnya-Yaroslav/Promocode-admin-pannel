import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../auth/auth-context';
import { AppFooter } from './AppFooter';

const navigationItems = [
  { label: 'Users', to: '/app/analytics/users' },
  { label: 'Promocodes', to: '/app/analytics/promocodes' },
  { label: 'Ledger', to: '/app/analytics/promo-usages' },
  { label: 'Operations', to: '/app/operations/promocodes' }
];

export function AppShell(): JSX.Element {
  const auth = useAuth();

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="brand-lockup">
          <div className="brand-lockup__mark">P</div>
          <div>
            <strong>PromoCode Manager</strong>
            <span>Revenue console</span>
          </div>
        </div>
        <nav className="sidebar-nav" aria-label="Primary">
          {navigationItems.map((item) => (
            <NavLink
              key={item.to}
              className={({ isActive }) =>
                isActive ? 'sidebar-link sidebar-link--active' : 'sidebar-link'
              }
              to={item.to}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footnote">
          <span>Promo instruments should feel operational, not decorative.</span>
        </div>
      </aside>
      <div className="app-main">
        <header className="glass-topbar">
          <div>
            <h1>Promo operations console</h1>
          </div>
          <div className="topbar-actions">
            <div className="topbar-user">
              <strong>
                {auth.currentUser?.firstName} {auth.currentUser?.lastName}
              </strong>
              <span>{auth.currentUser?.email}</span>
            </div>
            <button
              className="button button--secondary"
              onClick={auth.logout}
              type="button"
            >
              Log out
            </button>
          </div>
        </header>
        <main className="app-content">
          <Outlet />
        </main>
        <AppFooter />
      </div>
    </div>
  );
}
