import { useCallback, useEffect, useRef, useState } from 'react';
import { getPublicSiteData } from '../services/api/repositories';
import { Project, PublicProcessPost, Review, SiteInfo } from '../types';
import { LatestRequestGate, useVisiblePolling } from './useVisiblePolling';
import { useI18n } from '../i18n';

interface PublicSiteData {
  site: SiteInfo;
  categories: string[];
  projects: Project[];
  processPosts: PublicProcessPost[];
  reviews: Review[];
}

const EMPTY_DATA: PublicSiteData = {
  site: {
    studioName: '知行造境',
    studioNameEn: 'Zhixing Studio',
    tagline: '',
    description: '',
    contactName: '',
    phone: '',
    wechat: '',
    email: '',
    privacyNotice: '',
    isDevData: false,
  },
  categories: [],
  projects: [],
  processPosts: [],
  reviews: [],
};

export function usePublicSiteData() {
  const { errorMessage } = useI18n();
  const [data, setData] = useState<PublicSiteData>(EMPTY_DATA);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const requestGate = useRef(new LatestRequestGate());

  const fetchData = useCallback(
    async (background = false) => {
      const isLatest = requestGate.current.issue();
      if (!background) {
        setStatus('loading');
        setError(null);
      }
      try {
        const next = await getPublicSiteData();
        if (!isLatest()) return;
        setData(next);
        setStatus('ready');
        setRefreshError(null);
      } catch (reason) {
        if (!isLatest()) return;
        const message = errorMessage(reason, '公开内容加载失败。');
        if (background) {
          setRefreshError(message);
        } else {
          setError(message);
          setStatus('error');
        }
        throw reason;
      }
    },
    [errorMessage],
  );

  const reload = useCallback(async () => {
    try {
      await fetchData(false);
    } catch {
      // The hook exposes the user-facing error state.
    }
  }, [fetchData]);
  useVisiblePolling(() => fetchData(true), 60_000, status === 'ready');

  useEffect(() => {
    const gate = requestGate.current;
    void reload();
    return () => {
      gate.invalidate();
    };
  }, [reload]);

  return { ...data, status, error, refreshError, reload };
}
