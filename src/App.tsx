import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { RefreshCw } from 'lucide-react';
import AdminDashboard from './components/AdminDashboard';
import CommissionForm from './components/CommissionForm';
import GalleryView from './components/GalleryView';
import Sidebar from './components/Sidebar';
import WIPTimeline from './components/WIPTimeline';
import StatusNotice from './components/ui/StatusNotice';
import { getPublicProjects, retainReferencedAssets } from './domain/visibility';
import { useAdminAuth } from './hooks/useAdminAuth';
import { useStudioData } from './hooks/useStudioData';
import { CraftsmanProfile, ImageEditContext, Project, StoredImage, StudioSettings } from './types';

type AppTab = 'gallery' | 'wip' | 'commission' | 'admin';

async function deleteAssets(
  assets: StoredImage[],
  remove: (asset?: StoredImage) => Promise<void>,
): Promise<number> {
  const results = await Promise.allSettled(assets.map((asset) => remove(asset)));
  return results.filter((result) => result.status === 'rejected').length;
}

async function cleanRemovedAssets(
  previous: StoredImage[] = [],
  next: StoredImage[] = [],
  remove: (asset?: StoredImage) => Promise<void>,
): Promise<number> {
  const retainedPaths = new Set(next.map((asset) => asset.path));
  const removed = previous.filter((asset) => !retainedPaths.has(asset.path));
  return deleteAssets(removed, remove);
}

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('gallery');
  const [activeEditContext, setActiveEditContext] = useState<ImageEditContext | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const { authState, isAdmin, login, logout } = useAdminAuth();
  const studio = useStudioData(isAdmin);

  const publicProjects = useMemo(
    () => getPublicProjects(studio.projects, isAdmin ? studio.hiddenCategories : []),
    [isAdmin, studio.projects, studio.hiddenCategories],
  );
  const publicCategories = useMemo(
    () => Array.from(new Set(publicProjects.map((project) => project.category))),
    [publicProjects],
  );
  const approvedReviews = useMemo(
    () => studio.reviews.filter((review) => review.status === 'approved'),
    [studio.reviews],
  );
  const showInitialLoading = studio.dataStatus === 'loading' && studio.projects.length === 0;
  const showBlockingError = studio.dataStatus === 'error' && studio.projects.length === 0;

  useEffect(() => {
    if (!isAdmin) setActiveEditContext(null);
  }, [isAdmin]);

  const persistProject = useCallback(async (project: Project): Promise<number> => {
    const previous = studio.projects.find((item) => item.id === project.id);
    await studio.saveProject(project);
    return cleanRemovedAssets(previous?.imageAssets, project.imageAssets, studio.deleteImage);
  }, [studio]);

  const saveProject = useCallback(async (project: Project) => {
    const cleanupFailures = await persistProject(project);
    if (cleanupFailures > 0) {
      setToast(`项目已保存，但有 ${cleanupFailures} 个旧媒体对象清理失败，请检查媒体存储。`);
      window.setTimeout(() => setToast(null), 5000);
    }
  }, [persistProject]);

  const deleteProject = useCallback(async (project: Project) => {
    await studio.removeProject(project.id);
    const cleanupFailures = await deleteAssets(project.imageAssets ?? [], studio.deleteImage);
    if (cleanupFailures > 0) {
      setToast(`项目记录已删除，但有 ${cleanupFailures} 个媒体对象清理失败，请检查媒体存储。`);
      window.setTimeout(() => setToast(null), 5000);
    }
  }, [studio]);

  const persistSettings = useCallback(async (settings: StudioSettings): Promise<number> => {
    const previousAsset = studio.studioSettings.wechatQrAsset;
    await studio.saveStudioSettings(settings);
    if (previousAsset && previousAsset.path !== settings.wechatQrAsset?.path) {
      return deleteAssets([previousAsset], studio.deleteImage);
    }
    return 0;
  }, [studio]);

  const saveSettings = useCallback(async (settings: StudioSettings) => {
    const cleanupFailures = await persistSettings(settings);
    if (cleanupFailures > 0) {
      setToast('设置已保存，但旧二维码清理失败，请检查媒体存储。');
      window.setTimeout(() => setToast(null), 5000);
    }
  }, [persistSettings]);

  const persistCraftsmen = useCallback(async (profiles: Record<string, CraftsmanProfile>): Promise<number> => {
    const nextPaths = new Set(Object.values(profiles).map((profile) => profile.wechatQrAsset?.path).filter(Boolean));
    const removedAssets = (Object.values(studio.craftsmenProfiles) as CraftsmanProfile[])
      .map((profile) => profile.wechatQrAsset)
      .filter((asset): asset is StoredImage => Boolean(asset && !nextPaths.has(asset.path)));
    await studio.saveCraftsmenProfiles(profiles);
    return deleteAssets(removedAssets, studio.deleteImage);
  }, [studio]);

  const saveCraftsmen = useCallback(async (profiles: Record<string, CraftsmanProfile>) => {
    const cleanupFailures = await persistCraftsmen(profiles);
    if (cleanupFailures > 0) {
      setToast(`成员资料已保存，但有 ${cleanupFailures} 个旧二维码清理失败，请检查媒体存储。`);
      window.setTimeout(() => setToast(null), 5000);
    }
  }, [persistCraftsmen]);

  const replaceImage = useCallback(async (file: File, context: ImageEditContext) => {
    setToast('图片上传中 0%');
    let uploadedAsset: StoredImage | undefined;
    let persisted = false;
    let cleanupFailures: number;
    try {
      if (context.type === 'master-qr') {
        const asset = await studio.uploadImage(file, { scope: 'settings', ownerId: 'studio', slot: 'wechat-qr' }, (progress) => setToast(`图片上传中 ${progress}%`));
        uploadedAsset = asset;
        cleanupFailures = await persistSettings({ ...studio.studioSettings, wechatQrUrl: asset.url, wechatQrAsset: asset });
      } else if (context.type === 'craftsman-qr' && context.craftsmanName) {
        const asset = await studio.uploadImage(file, { scope: 'craftsmen', ownerId: context.craftsmanName, slot: 'wechat-qr' }, (progress) => setToast(`图片上传中 ${progress}%`));
        uploadedAsset = asset;
        cleanupFailures = await persistCraftsmen({
          ...studio.craftsmenProfiles,
          [context.craftsmanName]: {
            ...studio.craftsmenProfiles[context.craftsmanName],
            name: context.craftsmanName,
            wechatQr: asset.url,
            wechatQrAsset: asset,
          },
        });
      } else if (context.projectId) {
        const existing = studio.projects.find((project) => project.id === context.projectId);
        if (!existing) throw new Error('找不到要更新的项目。');
        const asset = await studio.uploadImage(
          file,
          { scope: 'projects', ownerId: existing.id, slot: `${context.type}-${context.roomId ?? 'root'}-${context.imageIndex ?? 'cover'}` },
          (progress) => setToast(`图片上传中 ${progress}%`),
        );
        uploadedAsset = asset;
        const updated = structuredClone(existing);
        updated.imageAssets = [...(updated.imageAssets ?? []), asset];
        if (context.type === 'project-cover') {
          updated.coverUrl = asset.url;
        } else if (context.type === 'project-image' && context.imageIndex !== undefined) {
          if (!updated.images[context.imageIndex]) throw new Error('找不到要替换的作品图片。');
          updated.images[context.imageIndex] = asset.url;
        } else if (context.roomId) {
          const room = updated.rooms?.find((item) => item.id === context.roomId);
          if (!room) throw new Error('找不到要替换的空间图片。');
          if (context.type === 'room-cover') room.coverUrl = asset.url;
          if (context.type === 'room-image' && context.imageIndex !== undefined) room.images[context.imageIndex] = asset.url;
        }
        cleanupFailures = await persistProject(retainReferencedAssets(updated));
      } else {
        throw new Error('图片替换目标无效。');
      }
      persisted = true;
      setActiveEditContext(null);
      setToast(cleanupFailures > 0
        ? `图片已保存，但有 ${cleanupFailures} 个旧对象清理失败，请检查 Storage。`
        : '图片已上传并保存。');
    } catch (error) {
      const rollbackFailures = uploadedAsset && !persisted ? await deleteAssets([uploadedAsset], studio.deleteImage) : 0;
      const detail = error instanceof Error ? error.message : '未知错误。';
      setToast(rollbackFailures > 0
        ? `图片更新失败：${detail} 新上传对象也未能清理，请检查媒体存储。`
        : `图片更新失败：${detail}`);
      throw error;
    } finally {
      window.setTimeout(() => setToast(null), 3500);
    }
  }, [persistCraftsmen, persistProject, persistSettings, studio]);

  useEffect(() => {
    if (!isAdmin || !activeEditContext) return;
    const paste = (event: ClipboardEvent) => {
      const item = Array.from(event.clipboardData?.items ?? []).find((candidate) => candidate.type.startsWith('image/'));
      const file = item?.getAsFile();
      if (file) {
        event.preventDefault();
        void replaceImage(file, activeEditContext).catch(() => undefined);
      }
    };
    const dragOver = (event: DragEvent) => event.preventDefault();
    const drop = (event: DragEvent) => {
      const file = event.dataTransfer?.files?.[0];
      if (file) {
        event.preventDefault();
        void replaceImage(file, activeEditContext).catch(() => undefined);
      }
    };
    window.addEventListener('paste', paste);
    window.addEventListener('dragover', dragOver);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('paste', paste);
      window.removeEventListener('dragover', dragOver);
      window.removeEventListener('drop', drop);
    };
  }, [activeEditContext, isAdmin, replaceImage]);

  useEffect(() => {
    if (isAdmin) return;
    const preventImageSave = (event: MouseEvent | DragEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'IMG') {
        event.preventDefault();
        setToast('作品图片仅供浏览，请尊重创作版权。');
        window.setTimeout(() => setToast(null), 2500);
      }
    };
    document.addEventListener('contextmenu', preventImageSave);
    document.addEventListener('dragstart', preventImageSave);
    return () => {
      document.removeEventListener('contextmenu', preventImageSave);
      document.removeEventListener('dragstart', preventImageSave);
    };
  }, [isAdmin]);

  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
      <div
        className="min-h-dvh bg-studio-canvas font-sans text-studio-ink"
        data-app-state={studio.dataStatus}
        data-data-provider={studio.provider}
      >
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} pendingCommissionsCount={isAdmin ? studio.reviews.filter((review) => review.status === 'pending').length : 0} />
        <div className="min-h-dvh pb-[4.5rem] pt-14 lg:pb-0 lg:pl-28 lg:pt-0">
          <AnimatePresence mode="wait" initial={false}>
            {showInitialLoading ? (
              <motion.main key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="page-shell">
                <div className="page-inner"><StatusNotice tone="loading" title="正在读取作品档案" description={`正在连接${studio.sourceLabel}。`} /></div>
              </motion.main>
            ) : showBlockingError ? (
              <motion.main key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="page-shell">
                <div className="page-inner">
                  <StatusNotice
                    tone="error"
                    title="作品数据加载失败"
                    description={studio.dataError ?? '当前数据源无法访问。'}
                    action={<button type="button" onClick={studio.retry} className="button-secondary"><RefreshCw className="h-4 w-4" />重试</button>}
                  />
                </div>
              </motion.main>
            ) : (
              <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                {activeTab === 'gallery' && <main><GalleryView projects={publicProjects} categories={publicCategories} isAdmin={isAdmin} activeEditContext={activeEditContext} setActiveEditContext={setActiveEditContext} craftsmenProfiles={studio.craftsmenProfiles} onUpdateCraftsmenProfiles={saveCraftsmen} onUploadImage={replaceImage} dataStatus={studio.dataStatus} dataProvider={studio.provider} dataSourceLabel={studio.sourceLabel} onRetry={studio.retry} /></main>}
                {activeTab === 'wip' && <main><WIPTimeline projects={publicProjects} /></main>}
                {activeTab === 'commission' && <main><CommissionForm onAddReview={studio.submitReview} projects={publicProjects} reviews={approvedReviews} studioSettings={studio.studioSettings} /></main>}
                {activeTab === 'admin' && <main><AdminDashboard projects={studio.projects} reviews={studio.reviews} categories={studio.categories} hiddenCategories={studio.hiddenCategories} isAdmin={isAdmin} authState={authState} dataSourceLabel={studio.sourceLabel} studioSettings={studio.studioSettings} onLogin={login} onLogout={logout} onSaveProject={saveProject} onDeleteProject={deleteProject} onModerateReview={studio.moderateReview} onDeleteReview={studio.removeReview} onAddCategory={studio.addCategory} onRenameCategory={studio.renameCategory} onDeleteCategory={studio.deleteCategory} onCategoryVisibilityChange={studio.updateCategoryVisibility} onSaveSettings={saveSettings} onUploadAsset={studio.uploadImage} /></main>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {studio.dataStatus === 'stale' && studio.dataError && <StatusNotice tone="warning" compact title="数据连接异常，当前显示缓存" description={studio.dataError} action={<button type="button" onClick={studio.retry} className="button-quiet min-h-8 px-2"><RefreshCw className="h-3.5 w-3.5" />重试</button>} className="fixed left-4 right-4 top-16 z-[220] shadow-[var(--shadow-float)] md:left-1/2 md:right-auto md:w-[32rem] md:-translate-x-1/2 lg:top-4" />}
        {toast && <StatusNotice compact title={toast} className="fixed bottom-20 left-4 right-4 z-[220] shadow-[var(--shadow-float)] md:bottom-6 md:left-1/2 md:right-auto md:w-auto md:max-w-xl md:-translate-x-1/2" />}
        {isAdmin && activeEditContext && (
          <div className="fixed bottom-20 right-4 z-[180] max-w-sm rounded-[6px] border border-studio-brass/60 bg-studio-raised p-4 text-xs text-studio-muted shadow-[var(--shadow-float)] md:bottom-6 md:right-6">
            <div className="flex items-center justify-between gap-4">
              <strong className="text-studio-ink">图片替换目标已锁定</strong>
              <button type="button" onClick={() => setActiveEditContext(null)} className="button-quiet min-h-8 px-2">取消</button>
            </div>
            <p className="mt-2 leading-6">拖入图片或按 Ctrl+V 粘贴。媒体上传和项目保存全部成功后才会确认完成。</p>
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
