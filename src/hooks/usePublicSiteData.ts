import { useCallback, useEffect, useRef, useState } from 'react';
import { getPublicSiteData } from '../services/api/repositories';
import { Project, PublicProcessPost, Review, SiteInfo } from '../types';

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
  const [data, setData] = useState<PublicSiteData>(EMPTY_DATA);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);

  const reload = useCallback(async () => {
    const version = ++requestVersion.current;
    setStatus('loading');
    setError(null);
    try {
      const next = await getPublicSiteData();
      if (requestVersion.current !== version) return;
      setData(next);
      setStatus('ready');
    } catch (reason) {
      if (requestVersion.current !== version) return;
      setError(reason instanceof Error ? reason.message : '公开内容加载失败。');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void reload();
    return () => { requestVersion.current += 1; };
  }, [reload]);

  return { ...data, status, error, reload };
}
