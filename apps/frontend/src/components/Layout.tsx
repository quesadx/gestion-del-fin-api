import { NavLink, Outlet } from 'react-router-dom';
import { entities } from '../entities';
import { useAppState } from '../appState';

export default function Layout() {
  const { campId, setCampId, apiBaseUrl, setApiBaseUrl, user, logout } = useAppState();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-title">Gestion del fin</div>
          <div className="brand-subtitle">Frontend</div>
        </div>
        <nav className="nav">
          {entities.map((entity) => (
            <NavLink
              key={entity.key}
              to={`/${entity.route}`}
              className={({ isActive }) =>
                isActive ? 'nav-link nav-link-active' : 'nav-link'
              }
            >
              {entity.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="content">
        <header className="topbar">
          <div className="topbar-group">
            <label className="field">
              <span>Active camp ID</span>
              <input
                value={campId}
                onChange={(event) => setCampId(event.target.value)}
                placeholder="e.g. 1"
              />
            </label>
            <label className="field">
              <span>API base</span>
              <input
                value={apiBaseUrl}
                onChange={(event) => setApiBaseUrl(event.target.value)}
                placeholder="/api"
              />
            </label>
          </div>
          <div className="topbar-group">
            <div className="user-chip">{user ?? 'Unknown user'}</div>
            <button className="button button-muted" onClick={logout}>
              Logout
            </button>
          </div>
        </header>
        <main className="main fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
