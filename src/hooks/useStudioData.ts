import { useCallback, useEffect, useRef, useState } from 'react';
import { CraftsmanProfile, Project, Review, ReviewStatus, StudioSettings } from '../types';
import { getDataProvider, loadStudioBackend } from '../services/backend';
import { getErrorMessage } from '../services/backend/errors';
import { resolveFailedDataStatus, resolveLoadedDataStatus } from '../domain/dataState';

const DEFAULT_CATEGORIES = ['岭南市井烟火', '西洋折衷主义', '古典金石微刻', '水上水乡生态'];
const DEFAULT_SETTINGS: StudioSettings = { wechatId: '', wechatQrUrl: '' };

export type StudioDataStatus = 'loading' | 'ready' | 'empty' | 'stale' | 'error';

function readArrayCache<T>(key: string): T[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(value) ? value as T[] : [];
  } catch {
    return [];
  }
}

function readObjectCache<T extends object>(key: string, fallback: T): T {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? 'null');
    return value && typeof value === 'object' && !Array.isArray(value) ? value as T : fallback;
  } catch {
    return fallback;
  }
}

function writeCache(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // A cache failure cannot change the result of a remote write.
  }
}

function clearLegacyPrivateCaches(): void {
  try {
    ['ZHIXING_PROJECTS', 'ZHIXING_REVIEWS', 'ZHIXING_CATEGORIES', 'ZHIXING_HIDDEN_CATEGORIES']
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    // Authorization remains enforced by the selected backend.
  }
}

export function useStudioData(isAdmin: boolean) {
  const provider = getDataProvider();
  const [projects, setProjects] = useState<Project[]>(() => provider === 'firebase'
    ? readArrayCache<Project>('ZHIXING_PUBLIC_PROJECTS')
    : []);
  const [reviews, setReviews] = useState<Review[]>(() => provider === 'firebase'
    ? readArrayCache<Review>('ZHIXING_APPROVED_REVIEWS')
    : []);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [hiddenCategories, setHiddenCategories] = useState<string[]>([]);
  const [craftsmenProfiles, setCraftsmenProfiles] = useState<Record<string, CraftsmanProfile>>(() => provider === 'firebase'
    ? readObjectCache('ZHIXING_CRAFTSMEN', {})
    : {});
  const [studioSettings, setStudioSettings] = useState<StudioSettings>(() => provider === 'firebase'
    ? readObjectCache('ZHIXING_SETTINGS', DEFAULT_SETTINGS)
    : DEFAULT_SETTINGS);
  const [dataError, setDataError] = useState<string | null>(null);
  const [dataStatus, setDataStatus] = useState<StudioDataStatus>('loading');
  const [sourceLabel, setSourceLabel] = useState(provider === 'mock' ? '本地演示数据' : 'Firebase 实时数据');
  const [retryToken, setRetryToken] = useState(0);
  const projectsRef = useRef(projects);

  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

  useEffect(() => {
    clearLegacyPrivateCaches();
    if (!isAdmin) {
      setProjects((current) => current.filter((project) => project.visibility === 'public'));
      setReviews((current) => current.filter((review) => review.status === 'approved'));
      setCategories(DEFAULT_CATEGORIES);
      setHiddenCategories([]);
    }

    setDataError(null);
    setDataStatus('loading');
    let active = true;
    let unsubscribe: () => void = () => undefined;
    let projectsResolved = false;
    let reviewsResolved = false;
    let sourceProjectCount = projectsRef.current.length;
    let failed = false;

    const resolveInitialLoad = () => {
      if (!active || failed || !projectsResolved || !reviewsResolved) return;
      setDataStatus(resolveLoadedDataStatus(sourceProjectCount));
    };

    void loadStudioBackend()
      .then((backend) => {
        if (!active) return;
        setSourceLabel(backend.label);
        unsubscribe = backend.content.subscribe(isAdmin, {
          onProjects(value) {
            if (!active) return;
            sourceProjectCount = value.length;
            projectsRef.current = value;
            setProjects(value);
            if (!isAdmin && backend.provider === 'firebase') writeCache('ZHIXING_PUBLIC_PROJECTS', value);
            projectsResolved = true;
            resolveInitialLoad();
          },
          onReviews(value) {
            if (!active) return;
            setReviews(value);
            if (!isAdmin && backend.provider === 'firebase') writeCache('ZHIXING_APPROVED_REVIEWS', value);
            reviewsResolved = true;
            resolveInitialLoad();
          },
          onCategories: (value) => active && setCategories(value),
          onHiddenCategories: (value) => active && setHiddenCategories(value),
          onCraftsmen(value) {
            if (!active) return;
            setCraftsmenProfiles(value);
            if (backend.provider === 'firebase') writeCache('ZHIXING_CRAFTSMEN', value);
          },
          onSettings(value) {
            if (!active) return;
            setStudioSettings(value);
            if (backend.provider === 'firebase') writeCache('ZHIXING_SETTINGS', value);
          },
          onError(error) {
            if (!active) return;
            failed = true;
            setDataError(getErrorMessage(error, '数据连接失败。'));
            setDataStatus(resolveFailedDataStatus(projectsRef.current.length > 0));
          },
        });
      })
      .catch((error: unknown) => {
        if (!active) return;
        failed = true;
        setDataError(getErrorMessage(error, '数据源初始化失败。'));
        setDataStatus(resolveFailedDataStatus(projectsRef.current.length > 0));
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [isAdmin, retryToken]);

  const withBackend = useCallback(async <T,>(operation: (backend: Awaited<ReturnType<typeof loadStudioBackend>>) => Promise<T>) => {
    return operation(await loadStudioBackend());
  }, []);

  const addCategory = useCallback(async (name: string) => {
    await withBackend((backend) => backend.categories.add(name, categories));
  }, [categories, withBackend]);

  const updateCategoryVisibility = useCallback(async (name: string, visible: boolean) => {
    const nextHidden = visible
      ? hiddenCategories.filter((category) => category !== name)
      : Array.from(new Set([...hiddenCategories, name]));
    await withBackend((backend) => backend.categories.setVisibility(nextHidden, projects, name, visible));
  }, [hiddenCategories, projects, withBackend]);

  return {
    projects,
    reviews,
    categories,
    hiddenCategories,
    craftsmenProfiles,
    studioSettings,
    dataError,
    dataStatus,
    sourceLabel,
    provider,
    isLoading: dataStatus === 'loading',
    retry: () => setRetryToken((value) => value + 1),
    saveProject: (project: Project) => withBackend((backend) => backend.projects.save(project)),
    removeProject: (projectId: string) => withBackend((backend) => backend.projects.remove(projectId)),
    submitReview: (input: Parameters<Awaited<ReturnType<typeof loadStudioBackend>>['reviews']['submit']>[0]) => withBackend((backend) => backend.reviews.submit(input)),
    moderateReview: (id: string, status: Exclude<ReviewStatus, 'pending'>) => withBackend((backend) => backend.reviews.moderate(id, status)),
    removeReview: (id: string) => withBackend((backend) => backend.reviews.remove(id)),
    addCategory,
    renameCategory: (oldName: string, newName: string) => withBackend((backend) => backend.categories.rename(oldName, newName, categories, hiddenCategories, projects)),
    deleteCategory: (name: string) => withBackend((backend) => backend.categories.remove(name, categories, hiddenCategories, projects)),
    updateCategoryVisibility,
    saveStudioSettings: (settings: StudioSettings) => withBackend((backend) => backend.settings.saveStudio(settings)),
    saveCraftsmenProfiles: (profiles: Record<string, CraftsmanProfile>) => withBackend((backend) => backend.settings.saveCraftsmen(profiles)),
    uploadImage: (...args: Parameters<Awaited<ReturnType<typeof loadStudioBackend>>['media']['upload']>) => withBackend((backend) => backend.media.upload(...args)),
    deleteImage: (asset?: Parameters<Awaited<ReturnType<typeof loadStudioBackend>>['media']['remove']>[0]) => withBackend((backend) => backend.media.remove(asset)),
  };
}
