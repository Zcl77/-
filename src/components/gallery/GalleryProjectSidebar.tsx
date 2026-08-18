import { Clock3, Gauge, ListTree, ShoppingBag } from 'lucide-react';
import { Project } from '../../types';
import SmartImage from '../ui/SmartImage';
import { useI18n } from '../../i18n';

interface GalleryProjectSidebarProps {
  selectedProject: Project;
  projects: Project[];
  selectedCategory: string | null;
  onSelectProject: (project: Project) => void;
  onAddToCart: (project: Project) => void;
}

const STATUS_LABELS: Record<Project['status'], string> = {
  WIP: '制作中',
  Completed: '已完成',
  Sold: '已售出',
};

const STEP_STATUS_LABELS: Record<Project['worksteps'][number]['status'], string> = {
  DONE: '完成',
  ACTIVE: '进行中',
  NEXT: '待开始',
};

export default function GalleryProjectSidebar({
  selectedProject,
  projects,
  selectedCategory,
  onSelectProject,
  onAddToCart,
}: GalleryProjectSidebarProps) {
  const { t } = useI18n();
  return (
    <aside className="min-w-0 lg:col-span-4">
      <div className="lg:sticky lg:top-8">
        <section
          className="hidden border-y border-studio-line py-6 lg:block lg:border-t-0 lg:pt-0"
          aria-labelledby="selected-project-title"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <span className="page-kicker">{t('当前作品')}</span>
              <h2
                id="selected-project-title"
                className="mt-2 text-balance font-serif text-xl font-semibold leading-snug text-studio-ink xl:text-2xl"
              >
                {selectedProject.title}
              </h2>
            </div>
            <span
              className={`tag shrink-0 ${selectedProject.status === 'WIP' ? 'border-studio-warning/50 text-studio-warning' : 'border-studio-success/50 text-studio-success'}`}
            >
              {t(STATUS_LABELS[selectedProject.status])}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-studio-muted">
            <span>{selectedProject.category}</span>
            <span aria-hidden="true" className="text-studio-faint">
              /
            </span>
            <span>{selectedProject.scale}</span>
            {selectedProject.isDemo && (
              <span className="tag border-studio-warning/40 text-studio-warning">{t('演示内容')}</span>
            )}
          </div>

          <dl
            className={`mt-6 grid ${selectedProject.timeSpent === undefined ? 'grid-cols-1' : 'grid-cols-2'} border-y border-studio-line`}
          >
            {selectedProject.timeSpent !== undefined && (
              <div className="border-r border-studio-line py-4 pr-4">
                <dt className="flex items-center gap-2 text-[10px] uppercase text-studio-faint">
                  <Clock3 className="h-3.5 w-3.5" />
                  {t('制作耗时')}
                </dt>
                <dd className="mt-2 font-serif text-xl text-studio-ink">
                  {selectedProject.timeSpent}
                  <span className="ml-1 text-xs text-studio-muted">{t('小时')}</span>
                </dd>
              </div>
            )}
            <div className={`py-4 ${selectedProject.timeSpent === undefined ? '' : 'pl-4'}`}>
              <dt className="flex items-center gap-2 text-[10px] uppercase text-studio-faint">
                <Gauge className="h-3.5 w-3.5" />
                {t('完成比例')}
              </dt>
              <dd className="mt-2 font-serif text-xl text-studio-ink">
                {selectedProject.completionPercent}
                <span className="ml-1 text-xs text-studio-muted">%</span>
              </dd>
              <div className="progress-track mt-2 h-1">
                <span className="progress-bar" style={{ width: `${selectedProject.completionPercent}%` }} />
              </div>
            </div>
          </dl>

          {selectedProject.worksteps.length > 0 && (
            <div className="mt-6">
              <h3 className="flex items-center gap-2 text-xs font-semibold text-studio-ink">
                <ListTree className="h-4 w-4 text-studio-oxide" />
                {t('关键制作节点')}
              </h3>
              <ol className="mt-4 space-y-0 border-l border-studio-line">
                {selectedProject.worksteps.map((step) => (
                  <li key={step.id} className="relative pb-4 pl-5 last:pb-0">
                    <span
                      className={`absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full transition-all duration-200 ${step.status === 'ACTIVE' ? 'bg-studio-warning shadow-[0_0_8px_rgba(218,180,110,0.4)]' : step.status === 'DONE' ? 'bg-studio-oxide' : 'bg-studio-line'}`}
                    />
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-xs leading-5 text-studio-muted">{step.name}</span>
                      <span className="shrink-0 text-[9px] uppercase text-studio-faint">
                        {t(STEP_STATUS_LABELS[step.status])}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
          <button
            type="button"
            className="button-primary mt-6 w-full"
            onClick={() => onAddToCart(selectedProject)}
          >
            <ShoppingBag className="h-4 w-4" />
            {t('加入购物车')}
          </button>
        </section>

        <section className="mt-8" aria-labelledby="project-index">
          <div className="flex items-center justify-between gap-3">
            <h3 id="project-index" className="section-title">
              {selectedCategory ? `${selectedCategory} / ${t('作品索引')}` : t('作品索引')}
            </h3>
            <span className="text-[10px] text-studio-faint">
              {projects.length} {t('件')}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:max-h-[26rem] lg:grid-cols-1 lg:overflow-y-auto lg:pr-1">
            {projects.map((project, index) => {
              const active = selectedProject.id === project.id;
              return (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => onSelectProject(project)}
                  aria-pressed={active}
                  className={`group flex w-full items-center gap-3 rounded-[8px] border p-2 text-left transition-all duration-200 ${active ? 'border-studio-brass bg-studio-raised shadow-[0_0_0_2px_var(--color-studio-brass-glow)]' : 'border-studio-line hover:border-studio-faint hover:bg-studio-surface-solid hover:shadow-[0_2px_12px_rgba(0,0,0,0.1)]'}`}
                >
                  <span className="aspect-[4/3] w-20 shrink-0 overflow-hidden rounded-[4px] bg-black">
                    <SmartImage
                      src={project.coverUrl}
                      alt={`${project.title} ${t('封面缩略图')}`}
                      className="media-hover h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      decoding="async"
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10px] text-studio-faint">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <strong className="mt-0.5 block truncate font-serif text-sm font-semibold text-studio-ink">
                      {project.title}
                    </strong>
                    <span className="mt-1 block text-[10px] text-studio-muted">
                      {project.scale || t('比例待补充')}
                      {project.timeSpent === undefined ? '' : ` · ${project.timeSpent} ${t('小时')}`}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </aside>
  );
}
