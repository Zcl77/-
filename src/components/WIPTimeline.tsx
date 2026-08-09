import { useEffect, useMemo, useState } from 'react';
import { Check, Clock3, Image as ImageIcon, TimerReset } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Project } from '../types';
import MediaLightbox from './ui/MediaLightbox';
import StatusNotice from './ui/StatusNotice';
import SmartImage from './ui/SmartImage';

interface WIPTimelineProps {
  projects: Project[];
}

interface LightboxState {
  images: string[];
  activeIndex: number;
  alt: string;
}

const STATUS_LABELS: Record<Project['status'], string> = {
  WIP: '制作中',
  Completed: '已完成',
  Sold: '已售出',
};

const STEP_LABELS: Record<Project['worksteps'][number]['status'], string> = {
  DONE: '已完成',
  ACTIVE: '进行中',
  NEXT: '待开始',
};

export default function WIPTimeline({ projects }: WIPTimelineProps) {
  const sortedProjects = useMemo(() => [...projects].sort((a, b) => {
    if (a.status === 'WIP' && b.status !== 'WIP') return -1;
    if (a.status !== 'WIP' && b.status === 'WIP') return 1;
    return b.timeSpent - a.timeSpent;
  }), [projects]);
  const [selectedProjectId, setSelectedProjectId] = useState(sortedProjects[0]?.id ?? '');
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);
  const selectedProject = sortedProjects.find((project) => project.id === selectedProjectId);

  useEffect(() => {
    if (!sortedProjects.some((project) => project.id === selectedProjectId)) {
      setSelectedProjectId(sortedProjects[0]?.id ?? '');
    }
  }, [selectedProjectId, sortedProjects]);

  return (
    <div className="page-shell">
      <div className="page-inner">
        <header className="border-b border-studio-line pb-6 md:pb-8">
          <span className="page-kicker">Public making journal</span>
          <h1 className="page-title mt-2">公开制作日志</h1>
          <p className="page-description mt-3">记录公开作品从结构、装配到表面处理的工艺节点与过程图片。本页不是客户专属交付进度，私有项目将在后续独立入口中提供。</p>
        </header>

        {selectedProject ? (
          <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8 xl:gap-12">
            <aside className="order-2 lg:order-1 lg:col-span-4" aria-labelledby="progress-project-index">
              <div className="lg:sticky lg:top-8">
                <div className="flex items-center justify-between gap-3">
                  <h2 id="progress-project-index" className="section-title">项目索引</h2>
                  <span className="text-[10px] text-studio-faint">{sortedProjects.length} 件</span>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
                  {sortedProjects.map((project) => {
                    const active = project.id === selectedProjectId;
                    return (
                      <button
                        key={project.id}
                        type="button"
                        onClick={() => setSelectedProjectId(project.id)}
                        aria-pressed={active}
                        className={`group rounded-[6px] border p-3 text-left transition-colors duration-200 ${active ? 'border-studio-brass bg-studio-raised' : 'border-studio-line bg-studio-surface hover:border-studio-faint'}`}
                      >
                        <span className="flex items-start gap-3">
                          <span className="aspect-[4/3] w-20 shrink-0 overflow-hidden rounded-[2px] bg-black">
                            <SmartImage src={project.coverUrl} alt={`${project.title} 封面缩略图`} className="media-hover h-full w-full object-cover" referrerPolicy="no-referrer" loading="lazy" decoding="async" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-start justify-between gap-2">
                              <strong className="min-w-0 font-serif text-sm font-semibold leading-5 text-studio-ink">{project.title}</strong>
                              <span className={`shrink-0 text-[9px] ${project.status === 'WIP' ? 'text-studio-warning' : 'text-studio-success'}`}>{STATUS_LABELS[project.status]}</span>
                            </span>
                            <span className="mt-1 block text-[10px] text-studio-muted">{project.scale} · {project.category}</span>
                          </span>
                        </span>
                        <span className="mt-3 flex items-center gap-3">
                          <span className="h-1 flex-1 overflow-hidden rounded-full bg-studio-line">
                            <span className="block h-full bg-studio-oxide" style={{ width: `${Math.min(100, Math.max(0, project.completionPercent))}%` }} />
                          </span>
                          <span className="text-[10px] text-studio-muted">{project.completionPercent}%</span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 border-t border-studio-line pt-5 text-xs leading-6 text-studio-muted">
                  <p className="flex items-center gap-2 font-semibold text-studio-ink"><TimerReset className="h-4 w-4 text-studio-oxide" />记录说明</p>
                  <p className="mt-2">本页展示完成比例、制作节点和过程图片；没有记录的项目不会被包装成虚构进度。</p>
                </div>
              </div>
            </aside>

            <div className="order-1 min-w-0 lg:order-2 lg:col-span-8">
              <AnimatePresence mode="wait" initial={false}>
                <motion.section
                  key={selectedProject.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  aria-labelledby="progress-project-title"
                >
                  <button
                    type="button"
                    onClick={() => setLightbox({ images: [selectedProject.coverUrl], activeIndex: 0, alt: selectedProject.title })}
                    className="group flex aspect-[16/9] w-full items-center justify-center overflow-hidden rounded-[6px] border border-studio-line bg-black"
                    aria-label={`放大查看 ${selectedProject.title} 封面`}
                  >
                    <SmartImage src={selectedProject.coverUrl} alt={`${selectedProject.title} 封面`} showFallbackText className="media-hover h-full w-full object-contain" referrerPolicy="no-referrer" decoding="async" fetchPriority="high" />
                  </button>

                  <div className="mt-6 flex flex-col justify-between gap-5 border-b border-studio-line pb-6 sm:flex-row sm:items-start">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`tag ${selectedProject.status === 'WIP' ? 'border-studio-warning/50 text-studio-warning' : 'border-studio-success/50 text-studio-success'}`}>{STATUS_LABELS[selectedProject.status]}</span>
                        {selectedProject.isDemo && <span className="tag border-studio-warning/40 text-studio-warning">演示内容</span>}
                      </div>
                      <h2 id="progress-project-title" className="mt-3 font-serif text-2xl font-semibold leading-snug text-studio-ink md:text-3xl">{selectedProject.title}</h2>
                      <p className="mt-3 max-w-[44rem] text-sm leading-7 text-studio-muted">{selectedProject.description}</p>
                    </div>
                    <div className="shrink-0 border-l border-studio-line pl-4">
                      <span className="flex items-center gap-2 text-[10px] uppercase text-studio-faint"><Clock3 className="h-3.5 w-3.5" />累计工时</span>
                      <strong className="mt-2 block font-serif text-2xl font-semibold text-studio-ink">{selectedProject.timeSpent}<span className="ml-1 text-xs font-normal text-studio-muted">小时</span></strong>
                    </div>
                  </div>

                  <div className="mt-6" aria-label={`项目已完成 ${selectedProject.completionPercent}%`}>
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="text-studio-muted">项目总进度</span>
                      <strong className="text-studio-ink">{selectedProject.completionPercent}%</strong>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-studio-line">
                      <div className="h-full bg-studio-brass" style={{ width: `${Math.min(100, Math.max(0, selectedProject.completionPercent))}%` }} />
                    </div>
                  </div>

                  <div className="mt-10" aria-label="制作时间线">
                    <div className="flex items-center justify-between gap-3 border-b border-studio-line pb-3">
                      <h3 className="section-heading">制作节点</h3>
                      <span className="text-[10px] text-studio-faint">{selectedProject.worksteps.length} 个记录</span>
                    </div>

                    {selectedProject.worksteps.length > 0 ? (
                      <ol>
                        {selectedProject.worksteps.map((step, stepIndex) => {
                          const images = [step.image, ...(step.images ?? [])].filter((url, index, values): url is string => Boolean(url) && values.indexOf(url) === index);
                          return (
                            <li key={step.id} className="grid grid-cols-[2.5rem_1fr] border-b border-studio-line py-7 sm:grid-cols-[3.5rem_1fr]">
                              <div className="relative pt-0.5">
                                <span className={`flex h-7 w-7 items-center justify-center rounded-full border text-[10px] ${step.status === 'DONE' ? 'border-studio-oxide bg-studio-oxide text-studio-canvas' : step.status === 'ACTIVE' ? 'border-studio-warning text-studio-warning' : 'border-studio-line text-studio-faint'}`}>
                                  {step.status === 'DONE' ? <Check className="h-3.5 w-3.5" /> : stepIndex + 1}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                                  <h4 className="font-serif text-base font-semibold leading-6 text-studio-ink">{step.name}</h4>
                                  <span className={`tag shrink-0 ${step.status === 'ACTIVE' ? 'border-studio-warning/50 text-studio-warning' : step.status === 'DONE' ? 'border-studio-success/50 text-studio-success' : ''}`}>{STEP_LABELS[step.status]}</span>
                                </div>
                                {step.detail && <p className="mt-3 max-w-2xl text-sm leading-7 text-studio-muted">{step.detail}</p>}

                                {images.length > 0 && (
                                  <div className="mt-5">
                                    <p className="flex items-center gap-2 text-[10px] font-semibold uppercase text-studio-faint"><ImageIcon className="h-3.5 w-3.5" />制作过程图</p>
                                    <div className={`mt-3 grid gap-2 ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3'}`}>
                                      {images.map((image, imageIndex) => (
                                        <button
                                          key={image}
                                          type="button"
                                          onClick={() => setLightbox({ images, activeIndex: imageIndex, alt: step.name })}
                                          className={`group overflow-hidden rounded-[4px] border border-studio-line bg-black ${images.length === 1 ? 'aspect-video max-w-xl' : 'aspect-[4/3]'}`}
                                          aria-label={`放大查看 ${step.name} 过程图 ${imageIndex + 1}`}
                                        >
                                          <SmartImage src={image} alt={`${step.name} 过程图 ${imageIndex + 1}`} showFallbackText className="media-hover h-full w-full object-cover" referrerPolicy="no-referrer" loading="lazy" decoding="async" />
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ol>
                    ) : (
                      <StatusNotice tone="empty" title="暂无制作节点记录" description="项目仍可在作品展厅展示；后台补充阶段记录后，这里会按顺序呈现。" className="mt-5" />
                    )}
                  </div>
                </motion.section>
              </AnimatePresence>
            </div>
          </div>
        ) : (
          <StatusNotice tone="empty" title="暂无公开制作日志" description="当前没有带公开工艺记录的作品；隐藏项目不会出现在访客页面。" className="mt-8" />
        )}
      </div>

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
