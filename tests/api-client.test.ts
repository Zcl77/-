import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiGetAll, apiRequest } from '../src/services/api/client';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('REST API client', () => {
  beforeEach(() => {
    vi.stubGlobal('document', { cookie: '' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('uses same-origin cookies for public requests', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(jsonResponse({ ok: true })));
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiRequest<{ ok: boolean }>('/site')).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/site',
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    );
  });

  it('obtains a CSRF token before an unsafe request when no cookie exists', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ csrfToken: 'issued-token' }))
      .mockResolvedValueOnce(jsonResponse({ id: 'saved' }, 201));
    vi.stubGlobal('fetch', fetchMock);

    await apiRequest('/reviews', { method: 'POST', body: JSON.stringify({ rating: 5 }) });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/v1/auth/csrf',
      expect.objectContaining({ credentials: 'include' }),
    );
    const request = fetchMock.mock.calls[1][1] as RequestInit;
    expect(new Headers(request.headers).get('X-CSRFToken')).toBe('issued-token');
    expect(request.credentials).toBe('include');
  });

  it('reads the current CSRF cookie for every unsafe request', async () => {
    const browserDocument = { cookie: 'csrftoken=first-token' };
    vi.stubGlobal('document', browserDocument);
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(jsonResponse({ ok: true })));
    vi.stubGlobal('fetch', fetchMock);

    await apiRequest('/first', { method: 'POST' });
    browserDocument.cookie = 'csrftoken=rotated-token';
    await apiRequest('/second', { method: 'POST' });

    expect(new Headers(fetchMock.mock.calls[0][1].headers).get('X-CSRFToken')).toBe('first-token');
    expect(new Headers(fetchMock.mock.calls[1][1].headers).get('X-CSRFToken')).toBe('rotated-token');
  });

  it('surfaces structured server errors to the interface', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ error: { message: '字段校验失败。', fields: { name: ['此字段不能为空。'] } } }, 400),
        ),
    );

    const error = await apiRequest('/site').catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      message: '字段校验失败。',
      fields: { name: ['此字段不能为空。'] },
    });
  });

  it('follows paginated links and combines their results', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          count: 3,
          next: 'http://localhost/api/v1/works?page=2',
          previous: null,
          results: [1, 2],
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ count: 3, next: null, previous: '/api/v1/works', results: [3] }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiGetAll<number>('/works')).resolves.toEqual([1, 2, 3]);
    expect(fetchMock.mock.calls[1][0]).toBe('http://localhost/api/v1/works?page=2');
  });

  it('turns network failures into a stable API error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    await expect(apiRequest('/site')).rejects.toMatchObject({
      name: 'ApiError',
      status: 0,
      message: 'offline',
    });
  });
});
