import { Edit2, Plus, Trash2 } from 'lucide-react';
import { Project } from '../../types';

interface ProjectListProps {
  projects: Project[];
  busyId?: string | null;
  onCreate: () => void;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => Promise<void>;
}

export default function ProjectList({ projects, busyId, onCreate, onEdit, onDelete }: ProjectListProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h3 className="text-xs uppercase tracking-widest text-gf-tea font-mono font-bold">项目档案 ({projects.length})</h3>
        <button type="button" onClick={onCreate} className="px-4 py-2 bg-gf-wood text-gf-rice text-xs font-serif font-bold flex items-center gap-1.5 rounded shadow-sm">
          <Plus className="w-4 h-4" /> 新建项目
        </button>
      </div>

      <div className="bg-white/50 border border-gf-tea/20 rounded overflow-x-auto shadow-sm">
        <table className="w-full text-left border-collapse text-xs md:text-sm">
          <thead className="bg-gf-wood/5 uppercase tracking-widest text-[9px] text-gf-tea border-b border-gf-tea/15 font-mono">
            <tr>
              <th className="p-4">预览</th>
              <th className="p-4">项目名称</th>
              <th className="p-4">比例</th>
              <th className="p-4">分类</th>
              <th className="p-4">可见性</th>
              <th className="p-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gf-tea/10">
            {projects.map((project) => (
              <tr key={project.id} className="hover:bg-white/40">
                <td className="p-4">
                  <div className="w-14 h-10 border border-gf-tea/15 overflow-hidden bg-gf-rice/30 rounded-sm">
                    {project.coverUrl && <img src={project.coverUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />}
                  </div>
                </td>
                <td className="p-4 font-serif font-bold">
                  <span>{project.title}</span>
                  {project.isDemo && <span className="ml-2 text-[9px] font-sans text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">演示内容</span>}
                  <span className="block text-[9px] text-gf-tea font-mono mt-1">{project.id}</span>
                </td>
                <td className="p-4 font-mono">{project.scale}</td>
                <td className="p-4">{project.category}</td>
                <td className="p-4">
                  <span className={`text-[9px] px-2 py-0.5 rounded border ${project.visibility === 'public' ? 'text-emerald-800 bg-emerald-50 border-emerald-200' : 'text-stone-600 bg-stone-50 border-stone-200'}`}>
                    {project.visibility === 'public' ? '公开' : '隐藏'}
                  </span>
                </td>
                <td className="p-4 text-right whitespace-nowrap">
                  <button type="button" onClick={() => onEdit(project)} className="p-2 border border-gf-tea/20 rounded bg-white text-gf-wood mr-2" title="编辑项目">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={busyId === project.id}
                    onClick={() => void onDelete(project)}
                    className="p-2 border border-red-200 rounded bg-red-50 text-red-700 disabled:opacity-50"
                    title="删除项目"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {projects.length === 0 && <p className="p-10 text-center text-sm text-gf-tea">暂无项目。</p>}
      </div>
    </div>
  );
}
