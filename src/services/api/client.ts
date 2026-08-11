const configuredBase = import.meta.env.VITE_API_BASE_URL?.trim();
export const API_BASE_URL = (configuredBase || '/api/v1').replace(/\/$/, '');

export class ApiError extends Error {
  readonly status: number;
  readonly fields: Record<string, unknown> | null;

  constructor(message: string, status: number, fields: Record<string, unknown> | null = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields;
  }
}

interface ErrorEnvelope {
  error?: {
    message?: string;
    fields?: Record<string, unknown> | null;
  };
}

export interface Page<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

function endpointUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

function readCookie(name: string): string | null {
  const prefix = `${encodeURIComponent(name)}=`;
  const match = document.cookie.split('; ').find((item) => item.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : null;
}

async function csrfToken(): Promise<string> {
  const existing = readCookie('csrftoken');
  if (existing) return existing;
  const response = await fetch(endpointUrl('/auth/csrf'), {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new ApiError('无法建立安全会话，请刷新页面后重试。', response.status);
  const payload = (await response.json()) as { csrfToken: string };
  return readCookie('csrftoken') || payload.csrfToken;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method || 'GET').toUpperCase();
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    headers.set('X-CSRFToken', await csrfToken());
  }

  let response: Response;
  try {
    response = await fetch(endpointUrl(path), { ...init, method, headers, credentials: 'include' });
  } catch (error) {
    throw new ApiError(error instanceof Error ? error.message : '无法连接网站服务。', 0);
  }

  if (response.status === 204) return undefined as T;
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? ((await response.json()) as T & ErrorEnvelope)
    : null;
  if (!response.ok) {
    throw new ApiError(
      payload?.error?.message || `请求失败（${response.status}）。`,
      response.status,
      payload?.error?.fields || null,
    );
  }
  return payload as T;
}

export async function apiGetAll<T>(path: string): Promise<T[]> {
  const results: T[] = [];
  let next: string | null = path;
  let pageCount = 0;
  while (next && pageCount < 100) {
    const page: Page<T> = await apiRequest<Page<T>>(next);
    results.push(...page.results);
    next = page.next;
    pageCount += 1;
  }
  if (next) throw new ApiError('数据页数异常，请联系管理员。', 500);
  return results;
}
