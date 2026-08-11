import { useCallback, useEffect, useState } from 'react';

function currentPath() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function useRoute() {
  const [path, setPath] = useState(currentPath);

  useEffect(() => {
    const handlePopState = () => setPath(currentPath());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((nextPath: string, replace = false) => {
    if (currentPath() === nextPath) return;
    window.history[replace ? 'replaceState' : 'pushState']({}, '', nextPath);
    setPath(currentPath());
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  return { path, navigate };
}
