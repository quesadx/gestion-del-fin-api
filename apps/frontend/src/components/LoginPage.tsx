import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import { useAppState } from '../appState';

export default function LoginPage() {
  const navigate = useNavigate();
  const { apiBaseUrl, setToken, setUser } = useAppState();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await apiFetch<{ token: string; user?: { username?: string } }>({
        baseUrl: apiBaseUrl,
        path: '/auth/login',
        method: 'POST',
        body: { username, password },
      });

      setToken(result.token);
      setUser(result.user?.username ?? username);
      navigate('/camps');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Gestion del fin</h1>
        <p className="muted">Sign in to manage camps and resources.</p>
        <form onSubmit={handleSubmit}>
          <label className="field">
            <span>Username</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {error && <div className="error">{error}</div>}
          <button className="button" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
