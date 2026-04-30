export type ApiFetchOptions = {
  baseUrl: string;
  path: string;
  method?: string;
  token?: string | null;
  pathParams?: Record<string, string | number | undefined>;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
};

export class ApiError extends Error {
  status: number;
  payload?: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

function resolvePath(path: string, params: Record<string, string | number | undefined> = {}) {
  return path.replace(/:([a-zA-Z_]+)/g, (match, key) => {
    const value = params[key];
    if (value === undefined || value === null || value === '') {
      throw new Error(`Missing path param: ${key}`);
    }
    return encodeURIComponent(String(value));
  });
}

function buildUrl(
  baseUrl: string,
  path: string,
  query?: Record<string, string | number | boolean | undefined>,
) {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const combined = `${normalizedBase}${normalizedPath}`;
  const isAbsolute = /^https?:\/\//i.test(combined);
  const url = new URL(isAbsolute ? combined : `http://local${combined}`);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      url.searchParams.set(key, String(value));
    });
  }

  if (isAbsolute) {
    return url.toString();
  }

  return `${url.pathname}${url.search}`;
}

export async function apiFetch<T>({
  baseUrl,
  path,
  method = 'GET',
  token,
  pathParams,
  query,
  body,
}: ApiFetchOptions): Promise<T> {
  const resolvedPath = resolvePath(path, pathParams);
  const url = buildUrl(baseUrl, resolvedPath, query);

  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let payload: string | undefined;
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const response = await fetch(url, {
    method,
    headers,
    body: payload,
  });

  if (response.status === 204) {
    return null as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  const data = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof data === 'object' && data && 'error' in data
        ? (data as { error?: { message?: string } }).error?.message ?? 'Request failed'
        : `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, data);
  }

  return data as T;
}
