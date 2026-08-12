export type RouteTab = 'gallery' | 'process' | 'contact' | 'account';

export interface RouteState {
  tab: RouteTab;
  workSlug: string | null;
  projectId: string | null;
  found: boolean;
}

function decodePathSegment(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

export function parseRoute(path: string): RouteState {
  const pathname = path.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  const workMatch = pathname.match(/^\/works\/([^/]+)$/);
  const projectMatch = pathname.match(/^\/my-projects\/([0-9a-f-]+)$/i);

  if (pathname === '/') return { tab: 'gallery', workSlug: null, projectId: null, found: true };
  if (workMatch) {
    const workSlug = decodePathSegment(workMatch[1]);
    return { tab: 'gallery', workSlug, projectId: null, found: workSlug !== null };
  }
  if (pathname === '/process') return { tab: 'process', workSlug: null, projectId: null, found: true };
  if (pathname === '/contact') return { tab: 'contact', workSlug: null, projectId: null, found: true };
  if (pathname === '/login' || pathname === '/my-projects') {
    return { tab: 'account', workSlug: null, projectId: null, found: true };
  }
  if (projectMatch) {
    return { tab: 'account', workSlug: null, projectId: projectMatch[1], found: true };
  }
  return { tab: 'gallery', workSlug: null, projectId: null, found: false };
}
