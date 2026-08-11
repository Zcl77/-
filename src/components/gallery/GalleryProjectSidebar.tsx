import { Clock, Info, Star } from 'lucide-react';
import { Project } from '../../types';

interface GalleryProjectSidebarProps {
  selectedProject: Project;
  projects: Project[];
  selectedCategory: string;
  onSelectProject: (project: Project) => void;
}

const STATUS_LABELS: Record<Project['status'], string> = {
  WIP: '制作中 (WIP)',
  Completed: '已完成',
  Sold: '已售出',
};

const STEP_STATUS_LABELS: Record<Project['worksteps'][number]['status'], string> = {
  DONE: '已完成',
  ACTIVE: '进行中',
  NEXT: '待开始',
};

export default function GalleryProjectSidebar({ selectedProject, projects, selectedCategory, onSelectProject }: GalleryProjectSidebarProps) {
  return (
    <aside className="lg:col-span-4 flex flex-col gap-6">
      <div className="soft-glass p-6 rounded premium-shadow space-y-6 text-left">
        <div className="flex justify-between items-start border-b border-gf-tea/15 pb-4 gap-3">
          <div className="text-left min-w-0">
            <h2 className="text-xl md:text-2xl font-serif text-gf-wood font-bold">{selectedProject.title}</h2>
            {selectedProject.isDemo && <span className="inline-block mt-1 text-[9px] text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">演示内容，非真实案例</span>}
            <span className="text-[10px] uppercase tracking-widest font-mono text-gf-wood/80 block mt-1 font-medium">{selectedProject.category} / {selectedProject.scale}</span>
          </div>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase shrink-0 ${selectedProject.status === 'WIP' ? 'bg-gf-sand/30 text-gf-wood border border-gf-tea/20' : selectedProject.status === 'Completed' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-stone-200 text-stone-700 border border-stone-300'}`}>
            {STATUS_LABELS[selectedProject.status]}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/40 border border-gf-tea/10 p-4 rounded text-center shadow-xs">
            <span className="text-[9px] uppercase tracking-widest text-gf-tea block mb-1 font-medium">设计耗时 Spent</span>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <Clock className="w-4 h-4 text-gf-tea" />
              <span className="text-lg md:text-xl font-bold font-serif text-gf-wood">{selectedProject.timeSpent} 小时</span>
            </div>
          </div>
          <div className="bg-white/40 border border-gf-tea/10 p-4 rounded text-center shadow-xs">
            <span className="text-[9px] uppercase tracking-widest text-gf-tea block mb-1 font-medium">完成比例 Progress</span>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <Star className="w-4 h-4 text-gf-tea" />
              <span className="text-lg md:text-xl font-bold font-serif text-gf-wood">{selectedProject.completionPercent}%</span>
            </div>
          </div>
        </div>

        {selectedProject.worksteps.length > 0 && (
          <div className="space-y-3 pt-2 text-left">
            <h3 className="text-[10px] uppercase tracking-wider text-gf-wood font-mono flex items-center gap-1.5 font-bold">
              <Info className="w-3.5 h-3.5 text-gf-tea" /> 关键制作里程碑 Progress Milestones
            </h3>
            <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
              {selectedProject.worksteps.map((step) => (
                <div key={step.id} className="flex justify-between items-center text-xs p-1.5 rounded bg-white/65 border border-gf-tea/10 text-left gap-3">
                  <span className={`font-serif text-left transition-colors ${step.status === 'ACTIVE' ? 'text-gf-wood font-semibold' : 'text-gf-wood/50'}`}>{step.name}</span>
                  <span className={`text-[8px] px-1.5 py-0.5 rounded uppercase font-mono font-bold tracking-wider shrink-0 ${step.status === 'DONE' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300/35' : step.status === 'ACTIVE' ? 'bg-gf-wood text-gf-sand' : 'border border-gf-tea/10 text-gf-tea/60'}`}>
                    {STEP_STATUS_LABELS[step.status]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3 text-left">
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-gf-tea font-mono font-semibold">
          {selectedCategory === 'All' ? '其他工艺存档馆藏 Other Archives' : `更多在 ${selectedCategory} 分类中`}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-1">
          {projects.map((project) => (
            <button
              type="button"
              key={project.id}
              onClick={() => onSelectProject(project)}
              className={`group w-full flex items-center gap-3 p-3 bg-white/35 border transition-all cursor-pointer rounded shadow-xs ${selectedProject.id === project.id ? 'border-gf-wood bg-white/70 shadow-sm' : 'border-gf-tea/10 hover:border-gf-tea/30 hover:bg-white/45'}`}
            >
              <span className="w-16 h-12 bg-gf-rice/30 border border-gf-tea/15 overflow-hidden shrink-0 rounded-sm">
                {project.coverUrl && <img src={project.coverUrl} alt={project.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" referrerPolicy="no-referrer" />}
              </span>
              <span className="flex-1 min-w-0 text-left">
                <span className="text-xs font-serif text-gf-wood font-semibold truncate block">{project.title}</span>
                <span className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] font-mono text-gf-tea bg-gf-wood/5 px-1 rounded">{project.scale}</span>
                  <span className="text-[9px] font-mono text-gf-tea/80">已耗时 {project.timeSpent} 小时</span>
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
