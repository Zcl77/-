import { Edit2, Plus, Trash2 } from 'lucide-react';
import { Project } from '../../types';
import StatusNotice from '../ui/StatusNotice';

interface ProjectListProps {
  projects: Project[];
  busyId?: string | null;
  onCreate: () => void;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => Promise<void>;
}

export default function ProjectList({ projects, busyId, onCreate, onEdit, onDelete }: ProjectListProps) {
  return (
    <section aria-labelledby="admin-projects-title">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 id="admin-projects-title" className="section-heading">项目档案</h2>
          <p className="mt-1 text-xs text-studio-muted">共 {projects.length} 个项目，包含公开、隐藏和演示内容。</p>
        </div>
        <button type="button" onClick={onCreate} className="button-primary"><Plus className="h-4 w-4" />新建项目</button>
      </div>

      {projects.length === 0 ? (
        <StatusNotice tone="empty" title="暂无项目" description="创建项目后才会出现在后台；是否公开仍由项目与分类可见性共同决定。" className="mt-5" />
      ) : (
        <div className="mt-5 overflow-x-auto rounded-[6px] border border-studio-line bg-studio-surface">
          <table className="w-full min-w-[760px] border-collapse text-left text-xs">
            <thead className="border-b border-studio-line bg-studio-raised text-[10px] uppercase text-studio-faint">
              <tr>
                <th className="p-3 font-semibold">预览</th>
                <th className="p-3 font-semibold">项目名称 / ID</th>
                <th className="p-3 font-semibold">比例</th>
                <th className="p-3 font-semibold">分类</th>
                <th className="p-3 font-semibold">可见性</th>
                <th className="p-3 text-right font-semibold">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-studio-line">
              {projects.map((project) => (
                <tr key={project.id} className="transition-colors hover:bg-studio-raised">
                  <td className="p-3">
                    <span className="block aspect-[4/3] w-16 overflow-hidden rounded-[2px] border border-studio-line bg-black">
                      {project.coverUrl && <img src={project.coverUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" loading="lazy" decoding="async" />}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="font-serif text-sm font-semibold text-studio-ink">{project.title}</span>
                    {project.isDemo && <span className="tag ml-2 border-studio-warning/40 text-studio-warning">演示</span>}
                    <span className="mt-1 block max-w-xs truncate font-mono text-[9px] text-studio-faint">{project.id}</span>
                  </td>
                  <td className="p-3 font-mono text-studio-muted">{project.scale}</td>
                  <td className="p-3 text-studio-muted">{project.category}</td>
                  <td className="p-3"><span className={`tag ${project.visibility === 'public' ? 'border-studio-success/40 text-studio-success' : ''}`}>{project.visibility === 'public' ? '公开' : '隐藏'}</span></td>
                  <td className="whitespace-nowrap p-3 text-right">
                    <button type="button" onClick={() => onEdit(project)} className="icon-button mr-2 h-9 min-h-9 w-9" title="编辑项目" aria-label={`编辑 ${project.title}`}><Edit2 className="h-3.5 w-3.5" /></button>
                    <button type="button" disabled={busyId === project.id} onClick={() => void onDelete(project)} className="icon-button h-9 min-h-9 w-9 text-studio-danger" title="删除项目" aria-label={`删除 ${project.title}`}><Trash2 className="h-3.5 w-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
