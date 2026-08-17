import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Compass,
  Expand,
  Images,
  Ruler,
  Users,
  X,
} from 'lucide-react';
import {
  GalleryMediaSelection,
  filterProjectsByCategory,
  listProjectMedia,
  mediaSelection,
  resolveGalleryMedia,
  resolveSelectedProject,
} from '../domain/gallerySelection';
import { Project, PublicCategory } from '../types';
import GalleryProjectSidebar from './gallery/GalleryProjectSidebar';
import MediaLightbox from './ui/MediaLightbox';
import SmartImage from './ui/SmartImage';
import StatusNotice from './ui/StatusNotice';
import { useI18n } from '../i18n';

interface GalleryViewProps {
  projects: Project[];
  categories: PublicCategory[];
  selectedProjectSlug?: string | null;
  onProjectChange?: (project: Project) => void;
  onCategoryChange?: () => void;
  onAddToCart: (project: Project) => void;
}

interface LightboxState {
  source: 'project' | 'room';
  roomId?: string;
  activeIndex: number;
  alt: string;
}

export default function GalleryView({
  projects,
  categories,
  selectedProjectSlug = null,
  onProjectChange,
  onCategoryChange,
  onAddToCart,
}: GalleryViewProps) {
  const { locale, t } = useI18n();
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [activeMediaSelection, setActiveMediaSelection] = useState<GalleryMediaSelection | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);

  const filteredProjects = useMemo(
    () => filterProjectsByCategory(projects, selectedCategorySlug),
    [projects, selectedCategorySlug],
  );
  const selectedCategoryName =
    categories.find((category) => category.slug === selectedCategorySlug)?.name ?? null;
  const selectedProject = useMemo(
    () =>
      resolveSelectedProject(
        filteredProjects,
        filteredProjects.find((project) => project.slug === selectedProjectSlug)?.id ?? selectedProjectId,
      ),
    [filteredProjects, selectedProjectId, selectedProjectSlug],
  );
  const media = useMemo(() => listProjectMedia(selectedProject, locale), [locale, selectedProject]);
  const effectiveMediaSelection = selectedProject?.id === selectedProjectId ? activeMediaSelection : null;
  const activeMedia = useMemo(
    () => resolveGalleryMedia(selectedProject, effectiveMediaSelection, locale),
    [effectiveMediaSelection, locale, selectedProject],
  );
  const lightboxImages = useMemo(() => {
    if (!lightbox || !selectedProject) return [];
    if (lightbox.source === 'project')
      return listProjectMedia(selectedProject, locale).map((item) => item.url);
    return selectedProject.rooms?.find((room) => room.id === lightbox.roomId)?.images ?? [];
  }, [lightbox, locale, selectedProject]);
  const lightboxAlt = useMemo(() => {
    if (!lightbox || !selectedProject) return '';
    if (lightbox.source === 'project') return selectedProject.title;
    return selectedProject.rooms?.find((room) => room.id === lightbox.roomId)?.name || t('空间细节');
  }, [lightbox, selectedProject, t]);

  useEffect(() => {
    if (selectedProject?.id !== selectedProjectId) {
      setSelectedProjectId(selectedProject?.id ?? null);
      setActiveMediaSelection(null);
      setSelectedRoomId(null);
      setLightbox(null);
    }
  }, [selectedProject?.id, selectedProjectId]);

  useEffect(() => {
    if (selectedRoomId && !selectedProject?.rooms?.some((room) => room.id === selectedRoomId)) {
      setSelectedRoomId(null);
    }
    if (lightbox?.source === 'room' && !selectedProject?.rooms?.some((room) => room.id === lightbox.roomId)) {
      setLightbox(null);
    }
  }, [lightbox?.roomId, lightbox?.source, selectedProject, selectedRoomId]);

  useEffect(() => {
    if (lightbox && lightboxImages.length === 0) {
      setLightbox(null);
    }
  }, [lightbox, lightboxImages.length]);

  const selectProject = (project: Project) => {
    setSelectedProjectId(project.id);
    setActiveMediaSelection(null);
    setSelectedRoomId(null);
    onProjectChange?.(project);
  };

  const changeProjectImage = (direction: -1 | 1) => {
    if (media.length === 0) return;
    const currentIndex = Math.max(
      0,
      media.findIndex((item) => item.key === activeMedia?.key),
    );
    setActiveMediaSelection(mediaSelection(media[(currentIndex + direction + media.length) % media.length]));
  };

  const openCurrentImage = () => {
    if (!selectedProject || !activeMedia) return;
    if (activeMedia.type === 'room-image' && activeMedia.roomId) {
      const room = selectedProject.rooms?.find((item) => item.id === activeMedia.roomId);
      if (room) {
        setLightbox({
          source: 'room',
          roomId: room.id,
          activeIndex: activeMedia.imageIndex ?? 0,
          alt: room.name,
        });
      }
      return;
    }
    const index = Math.max(
      0,
      media.findIndex((item) => item.key === activeMedia.key),
    );
    setLightbox({ source: 'project', activeIndex: index, alt: selectedProject.title });
  };

  return (
    <div className="page-shell">
      <div className="page-inner">
        <header className="border-b border-studio-line pb-6 md:pb-8">
          <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
            <div>
              <span className="page-kicker">{t('微缩建筑作品档案')}</span>
              <h1 className="page-title mt-2">
                {t('知行造境')}
                {locale === 'zh-CN' && (
                  <span className="block text-base font-normal text-studio-muted sm:inline sm:text-lg">
                    {' '}
                    / Zhixing Studio
                  </span>
                )}
              </h1>
              <p className="page-description mt-3">
                {t('以图像为主的微缩建筑与场景制作档案。当前作品均标注真实或演示状态。')}
              </p>
            </div>
            <nav className="-mx-1 flex max-w-full gap-2 overflow-x-auto px-1 pb-1" aria-label={t('作品分类')}>
              {[{ slug: null, name: t('全部作品') }, ...categories].map((category) => {
                const active = selectedCategorySlug === category.slug;
                return (
                  <button
                    key={category.slug ?? 'all'}
                    type="button"
                    onClick={() => {
                      setSelectedCategorySlug(category.slug);
                      onCategoryChange?.();
                    }}
                    aria-pressed={active}
                    className={`min-h-9 shrink-0 rounded-[4px] border px-3 text-xs transition-colors duration-200 ${active ? 'border-studio-brass bg-studio-brass text-studio-canvas' : 'border-studio-line text-studio-muted hover:border-studio-faint hover:text-studio-ink'}`}
                  >
                    {category.name}
                  </button>
                );
              })}
            </nav>
          </div>
        </header>

        {selectedProject && activeMedia ? (
          <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8 xl:gap-12">
            <div className="min-w-0 lg:col-span-8">
              <section aria-label={t('{name} 图片展示', { name: selectedProject.title })}>
                <div className="group relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-[6px] border border-studio-line bg-black sm:aspect-[16/10]">
                  <button
                    type="button"
                    onClick={openCurrentImage}
                    className="flex h-full w-full items-center justify-center overflow-hidden"
                    aria-label={t('放大查看 {name}', { name: activeMedia.alt })}
                  >
                    <SmartImage
                      src={activeMedia.url}
                      alt={activeMedia.alt}
                      showFallbackText
                      className="media-hover h-full w-full object-contain"
                      referrerPolicy="no-referrer"
                      decoding="async"
                      fetchPriority="high"
                    />
                  </button>

                  <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-[4px] bg-studio-canvas/90 px-2.5 py-1.5 text-[10px] text-studio-muted">
                    <Expand className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{t('查看完整图')}</span>
                  </div>

                  {media.length > 1 && activeMedia.type !== 'room-image' && (
                    <>
                      <button
                        type="button"
                        onClick={() => changeProjectImage(-1)}
                        className="icon-button absolute left-3 top-1/2 -translate-y-1/2"
                        title={t('上一张')}
                        aria-label={t('上一张作品图片')}
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => changeProjectImage(1)}
                        className="icon-button absolute right-3 top-1/2 -translate-y-1/2"
                        title={t('下一张')}
                        aria-label={t('下一张作品图片')}
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </>
                  )}
                </div>

                <div className="mt-3 flex gap-2 overflow-x-auto pb-2" aria-label={t('作品图片缩略图')}>
                  {media.map((item, index) => {
                    const active = activeMedia.key === item.key && activeMedia.type !== 'room-image';
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setActiveMediaSelection(mediaSelection(item))}
                        aria-pressed={active}
                        className={`group relative aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-[4px] border bg-studio-surface sm:w-28 ${active ? 'border-studio-brass' : 'border-studio-line opacity-70 hover:opacity-100'}`}
                      >
                        <SmartImage
                          src={item.url}
                          alt={`${selectedProject.title} ${t(index === 0 ? '封面缩略图' : '视角 {index} 缩略图', { index })}`}
                          className="media-hover h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          decoding="async"
                        />
                        <span className="absolute bottom-1 right-1 rounded-[2px] bg-studio-canvas/90 px-1.5 py-0.5 text-[9px] text-studio-muted">
                          {index === 0 ? t('封面') : String(index).padStart(2, '0')}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5 border-y border-studio-line py-5 lg:hidden">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="page-kicker">{t('当前作品')}</span>
                      <h2 className="mt-2 text-balance font-serif text-xl font-semibold leading-snug text-studio-ink">
                        {selectedProject.title}
                      </h2>
                    </div>
                    <span
                      className={`tag shrink-0 ${selectedProject.status === 'WIP' ? 'border-studio-warning/50 text-studio-warning' : 'border-studio-success/50 text-studio-success'}`}
                    >
                      {selectedProject.status === 'WIP'
                        ? t('制作中')
                        : selectedProject.status === 'Completed'
                          ? t('已完成')
                          : t('已售出')}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-studio-muted">
                    <span>{selectedProject.category}</span>
                    <span aria-hidden="true">/</span>
                    <span>{selectedProject.scale}</span>
                    {selectedProject.isDemo && (
                      <span className="tag border-studio-warning/40 text-studio-warning">
                        {t('演示内容')}
                      </span>
                    )}
                  </div>
                  <div
                    className={`mt-4 grid ${selectedProject.timeSpent === undefined ? 'grid-cols-1' : 'grid-cols-2'} border-y border-studio-line py-3 text-xs`}
                  >
                    {selectedProject.timeSpent !== undefined && (
                      <span className="border-r border-studio-line pr-3 text-studio-muted">
                        {t('制作耗时')}{' '}
                        <strong className="ml-1 text-studio-ink">
                          {selectedProject.timeSpent} {t('小时')}
                        </strong>
                      </span>
                    )}
                    <span
                      className={`${selectedProject.timeSpent === undefined ? '' : 'pl-3'} text-studio-muted`}
                    >
                      {t('完成比例')}{' '}
                      <strong className="ml-1 text-studio-ink">{selectedProject.completionPercent}%</strong>
                    </span>
                  </div>
                </div>
              </section>

              <section className="mt-12 border-t border-studio-line pt-8" aria-labelledby="project-narrative">
                <span className="page-kicker">{t('作品说明')}</span>
                <h2 id="project-narrative" className="section-heading mt-2">
                  {t('背景与工艺说明')}
                </h2>
                <p className="mt-5 max-w-[44rem] text-sm leading-8 text-studio-muted md:text-[15px]">
                  {selectedProject.description}
                </p>
              </section>

              {(selectedProject.dimensions ||
                selectedProject.materials ||
                selectedProject.period ||
                selectedProject.inspiration) && (
                <section
                  className="mt-12 border-t border-studio-line pt-8"
                  aria-labelledby="project-specifications"
                >
                  <span className="page-kicker">{t('作品规格')}</span>
                  <h2 id="project-specifications" className="section-heading mt-2">
                    {t('作品规格')}
                  </h2>
                  <dl className="mt-6 grid grid-cols-1 border-t border-studio-line sm:grid-cols-2">
                    {selectedProject.dimensions && (
                      <Spec icon={Ruler} label={t('空间体量')} value={selectedProject.dimensions} />
                    )}
                    {selectedProject.period && (
                      <Spec icon={CalendarDays} label={t('制作周期')} value={selectedProject.period} />
                    )}
                    {selectedProject.inspiration && (
                      <Spec icon={Compass} label={t('灵感来源')} value={selectedProject.inspiration} />
                    )}
                    {selectedProject.materials && (
                      <Spec icon={Box} label={t('主要材料')} value={selectedProject.materials} />
                    )}
                  </dl>

                  {selectedProject.authors && selectedProject.authors.length > 0 && (
                    <div className="mt-8 border-t border-studio-line pt-6">
                      <div className="flex items-center gap-2 text-xs font-semibold text-studio-ink">
                        <Users className="h-4 w-4 text-studio-brass" />
                        {t('参与成员')}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedProject.authors.map((author) => (
                          <span key={author} className="tag">
                            {author}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )}

              {selectedProject.rooms && selectedProject.rooms.length > 0 && (
                <section className="mt-12 border-t border-studio-line pt-8" aria-labelledby="room-details">
                  <span className="page-kicker">{t('空间细节')}</span>
                  <div className="mt-2 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                    <h2 id="room-details" className="section-heading">
                      {t('房间与细部')}
                    </h2>
                    <p className="max-w-lg text-xs leading-6 text-studio-muted">
                      {t('选择空间查看说明；必要信息始终可见，触屏设备无需依赖悬浮。')}
                    </p>
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {selectedProject.rooms.map((room) => {
                      const active = selectedRoomId === room.id;
                      const roomName = room.name || t('空间细节');
                      return (
                        <article
                          key={room.id}
                          className={`group relative overflow-hidden rounded-[6px] border bg-studio-surface ${active ? 'border-studio-brass' : 'border-studio-line'}`}
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedRoomId(active ? null : room.id)}
                            className="block w-full text-left"
                            aria-expanded={active}
                          >
                            <span className="block aspect-[4/3] overflow-hidden bg-black">
                              <SmartImage
                                src={room.coverUrl}
                                alt={t('{name} 空间图', { name: roomName })}
                                showFallbackText
                                className="media-hover h-full w-full object-cover"
                                referrerPolicy="no-referrer"
                                loading="lazy"
                                decoding="async"
                              />
                            </span>
                            <span className="flex items-center justify-between gap-3 p-4">
                              <span>
                                <strong className="block font-serif text-base font-semibold text-studio-ink">
                                  {roomName}
                                </strong>
                                <span className="mt-1 block text-xs text-studio-muted">
                                  {t('{count} 张细节图', { count: room.images.length })}
                                </span>
                              </span>
                              <span className="text-xs text-studio-brass">
                                {t(active ? '收起' : '查看细节')}
                              </span>
                            </span>
                          </button>
                        </article>
                      );
                    })}
                  </div>

                  {selectedRoomId &&
                    (() => {
                      const room = selectedProject.rooms?.find((item) => item.id === selectedRoomId);
                      if (!room) return null;
                      const roomName = room.name || t('空间细节');
                      return (
                        <div className="mt-6 border-y border-studio-line py-7">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <span className="page-kicker">{t('当前空间')}</span>
                              <h3 className="section-heading mt-2">{roomName}</h3>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedRoomId(null)}
                              className="icon-button"
                              title={t('收起房间详情')}
                              aria-label={t('收起房间详情')}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-12">
                            <div className="md:col-span-7">
                              <p className="text-sm leading-8 text-studio-muted">{room.description}</p>
                              {room.detailsList && room.detailsList.length > 0 && (
                                <ul className="mt-6 space-y-3 border-t border-studio-line pt-5">
                                  {room.detailsList.map((detail) => (
                                    <li
                                      key={detail}
                                      className="flex items-start gap-3 text-xs leading-6 text-studio-muted"
                                    >
                                      <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-studio-oxide" />
                                      <span>{detail}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                            <div className="md:col-span-5">
                              <p className="section-title">{t('细节图片')}</p>
                              <div className="mt-3 grid grid-cols-2 gap-2">
                                {room.images.map((image, imageIndex) => {
                                  const item = {
                                    key: `room-${room.id}-${imageIndex}`,
                                    url: image,
                                    alt: t('{name} 细节 {index}', { name: roomName, index: imageIndex + 1 }),
                                    type: 'room-image' as const,
                                    roomId: room.id,
                                    imageIndex,
                                  };
                                  const active = activeMedia.key === item.key;
                                  return (
                                    <div key={item.key} className="group relative">
                                      <button
                                        type="button"
                                        onClick={() => setActiveMediaSelection(mediaSelection(item))}
                                        className={`aspect-[4/3] w-full overflow-hidden rounded-[4px] border bg-black ${active ? 'border-studio-brass' : 'border-studio-line'}`}
                                        aria-label={t('在主视图查看 {name}', { name: item.alt })}
                                      >
                                        <SmartImage
                                          src={image}
                                          alt={item.alt}
                                          className="media-hover h-full w-full object-cover"
                                          referrerPolicy="no-referrer"
                                          loading="lazy"
                                          decoding="async"
                                        />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                </section>
              )}
            </div>

            <GalleryProjectSidebar
              selectedProject={selectedProject}
              projects={filteredProjects}
              selectedCategory={selectedCategoryName}
              onSelectProject={selectProject}
              onAddToCart={onAddToCart}
            />
          </div>
        ) : (
          <StatusNotice
            tone="empty"
            title={t('当前分类暂无可公开展示的作品')}
            description={t('隐藏分类和隐藏作品不会出现在访客页面。可以返回全部作品继续浏览。')}
            className="mt-8"
            action={
              <button
                type="button"
                onClick={() => setSelectedCategorySlug(null)}
                className="button-secondary"
              >
                <Images className="h-4 w-4" />
                {t('查看全部作品')}
              </button>
            }
          />
        )}

        <footer className="mt-14 flex flex-col justify-between gap-2 border-t border-studio-line py-6 text-[10px] text-studio-faint sm:flex-row">
          <span>{locale === 'zh-CN' ? '知行造境 / Zhixing Studio' : 'Zhixing Studio'}</span>
          <span>{t('微缩建筑与场景制作')}</span>
        </footer>
      </div>

      {lightbox && lightboxImages.length > 0 && (
        <MediaLightbox
          images={lightboxImages}
          activeIndex={lightbox.activeIndex}
          alt={lightboxAlt}
          onIndexChange={(activeIndex) =>
            setLightbox((current) => (current ? { ...current, activeIndex } : null))
          }
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}

function Spec({ icon: Icon, label, value }: { icon: typeof Ruler; label: string; value: string }) {
  return (
    <div className="flex min-w-0 gap-3 border-b border-studio-line py-5 sm:pr-6 sm:odd:border-r sm:even:pl-6">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-studio-oxide" aria-hidden="true" />
      <div className="min-w-0">
        <dt className="text-[10px] font-semibold uppercase text-studio-faint">{label}</dt>
        <dd className="mt-1 break-words text-sm leading-6 text-studio-ink">{value}</dd>
      </div>
    </div>
  );
}
