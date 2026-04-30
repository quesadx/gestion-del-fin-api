import { useEffect, useMemo, useState } from 'react';
import { apiFetch, ApiError } from '../api';
import { ListConfig } from '../entities';

type ListPanelProps = {
  list: ListConfig;
  title: string;
  campId: string;
  apiBaseUrl: string;
  token: string | null;
  refreshKey?: number;
  onSelectId?: (id: string) => void;
};

type ListState = {
  loading: boolean;
  error: string | null;
  data: unknown;
};

function extractItems(payload: unknown): Array<Record<string, unknown>> | null {
  if (Array.isArray(payload)) return payload as Array<Record<string, unknown>>;
  if (!payload || typeof payload !== 'object') return null;

  const payloadObj = payload as Record<string, unknown>;
  const candidates = ['data', 'items', 'inventory', 'audit', 'transfers'];
  for (const key of candidates) {
    if (Array.isArray(payloadObj[key])) return payloadObj[key] as Array<Record<string, unknown>>;
  }

  return null;
}

function guessLabel(item: Record<string, unknown>) {
  return (
    item.name ||
    item.full_name ||
    item.username ||
    item.destination ||
    item.applicant_name ||
    item.resource_name ||
    item.resource_type_id ||
    item.id ||
    'item'
  );
}

export default function ListPanel({
  list,
  title,
  campId,
  apiBaseUrl,
  token,
  refreshKey,
  onSelectId,
}: ListPanelProps) {
  const [state, setState] = useState<ListState>({
    loading: false,
    error: null,
    data: null,
  });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const requiresCampId = list.path.includes(':campId');
  const query = list.pagination ? { page, limit } : undefined;

  const canFetch = !requiresCampId || Boolean(campId);

  const fetchList = async () => {
    if (!canFetch) {
      setState((prev) => ({ ...prev, error: 'Set an active camp ID to load this list.' }));
      return;
    }

    setState({ loading: true, error: null, data: null });
    try {
      const data = await apiFetch<unknown>({
        baseUrl: apiBaseUrl,
        path: list.path,
        token,
        pathParams: { campId },
        query,
      });
      setState({ loading: false, error: null, data });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load list.';
      setState({ loading: false, error: message, data: null });
    }
  };

  useEffect(() => {
    void fetchList();
  }, [campId, apiBaseUrl, list.path, page, limit, token, refreshKey]);

  const items = useMemo(() => extractItems(state.data), [state.data]);

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h2>{title}</h2>
          <p className="muted">GET {list.path}</p>
        </div>
        <div className="card-actions">
          {list.pagination && (
            <div className="pagination">
              <label>
                Page
                <input
                  type="number"
                  min={1}
                  value={page}
                  onChange={(event) => setPage(Number(event.target.value) || 1)}
                />
              </label>
              <label>
                Limit
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={limit}
                  onChange={(event) => setLimit(Number(event.target.value) || 10)}
                />
              </label>
            </div>
          )}
          <button className="button button-muted" onClick={fetchList}>
            Refresh
          </button>
        </div>
      </div>

      {state.loading && <p className="muted">Loading...</p>}
      {state.error && <div className="error">{state.error}</div>}

      {items && items.length > 0 && (
        <ul className="list">
          {items.map((item, index) => (
            <li key={String(item.id ?? index)}>
              <div>
                <strong>{String(guessLabel(item))}</strong>
                {item.id !== undefined && <span className="muted"> # {String(item.id)}</span>}
              </div>
              {item.id !== undefined && onSelectId && (
                <button
                  className="button button-small"
                  onClick={() => onSelectId(String(item.id))}
                >
                  Use ID
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {state.data && (
        <details className="json-view">
          <summary>Raw response</summary>
          <pre>{JSON.stringify(state.data, null, 2)}</pre>
        </details>
      )}
    </section>
  );
}
