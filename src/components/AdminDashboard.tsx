import { useEffect, useState } from 'react';
import { Contact, FolderKanban, LogOut, MessageSquareText, Tags } from 'lucide-react';
import { Project, Review, ReviewStatus, StoredImage, StudioSettings } from '../types';
import { AdminAuthSnapshot, UploadDestination } from '../services/backend';
import AdminLogin from './admin/AdminLogin';
import CategoryManager from './admin/CategoryManager';
import ProjectEditor, { createProjectDraft } from './admin/ProjectEditor';
import ProjectList from './admin/ProjectList';
import ReviewModerationPanel from './admin/ReviewModerationPanel';
import StudioSettingsPanel from './admin/StudioSettingsPanel';
import StatusNotice from './ui/StatusNotice';

type AdminTab = 'projects' | 'reviews' | 'categories' | 'settings';

interface AdminDashboardProps {
  projects: Project[];
  reviews: Review[];
  categories: string[];
  hiddenCategories: string[];
  isAdmin: boolean;
  authState: AdminAuthSnapshot;
  dataSourceLabel: string;
  studioSettings: StudioSettings;
  onLogin: () => Promise<void>;
  onLogout: () => Promise<void>;
  onSaveProject: (project: Project) => Promise<void>;
  onDeleteProject: (project: Project) => Promise<void>;
  onModerateReview: (id: string, status: Exclude<ReviewStatus, 'pending'>) => Promise<void>;
  onDeleteReview: (id: string) => Promise<void>;
  onAddCategory: (name: string) => Promise<void>;
  onRenameCategory: (oldName: string, newName: string) => Promise<void>;
  onDeleteCategory: (name: string) => Promise<void>;
  onCategoryVisibilityChange: (name: string, visible: boolean) => Promise<void>;
  onSaveSettings: (settings: StudioSettings) => Promise<void>;
  onUploadAsset: (file: File, destination: UploadDestination, onProgress?: (value: number) => void) => Promise<StoredImage>;
}

export default function AdminDashboard(props: AdminDashboardProps) {
  const [tab, setTab] = useState<AdminTab>('projects');
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (props.isAdmin) return;
    setTab('projects');
    setEditingProject(null);
    setShowEditor(false);
    setBusyId(null);
    setMessage(null);
  }, [props.isAdmin]);

  if (!props.isAdmin) return <AdminLogin authState={props.authState} dataSourceLabel={props.dataSourceLabel} onLogin={props.onLogin} />;

  const runItemAction = async (id: string, action: () => Promise<void>, success: string) => {
    setBusyId(id);
    setMessage(null);
    try {
      await action();
      setMessage(success);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '操作失败。');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="page-shell">
      <div className="page-inner">
      <header className="mb-8 flex flex-col justify-between gap-5 border-b border-studio-line pb-6 lg:flex-row lg:items-end">
        <div>
          <span className="page-kicker">Administration</span>
          <h1 className="mt-2 font-serif text-2xl font-semibold text-studio-ink md:text-3xl">知行造境管理后台</h1>
          <p className="mt-2 text-xs text-studio-muted">项目、评论、分类可见性与公开联络信息</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <nav className="flex max-w-full gap-1 overflow-x-auto rounded-[4px] border border-studio-line bg-studio-surface p-1" aria-label="后台模块">
          {([
            ['projects', `项目 ${props.projects.length}`, FolderKanban],
            ['reviews', `评论 ${props.reviews.filter((review) => review.status === 'pending').length} 待审`, MessageSquareText],
            ['categories', '分类', Tags],
            ['settings', '联络', Contact],
          ] as const).map(([value, label, Icon]) => (
            <button key={value} type="button" onClick={() => { setTab(value); setShowEditor(false); }} aria-pressed={tab === value} className={`flex min-h-9 shrink-0 items-center gap-1.5 rounded-[3px] px-3 text-xs transition-colors ${tab === value ? 'bg-studio-brass text-studio-canvas' : 'text-studio-muted hover:bg-studio-raised hover:text-studio-ink'}`}><Icon className="h-3.5 w-3.5" />{label}</button>
          ))}
        </nav>
        <button type="button" disabled={props.authState.status === 'signing-out'} onClick={() => void props.onLogout()} className="button-secondary min-h-10 shrink-0 text-studio-danger">
          <LogOut className="h-4 w-4" /> {props.authState.status === 'signing-out' ? '正在退出' : '退出'}
        </button>
        </div>
      </header>

      {message && <StatusNotice compact title={message} className="mb-5" />}

      {tab === 'projects' && showEditor && editingProject && (
        <div key={editingProject.id}>
          <ProjectEditor
            project={editingProject}
            categories={props.categories}
            hiddenCategories={props.hiddenCategories}
            onUploadAsset={props.onUploadAsset}
            onCancel={() => setShowEditor(false)}
            onSave={async (project) => {
              await props.onSaveProject(project);
              setMessage(`项目已保存并由${props.dataSourceLabel}确认。`);
              setShowEditor(false);
            }}
          />
        </div>
      )}

      {tab === 'projects' && !showEditor && (
        <ProjectList
          projects={props.projects}
          busyId={busyId}
          onCreate={() => { setEditingProject(createProjectDraft(props.categories, props.hiddenCategories)); setShowEditor(true); }}
          onEdit={(project) => { setEditingProject(project); setShowEditor(true); }}
          onDelete={async (project) => {
            if (!confirm(`确定删除“${project.title}”吗？项目文档删除后无法在后台恢复。`)) return;
            await runItemAction(project.id, () => props.onDeleteProject(project), '项目已删除。');
          }}
        />
      )}

      {tab === 'reviews' && (
        <ReviewModerationPanel
          reviews={props.reviews}
          busyId={busyId}
          onModerate={(id, status) => runItemAction(id, () => props.onModerateReview(id, status), status === 'approved' ? '评论已批准。' : '评论已拒绝。')}
          onDelete={async (id) => {
            if (!confirm('确定永久删除这条评论吗？')) return;
            await runItemAction(id, () => props.onDeleteReview(id), '评论已删除。');
          }}
        />
      )}

      {tab === 'categories' && (
        <CategoryManager
          categories={props.categories}
          hiddenCategories={props.hiddenCategories}
          projects={props.projects}
          onAdd={props.onAddCategory}
          onRename={props.onRenameCategory}
          onDelete={props.onDeleteCategory}
          onVisibilityChange={props.onCategoryVisibilityChange}
        />
      )}

      {tab === 'settings' && (
        <StudioSettingsPanel settings={props.studioSettings} onSave={props.onSaveSettings} onUploadAsset={props.onUploadAsset} />
      )}
      </div>
    </div>
  );
}
