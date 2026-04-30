import { Navigate, Route, Routes } from 'react-router-dom';
import { AppStateProvider, useAppState } from './appState';
import { entities } from './entities';
import Layout from './components/Layout';
import LoginPage from './components/LoginPage';
import CrudPage from './components/CrudPage';

function RequireAuth({ children }: { children: JSX.Element }) {
  const { token } = useAppState();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <AppStateProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/camps" replace />} />
          {entities.map((entity) => (
            <Route
              key={entity.key}
              path={entity.route}
              element={<CrudPage entity={entity} />}
            />
          ))}
        </Route>
      </Routes>
    </AppStateProvider>
  );
}
