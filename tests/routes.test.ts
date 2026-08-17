import { describe, expect, it } from 'vitest';
import { parseRoute } from '../src/domain/routes';

describe('route parsing', () => {
  it.each([
    ['/', 'gallery'],
    ['/process', 'process'],
    ['/contact', 'contact'],
    ['/login', 'account'],
    ['/my-projects', 'account'],
  ] as const)('maps %s to the expected page', (path, tab) => {
    expect(parseRoute(path)).toMatchObject({ tab, found: true });
  });

  it('supports shareable work URLs, trailing slashes and query strings', () => {
    expect(parseRoute('/works/%E5%BC%A0%E5%9B%AD/?from=share')).toEqual({
      tab: 'gallery',
      workSlug: '张园',
      projectId: null,
      orderId: null,
      found: true,
    });
  });

  it('opens a private project route without treating its id as public content', () => {
    expect(parseRoute('/my-projects/550e8400-e29b-41d4-a716-446655440000')).toEqual({
      tab: 'account',
      workSlug: null,
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      orderId: null,
      found: true,
    });
  });

  it('recognizes the private checkout route', () => {
    expect(parseRoute('/my-projects/orders/550e8400-e29b-41d4-a716-446655440000/checkout')).toEqual({
      tab: 'account',
      workSlug: null,
      projectId: null,
      orderId: '550e8400-e29b-41d4-a716-446655440000',
      found: true,
    });
  });

  it('rejects unknown and malformed routes safely', () => {
    expect(parseRoute('/unknown')).toMatchObject({ found: false });
    expect(parseRoute('/works/%E0%A4%A')).toMatchObject({ found: false });
    expect(parseRoute('/my-projects/not-a-uuid')).toMatchObject({ found: false });
  });
});
