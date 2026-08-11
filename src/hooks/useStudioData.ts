import { useCallback, useEffect, useState } from 'react';
import { INITIAL_PROJECTS, INITIAL_REVIEWS } from '../data';
import { CraftsmanProfile, Project, Review, ReviewStatus, StudioSettings } from '../types';
import {
  deleteCategory,
  removeProject,
  renameCategory,
  saveProject,
  setCategoryVisibility,
  subscribeProjects,
} from '../services/firebase/projectRepository';
import {
  moderateReview,
  removeReview,
  subscribeReviews,
} from '../services/firebase/reviewRepository';
import { submitReview } from '../services/reviewSubmissionService';
import {
  saveCategories,
  saveCraftsmenProfiles,
  saveStudioSettings,
  subscribeMetadata,
} from '../services/firebase/metadataRepository';
import { getErrorMessage } from '../services/firebase/errors';

const DEFAULT_CATEGORIES = ['岭南市井烟火', '西洋折衷主义', '古典金石微刻', '水上水乡生态'];
const DEFAULT_SETTINGS: StudioSettings = { wechatId: '', wechatQrUrl: '' };

function readCache<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

function writeCache(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Cache failure must never masquerade as a remote write failure.
  }
}

function clearLegacyPrivateCaches() {
  try {
    ['ZHIXING_PROJECTS', 'ZHIXING_REVIEWS', 'ZHIXING_CATEGORIES', 'ZHIXING_HIDDEN_CATEGORIES']
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    // Cache cleanup is best-effort; authorization still comes from Firebase Rules.
  }
}

export function useStudioData(isAdmin: boolean) {
  const [projects, setProjects] = useState<Project[]>(() => readCache('ZHIXING_PUBLIC_PROJECTS', INITIAL_PROJECTS));
  const [reviews, setReviews] = useState<Review[]>(() => readCache('ZHIXING_APPROVED_REVIEWS', INITIAL_REVIEWS));
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [hiddenCategories, setHiddenCategories] = useState<string[]>([]);
  const [craftsmenProfiles, setCraftsmenProfiles] = useState<Record<string, CraftsmanProfile>>(() => readCache('ZHIXING_CRAFTSMEN', {}));
  const [studioSettings, setStudioSettings] = useState<StudioSettings>(() => readCache('ZHIXING_SETTINGS', DEFAULT_SETTINGS));
  const [dataError, setDataError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    clearLegacyPrivateCaches();
    if (!isAdmin) {
      setProjects((current) => current.filter((project) => project.visibility === 'public'));
      setReviews((current) => current.filter((review) => review.status === 'approved'));
      setCategories(DEFAULT_CATEGORIES);
      setHiddenCategories([]);
    }
    setDataError(null);
    setIsLoading(true);
    let projectsResolved = false;
    let reviewsResolved = false;
    const resolveInitialLoad = () => {
      if (projectsResolved && reviewsResolved) setIsLoading(false);
    };
    const onError = (error: Error) => {
      setDataError(getErrorMessage(error, '实时数据连接失败，当前显示本机缓存。'));
      setIsLoading(false);
    };
    const unsubscribeProjects = subscribeProjects(isAdmin, (value) => {
      setProjects(value);
      if (!isAdmin) writeCache('ZHIXING_PUBLIC_PROJECTS', value);
      projectsResolved = true;
      resolveInitialLoad();
    }, onError);
    const unsubscribeReviews = subscribeReviews(isAdmin, (value) => {
      setReviews(value);
      if (!isAdmin) writeCache('ZHIXING_APPROVED_REVIEWS', value);
      reviewsResolved = true;
      resolveInitialLoad();
    }, onError);
    const unsubscribeMetadata = subscribeMetadata(isAdmin, {
      onCategories: setCategories,
      onHiddenCategories: setHiddenCategories,
      onCraftsmen: (value) => { setCraftsmenProfiles(value); writeCache('ZHIXING_CRAFTSMEN', value); },
      onSettings: (value) => { setStudioSettings(value); writeCache('ZHIXING_SETTINGS', value); },
      onError,
    });
    return () => {
      unsubscribeProjects();
      unsubscribeReviews();
      unsubscribeMetadata();
    };
  }, [isAdmin]);

  const addCategory = useCallback(async (name: string) => {
    await saveCategories([...categories, name]);
  }, [categories]);

  const updateCategoryVisibility = useCallback(async (name: string, visible: boolean) => {
    const nextHidden = visible
      ? hiddenCategories.filter((category) => category !== name)
      : [...hiddenCategories, name];
    await setCategoryVisibility(nextHidden, projects, name, visible);
  }, [hiddenCategories, projects]);

  return {
    projects,
    reviews,
    categories,
    hiddenCategories,
    craftsmenProfiles,
    studioSettings,
    dataError,
    isLoading,
    saveProject,
    removeProject,
    submitReview,
    moderateReview: (id: string, status: Exclude<ReviewStatus, 'pending'>) => moderateReview(id, status),
    removeReview,
    addCategory,
    renameCategory: (oldName: string, newName: string) => renameCategory(oldName, newName, categories, hiddenCategories, projects),
    deleteCategory: (name: string) => deleteCategory(name, categories, hiddenCategories, projects),
    updateCategoryVisibility,
    saveStudioSettings,
    saveCraftsmenProfiles,
  };
}
