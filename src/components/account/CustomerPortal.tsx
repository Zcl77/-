import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, BriefcaseBusiness, LogOut, RefreshCw, Settings2 } from 'lucide-react';
import { getMyProjects } from '../../services/api/repositories';
import { AuthenticatedUser, CustomerProject } from '../../types';
import StatusNotice from '../ui/StatusNotice';
import CustomerProjectDetail from './CustomerProjectDetail';
import PasswordChangePanel from './PasswordChangePanel';

interface CustomerPortalProps {
  user: AuthenticatedUser;
  selectedProjectId: string | null;
  onOpenProject: (projectId: string) => void;
  onBackToProjects: () => void;
  onLogout: () => Promise<void>;
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<unknown>;
}

const PROJECT_STATUS: Record<CustomerProject['status'], string> = {
  planning: '筹备中',
  active: '制作中',
  paused: '已暂停',
  review: '待验收',
  completed: '已完成',
  cancelled: '已取消',
};

function dateTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export default function CustomerPortal({ user, selectedProjectId, onOpenProject, onBackToProjects, onLogout, onChangePassword }: CustomerPortalProps) {
  const [projects, setProjects] = useState<CustomerProject[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (user.isStaff || user.mustChangePassword) return;
    setStatus('loading');
    setError(null);
    try {
      setProjects(await getMyProjects());
      setStatus('ready');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '项目列表加载失败。');
      setStatus('error');
    }
  }, [user.isStaff, user.mustChangePassword]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="page-shell">
      <div className="page-inner">
        <div className="mb-8 flex flex-col justify-between gap-4 border-b border-studio-line pb-5 sm:flex-row sm:items-center">
          <div><span className="page-kicker">Signed in</span><p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-studio-ink">{user.displayName}{user.isDevData && <span className="tag border-studio-warning/50 text-studio-warning">本地开发账号</span>}</p></div>
          <button type="button" onClick={() => void onLogout()} className="button-secondary self-start sm:self-auto"><LogOut className="h-4 w-4" />退出登录</button>
        </div>

        {user.mustChangePassword ? (
          <PasswordChangePanel onChangePassword={onChangePassword} />
        ) : user.isStaff ? (
          <section className="mx-auto max-w-xl border-y border-studio-line py-10 text-center">
            <Settings2 className="mx-auto h-6 w-6 text-studio-brass" aria-hidden="true" />
            <h1 className="mt-4 font-serif text-2xl font-semibold text-studio-ink">工作室管理账号</h1>
            <p className="mt-3 text-sm leading-7 text-studio-muted">第一版内容、客户、订单、进度和审核统一在 Django 管理后台处理。</p>
            <a href="/admin/" className="button-primary mt-6"><Settings2 className="h-4 w-4" />进入管理后台</a>
          </section>
        ) : selectedProjectId ? (
          <CustomerProjectDetail projectId={selectedProjectId} onBack={onBackToProjects} />
        ) : (
          <>
            <header className="border-b border-studio-line pb-7">
              <span className="page-kicker">My projects</span>
              <h1 className="page-title mt-2">我的项目</h1>
              <p className="page-description mt-3">查看真实制作阶段、最近更新、下一步计划和需要您确认的内容。</p>
            </header>

            {status === 'loading' && <StatusNotice tone="loading" title="正在读取我的项目" description="正在核对当前账号与项目成员关系。" className="mt-7" />}
            {status === 'error' && <StatusNotice tone="error" title="项目列表加载失败" description={error || undefined} action={<button type="button" onClick={() => void load()} className="button-secondary"><RefreshCw className="h-4 w-4" />重试</button>} className="mt-7" />}
            {status === 'ready' && projects.length === 0 && <StatusNotice tone="empty" title="当前账号尚未绑定项目" description="请联系工作室核对账号或项目成员信息。" className="mt-7" />}
            {status === 'ready' && projects.length > 0 && (
              <div className="mt-7 grid grid-cols-1 gap-4 lg:grid-cols-2">
                {projects.map((project) => (
                  <article key={project.id} className="rounded-[6px] border border-studio-line bg-studio-surface p-5 md:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0"><span className="tag">{PROJECT_STATUS[project.status]}</span><h2 className="mt-3 font-serif text-xl font-semibold text-studio-ink">{project.name}</h2></div>
                      {project.unreadUpdateCount > 0 && <span className="tag shrink-0 border-studio-warning/50 text-studio-warning">{project.unreadUpdateCount} 条未读</span>}
                    </div>
                    <div className="mt-5 flex items-center justify-between text-xs text-studio-muted"><span>{project.currentStage?.name || '阶段待设置'}</span><strong className="text-studio-ink">{project.completionPercent}%</strong></div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-studio-line"><span className="block h-full bg-studio-brass" style={{ width: `${project.completionPercent}%` }} /></div>
                    <dl className="mt-5 grid grid-cols-1 gap-3 border-y border-studio-line py-4 text-xs sm:grid-cols-2">
                      <div><dt className="text-studio-faint">最近进度</dt><dd className="mt-1 leading-6 text-studio-ink">{project.latestUpdate?.title || '尚未发布'}</dd></div>
                      <div><dt className="text-studio-faint">更新时间</dt><dd className="mt-1 leading-6 text-studio-ink">{dateTime(project.updatedAt)}</dd></div>
                    </dl>
                    <button type="button" onClick={() => onOpenProject(project.id)} className="button-secondary mt-5 w-full"><BriefcaseBusiness className="h-4 w-4" />查看项目详情<ArrowRight className="ml-auto h-4 w-4" /></button>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
