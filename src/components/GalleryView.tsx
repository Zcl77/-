import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Compass,
  Expand,
  ImagePlus,
  Images,
  QrCode,
  Ruler,
  Users,
  X,
} from 'lucide-react';
import { CraftsmanProfile, ImageEditContext, Project } from '../types';
import CraftsmanContactModal from './gallery/CraftsmanContactModal';
import GalleryProjectSidebar from './gallery/GalleryProjectSidebar';
import MediaLightbox from './ui/MediaLightbox';
import SmartImage from './ui/SmartImage';
import StatusNotice from './ui/StatusNotice';

interface GalleryViewProps {
  projects: Project[];
  categories: string[];
  hiddenCategories?: string[];
  isAdmin?: boolean;
  activeEditContext?: ImageEditContext | null;
  setActiveEditContext?: (context: ImageEditContext | null) => void;
  craftsmenProfiles?: Record<string, CraftsmanProfile>;
  onUpdateCraftsmenProfiles?: (profiles: Record<string, CraftsmanProfile>) => Promise<void>;
  onUploadImage?: (file: File, context: ImageEditContext) => Promise<void>;
}

interface ActiveMedia {
  key: string;
  url: string;
  alt: string;
  type: 'project-cover' | 'project-image' | 'room-image';
  imageIndex?: number;
  roomId?: string;
}

interface LightboxState {
  images: string[];
  activeIndex: number;
  alt: string;
}

function projectMedia(project: Project): ActiveMedia[] {
  return [
    {
      key: 'cover',
      url: project.coverUrl,
      alt: `${project.title} 封面`,
      type: 'project-cover' as const,
    },
    ...project.images.map((url, imageIndex) => ({
      key: `project-${imageIndex}`,
      url,
      alt: `${project.title} 作品视角 ${imageIndex + 1}`,
      type: 'project-image' as const,
      imageIndex,
    })),
  ].filter((item) => Boolean(item.url));
}

export default function GalleryView({
  projects,
  categories,
  hiddenCategories = [],
  isAdmin = false,
  activeEditContext = null,
  setActiveEditContext,
  craftsmenProfiles = {},
  onUpdateCraftsmenProfiles,
  onUploadImage,
}: GalleryViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | 'All'>('All');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeMedia, setActiveMedia] = useState<ActiveMedia | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [activeCraftsmanName, setActiveCraftsmanName] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);

  const visibleCategories = useMemo(
    () => categories.filter((category) => !hiddenCategories.includes(category)),
    [categories, hiddenCategories],
  );
  const filteredProjects = useMemo(
    () => selectedCategory === 'All'
      ? projects.filter((project) => !hiddenCategories.includes(project.category))
      : projects.filter((project) => project.category === selectedCategory),
    [hiddenCategories, projects, selectedCategory],
  );
  const media = useMemo(() => selectedProject ? projectMedia(selectedProject) : [], [selectedProject]);

  useEffect(() => {
    if (selectedCategory !== 'All' && hiddenCategories.includes(selectedCategory)) {
      setSelectedCategory('All');
    }
  }, [hiddenCategories, selectedCategory]);

  useEffect(() => {
    const current = selectedProject && filteredProjects.find((project) => project.id === selectedProject.id);
    const next = current ?? filteredProjects[0] ?? null;
    if (next?.id !== selectedProject?.id) {
      setSelectedProject(next);
      setActiveMedia(next ? projectMedia(next)[0] ?? null : null);
      setSelectedRoomId(null);
    }
  }, [filteredProjects, selectedProject]);

  const selectProject = (project: Project) => {
    setSelectedProject(project);
    setActiveMedia(projectMedia(project)[0] ?? null);
    setSelectedRoomId(null);
  };

  const getIsSelected = (type: ImageEditContext['type'], details?: { index?: number; roomId?: string; craftsmanName?: string }) => {
    if (!isAdmin || !activeEditContext || activeEditContext.type !== type) return false;
    if (type === 'craftsman-qr') return activeEditContext.craftsmanName === details?.craftsmanName;
    if (!selectedProject || activeEditContext.projectId !== selectedProject.id) return false;
    if (type === 'project-cover') return true;
    if (type === 'project-image') return activeEditContext.imageIndex === details?.index;
    if (type === 'room-cover') return activeEditContext.roomId === details?.roomId;
    if (type === 'room-image') return activeEditContext.roomId === details?.roomId && activeEditContext.imageIndex === details?.index;
    return false;
  };

  const selectEditTarget = (
    type: 'project-cover' | 'project-image' | 'room-cover' | 'room-image' | 'craftsman-qr',
    details?: { index?: number; roomId?: string; craftsmanName?: string },
  ) => {
    if (!isAdmin || !setActiveEditContext) return;
    if (getIsSelected(type, details)) {
      setActiveEditContext(null);
      return;
    }
    setActiveEditContext({
      type,
      projectId: type === 'craftsman-qr' ? undefined : selectedProject?.id,
      imageIndex: details?.index,
      roomId: details?.roomId,
      craftsmanName: details?.craftsmanName,
    });
  };

  const changeProjectImage = (direction: -1 | 1) => {
    if (media.length === 0) return;
    const currentIndex = Math.max(0, media.findIndex((item) => item.key === activeMedia?.key));
    setActiveMedia(media[(currentIndex + direction + media.length) % media.length]);
  };

  const openCurrentImage = () => {
    if (!selectedProject || !activeMedia) return;
    if (activeMedia.type === 'room-image' && activeMedia.roomId) {
      const room = selectedProject.rooms?.find((item) => item.id === activeMedia.roomId);
      if (room) {
        setLightbox({ images: room.images, activeIndex: activeMedia.imageIndex ?? 0, alt: room.name });
      }
      return;
    }
    const index = Math.max(0, media.findIndex((item) => item.key === activeMedia.key));
    setLightbox({ images: media.map((item) => item.url), activeIndex: index, alt: selectedProject.title });
  };

  const currentEditSelected = activeMedia
    ? getIsSelected(activeMedia.type, { index: activeMedia.imageIndex, roomId: activeMedia.roomId })
    : false;

  return (
    <div className="page-shell">
      <div className="page-inner">
        <header className="border-b border-studio-line pb-6 md:pb-8">
          <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
            <div>
              <span className="page-kicker">Miniature architecture archive</span>
              <h1 className="page-title mt-2">知行造境 <span className="block text-base font-normal text-studio-muted sm:inline sm:text-lg">/ Zhixing Studio</span></h1>
              <p className="page-description mt-3">以图像为主的微缩建筑与场景制作档案。当前作品均标注真实或演示状态。</p>
            </div>
            <nav className="-mx-1 flex max-w-full gap-2 overflow-x-auto px-1 pb-1" aria-label="作品分类">
              {['All', ...visibleCategories].map((category) => {
                const active = selectedCategory === category;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    aria-pressed={active}
                    className={`min-h-9 shrink-0 rounded-[4px] border px-3 text-xs transition-colors duration-200 ${active ? 'border-studio-brass bg-studio-brass text-studio-canvas' : 'border-studio-line text-studio-muted hover:border-studio-faint hover:text-studio-ink'}`}
                  >
                    {category === 'All' ? '全部作品' : category}
                  </button>
                );
              })}
            </nav>
          </div>
        </header>

        {selectedProject && activeMedia ? (
          <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8 xl:gap-12">
            <div className="min-w-0 lg:col-span-8">
              <section aria-label={`${selectedProject.title} 图片展示`}>
                <div className="group relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-[6px] border border-studio-line bg-black sm:aspect-[16/10]">
                  <button type="button" onClick={openCurrentImage} className="flex h-full w-full items-center justify-center overflow-hidden" aria-label={`放大查看 ${activeMedia.alt}`}>
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
                    <span>查看完整图</span>
                  </div>

                  {media.length > 1 && activeMedia.type !== 'room-image' && (
                    <>
                      <button type="button" onClick={() => changeProjectImage(-1)} className="icon-button absolute left-3 top-1/2 -translate-y-1/2" title="上一张" aria-label="上一张作品图片">
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button type="button" onClick={() => changeProjectImage(1)} className="icon-button absolute right-3 top-1/2 -translate-y-1/2" title="下一张" aria-label="下一张作品图片">
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </>
                  )}

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => selectEditTarget(activeMedia.type, { index: activeMedia.imageIndex, roomId: activeMedia.roomId })}
                      className={`absolute right-3 top-3 inline-flex min-h-9 items-center gap-2 rounded-[4px] border px-3 text-xs font-semibold ${currentEditSelected ? 'border-studio-warning bg-studio-warning text-studio-canvas' : 'border-studio-line bg-studio-canvas/90 text-studio-ink hover:border-studio-faint'}`}
                    >
                      <ImagePlus className="h-4 w-4" />
                      {currentEditSelected ? '已锁定替换目标' : '替换当前图片'}
                    </button>
                  )}
                </div>

                <div className="mt-3 flex gap-2 overflow-x-auto pb-2" aria-label="作品图片缩略图">
                  {media.map((item, index) => {
                    const active = activeMedia.key === item.key && activeMedia.type !== 'room-image';
                    const editSelected = getIsSelected(item.type, { index: item.imageIndex });
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setActiveMedia(item)}
                        aria-pressed={active}
                        className={`group relative aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-[4px] border bg-studio-surface sm:w-28 ${active ? 'border-studio-brass' : 'border-studio-line opacity-70 hover:opacity-100'} ${editSelected ? 'ring-2 ring-studio-warning' : ''}`}
                      >
                        <SmartImage src={item.url} alt={`${selectedProject.title} ${index === 0 ? '封面缩略图' : `视角 ${index} 缩略图`}`} className="media-hover h-full w-full object-cover" referrerPolicy="no-referrer" loading="lazy" decoding="async" />
                        <span className="absolute bottom-1 right-1 rounded-[2px] bg-studio-canvas/90 px-1.5 py-0.5 text-[9px] text-studio-muted">
                          {index === 0 ? '封面' : String(index).padStart(2, '0')}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5 border-y border-studio-line py-5 lg:hidden">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="page-kicker">Selected work</span>
                      <h2 className="mt-2 text-balance font-serif text-xl font-semibold leading-snug text-studio-ink">{selectedProject.title}</h2>
                    </div>
                    <span className={`tag shrink-0 ${selectedProject.status === 'WIP' ? 'border-studio-warning/50 text-studio-warning' : 'border-studio-success/50 text-studio-success'}`}>
                      {selectedProject.status === 'WIP' ? '制作中' : selectedProject.status === 'Completed' ? '已完成' : '已售出'}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-studio-muted">
                    <span>{selectedProject.category}</span><span aria-hidden="true">/</span><span>{selectedProject.scale}</span>
                    {selectedProject.isDemo && <span className="tag border-studio-warning/40 text-studio-warning">演示内容</span>}
                  </div>
                  <div className="mt-4 grid grid-cols-2 border-y border-studio-line py-3 text-xs">
                    <span className="border-r border-studio-line pr-3 text-studio-muted">制作耗时 <strong className="ml-1 text-studio-ink">{selectedProject.timeSpent} 小时</strong></span>
                    <span className="pl-3 text-studio-muted">完成比例 <strong className="ml-1 text-studio-ink">{selectedProject.completionPercent}%</strong></span>
                  </div>
                </div>
              </section>

              <section className="mt-12 border-t border-studio-line pt-8" aria-labelledby="project-narrative">
                <span className="page-kicker">Project narrative</span>
                <h2 id="project-narrative" className="section-heading mt-2">背景与工艺说明</h2>
                <p className="mt-5 max-w-[44rem] text-sm leading-8 text-studio-muted md:text-[15px]">{selectedProject.description}</p>
              </section>

              {(selectedProject.dimensions || selectedProject.materials || selectedProject.period || selectedProject.inspiration) && (
                <section className="mt-12 border-t border-studio-line pt-8" aria-labelledby="project-specifications">
                  <span className="page-kicker">Specifications</span>
                  <h2 id="project-specifications" className="section-heading mt-2">作品规格</h2>
                  <dl className="mt-6 grid grid-cols-1 border-t border-studio-line sm:grid-cols-2">
                    {selectedProject.dimensions && <Spec icon={Ruler} label="空间体量" value={selectedProject.dimensions} />}
                    {selectedProject.period && <Spec icon={CalendarDays} label="制作周期" value={selectedProject.period} />}
                    {selectedProject.inspiration && <Spec icon={Compass} label="灵感来源" value={selectedProject.inspiration} />}
                    {selectedProject.materials && <Spec icon={Box} label="主要材料" value={selectedProject.materials} />}
                  </dl>

                  {selectedProject.authors && selectedProject.authors.length > 0 && (
                    <div className="mt-8 border-t border-studio-line pt-6">
                      <div className="flex items-center gap-2 text-xs font-semibold text-studio-ink"><Users className="h-4 w-4 text-studio-brass" />参与成员</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedProject.authors.map((author) => (
                          <button key={author} type="button" onClick={() => setActiveCraftsmanName(author)} className="tag hover:border-studio-brass hover:text-studio-ink" title={`查看 ${author} 的联系信息`}>
                            {author}<QrCode className="h-3 w-3" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )}

              {selectedProject.rooms && selectedProject.rooms.length > 0 && (
                <section className="mt-12 border-t border-studio-line pt-8" aria-labelledby="room-details">
                  <span className="page-kicker">Spatial details</span>
                  <div className="mt-2 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                    <h2 id="room-details" className="section-heading">房间与细部</h2>
                    <p className="max-w-lg text-xs leading-6 text-studio-muted">选择空间查看说明；必要信息始终可见，触屏设备无需依赖悬浮。</p>
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {selectedProject.rooms.map((room) => {
                      const active = selectedRoomId === room.id;
                      const editSelected = getIsSelected('room-cover', { roomId: room.id });
                      return (
                        <article key={room.id} className={`group relative overflow-hidden rounded-[6px] border bg-studio-surface ${active ? 'border-studio-brass' : 'border-studio-line'}`}>
                          <button type="button" onClick={() => setSelectedRoomId(active ? null : room.id)} className="block w-full text-left" aria-expanded={active}>
                            <span className="block aspect-[4/3] overflow-hidden bg-black">
                              <SmartImage src={room.coverUrl} alt={`${room.name} 空间图`} showFallbackText className="media-hover h-full w-full object-cover" referrerPolicy="no-referrer" loading="lazy" decoding="async" />
                            </span>
                            <span className="flex items-center justify-between gap-3 p-4">
                              <span>
                                <strong className="block font-serif text-base font-semibold text-studio-ink">{room.name}</strong>
                                <span className="mt-1 block text-xs text-studio-muted">{room.images.length} 张细节图</span>
                              </span>
                              <span className="text-xs text-studio-brass">{active ? '收起' : '查看细节'}</span>
                            </span>
                          </button>
                          {isAdmin && (
                            <button type="button" onClick={() => selectEditTarget('room-cover', { roomId: room.id })} className={`icon-button absolute right-3 top-3 ${editSelected ? 'border-studio-warning bg-studio-warning text-studio-canvas' : ''}`} title="替换房间封面" aria-label={`替换 ${room.name} 封面`}>
                              <ImagePlus className="h-4 w-4" />
                            </button>
                          )}
                        </article>
                      );
                    })}
                  </div>

                  {selectedRoomId && (() => {
                    const room = selectedProject.rooms?.find((item) => item.id === selectedRoomId);
                    if (!room) return null;
                    return (
                      <div className="mt-6 border-y border-studio-line py-7">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <span className="page-kicker">Selected room</span>
                            <h3 className="section-heading mt-2">{room.name}</h3>
                          </div>
                          <button type="button" onClick={() => setSelectedRoomId(null)} className="icon-button" title="收起房间详情" aria-label="收起房间详情"><X className="h-4 w-4" /></button>
                        </div>

                        <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-12">
                          <div className="md:col-span-7">
                            <p className="text-sm leading-8 text-studio-muted">{room.description}</p>
                            {room.detailsList && room.detailsList.length > 0 && (
                              <ul className="mt-6 space-y-3 border-t border-studio-line pt-5">
                                {room.detailsList.map((detail) => (
                                  <li key={detail} className="flex items-start gap-3 text-xs leading-6 text-studio-muted">
                                    <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-studio-oxide" />
                                    <span>{detail}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <div className="md:col-span-5">
                            <p className="section-title">细节图片</p>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              {room.images.map((image, imageIndex) => {
                                const item: ActiveMedia = {
                                  key: `room-${room.id}-${imageIndex}`,
                                  url: image,
                                  alt: `${room.name} 细节 ${imageIndex + 1}`,
                                  type: 'room-image',
                                  roomId: room.id,
                                  imageIndex,
                                };
                                const active = activeMedia.key === item.key;
                                const editSelected = getIsSelected('room-image', { roomId: room.id, index: imageIndex });
                                return (
                                  <div key={item.key} className="group relative">
                                    <button type="button" onClick={() => setActiveMedia(item)} className={`aspect-[4/3] w-full overflow-hidden rounded-[4px] border bg-black ${active ? 'border-studio-brass' : 'border-studio-line'} ${editSelected ? 'ring-2 ring-studio-warning' : ''}`} aria-label={`在主视图查看 ${item.alt}`}>
                                      <SmartImage src={image} alt={item.alt} className="media-hover h-full w-full object-cover" referrerPolicy="no-referrer" loading="lazy" decoding="async" />
                                    </button>
                                    {isAdmin && (
                                      <button type="button" onClick={() => selectEditTarget('room-image', { roomId: room.id, index: imageIndex })} className={`icon-button absolute right-1.5 top-1.5 h-8 min-h-8 w-8 ${editSelected ? 'border-studio-warning bg-studio-warning text-studio-canvas' : ''}`} title="替换房间细节图片" aria-label={`替换 ${item.alt}`}>
                                        <ImagePlus className="h-3.5 w-3.5" />
                                      </button>
                                    )}
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

            <GalleryProjectSidebar selectedProject={selectedProject} projects={filteredProjects} selectedCategory={selectedCategory} onSelectProject={selectProject} />
          </div>
        ) : (
          <StatusNotice
            tone="empty"
            title="当前分类暂无可公开展示的作品"
            description="隐藏分类和隐藏作品不会出现在访客页面。可以返回全部作品继续浏览。"
            className="mt-8"
            action={<button type="button" onClick={() => setSelectedCategory('All')} className="button-secondary"><Images className="h-4 w-4" />查看全部作品</button>}
          />
        )}

        <footer className="mt-14 flex flex-col justify-between gap-2 border-t border-studio-line py-6 text-[10px] text-studio-faint sm:flex-row">
          <span>知行造境 / Zhixing Studio</span>
          <span>微缩建筑与场景制作</span>
        </footer>
      </div>

      {activeCraftsmanName && (
        <CraftsmanContactModal
          name={activeCraftsmanName}
          profile={craftsmenProfiles[activeCraftsmanName]}
          profiles={craftsmenProfiles}
          isAdmin={isAdmin}
          isSelectedForEdit={getIsSelected('craftsman-qr', { craftsmanName: activeCraftsmanName })}
          onClose={() => setActiveCraftsmanName(null)}
          onSelectForEdit={() => selectEditTarget('craftsman-qr', { craftsmanName: activeCraftsmanName })}
          onUpdateProfiles={onUpdateCraftsmenProfiles}
          onUploadImage={onUploadImage}
        />
      )}

      {lightbox && (
        <MediaLightbox
          images={lightbox.images}
          activeIndex={lightbox.activeIndex}
          alt={lightbox.alt}
          onIndexChange={(activeIndex) => setLightbox((current) => current ? { ...current, activeIndex } : null)}
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
