import { Clock3, Gauge, ListTree } from 'lucide-react';
import { Project } from '../../types';
import SmartImage from '../ui/SmartImage';

interface GalleryProjectSidebarProps {
  selectedProject: Project;
  projects: Project[];
  selectedCategory: string;
  onSelectProject: (project: Project) => void;
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

export default function GalleryProjectSidebar({ selectedProject, projects, selectedCategory, onSelectProject }: GalleryProjectSidebarProps) {
  return (
    <aside className="min-w-0 lg:col-span-4">
      <div className="lg:sticky lg:top-8">
        <section className="hidden border-y border-studio-line py-6 lg:block lg:border-t-0 lg:pt-0" aria-labelledby="selected-project-title">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <span className="page-kicker">Selected work</span>
              <h2 id="selected-project-title" className="mt-2 text-balance font-serif text-xl font-semibold leading-snug text-studio-ink xl:text-2xl">{selectedProject.title}</h2>
            </div>
            <span className={`tag shrink-0 ${selectedProject.status === 'WIP' ? 'border-studio-warning/50 text-studio-warning' : 'border-studio-success/50 text-studio-success'}`}>
              {STATUS_LABELS[selectedProject.status]}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-studio-muted">
            <span>{selectedProject.category}</span><span aria-hidden="true">/</span><span>{selectedProject.scale}</span>
            {selectedProject.isDemo && <span className="tag border-studio-warning/40 text-studio-warning">演示内容</span>}
          </div>

          <dl className={`mt-6 grid ${selectedProject.timeSpent === undefined ? 'grid-cols-1' : 'grid-cols-2'} border-y border-studio-line`}>
            {selectedProject.timeSpent !== undefined && <div className="border-r border-studio-line py-4 pr-4">
              <dt className="flex items-center gap-2 text-[10px] uppercase text-studio-faint"><Clock3 className="h-3.5 w-3.5" />制作耗时</dt>
              <dd className="mt-2 font-serif text-xl text-studio-ink">{selectedProject.timeSpent}<span className="ml-1 text-xs text-studio-muted">小时</span></dd>
            </div>}
            <div className={`py-4 ${selectedProject.timeSpent === undefined ? '' : 'pl-4'}`}>
              <dt className="flex items-center gap-2 text-[10px] uppercase text-studio-faint"><Gauge className="h-3.5 w-3.5" />完成比例</dt>
              <dd className="mt-2 font-serif text-xl text-studio-ink">{selectedProject.completionPercent}<span className="ml-1 text-xs text-studio-muted">%</span></dd>
            </div>
          </dl>

          {selectedProject.worksteps.length > 0 && (
            <div className="mt-6">
              <h3 className="flex items-center gap-2 text-xs font-semibold text-studio-ink"><ListTree className="h-4 w-4 text-studio-oxide" />关键制作节点</h3>
              <ol className="mt-4 space-y-0 border-l border-studio-line">
                {selectedProject.worksteps.map((step) => (
                  <li key={step.id} className="relative pb-4 pl-5 last:pb-0">
                    <span className={`absolute -left-1 top-1 h-2 w-2 rounded-full ${step.status === 'ACTIVE' ? 'bg-studio-warning' : step.status === 'DONE' ? 'bg-studio-oxide' : 'bg-studio-line'}`} />
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-xs leading-5 text-studio-muted">{step.name}</span>
                      <span className="shrink-0 text-[9px] uppercase text-studio-faint">{STEP_STATUS_LABELS[step.status]}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>

        <section className="mt-8" aria-labelledby="project-index">
          <div className="flex items-center justify-between gap-3">
            <h3 id="project-index" className="section-title">{selectedCategory === 'All' ? '作品索引' : `${selectedCategory} / 作品索引`}</h3>
            <span className="text-[10px] text-studio-faint">{projects.length} 件</span>
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
                  className={`group flex w-full items-center gap-3 rounded-[4px] border p-2 text-left transition-colors duration-200 ${active ? 'border-studio-brass bg-studio-raised' : 'border-studio-line hover:border-studio-faint hover:bg-studio-surface'}`}
                >
                  <span className="aspect-[4/3] w-20 shrink-0 overflow-hidden rounded-[2px] bg-black">
                    <SmartImage src={project.coverUrl} alt={`${project.title} 封面缩略图`} className="media-hover h-full w-full object-cover" referrerPolicy="no-referrer" loading="lazy" decoding="async" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10px] text-studio-faint">{String(index + 1).padStart(2, '0')}</span>
                    <strong className="mt-0.5 block truncate font-serif text-sm font-semibold text-studio-ink">{project.title}</strong>
                    <span className="mt-1 block text-[10px] text-studio-muted">{project.scale || '比例待补充'}{project.timeSpent === undefined ? '' : ` · ${project.timeSpent} 小时`}</span>
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
