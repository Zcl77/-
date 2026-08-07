import { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import { Project, Review, ReviewStatus, StoredImage, StudioSettings } from '../types';
import { AdminAuthSnapshot } from '../services/firebase/authRepository';
import { UploadDestination } from '../services/firebase/storageRepository';
import AdminLogin from './admin/AdminLogin';
import CategoryManager from './admin/CategoryManager';
import ProjectEditor, { createProjectDraft } from './admin/ProjectEditor';
import ProjectList from './admin/ProjectList';
import ReviewModerationPanel from './admin/ReviewModerationPanel';
import StudioSettingsPanel from './admin/StudioSettingsPanel';

type AdminTab = 'projects' | 'reviews' | 'categories' | 'settings';

interface AdminDashboardProps {
  projects: Project[];
  reviews: Review[];
  categories: string[];
  hiddenCategories: string[];
  isAdmin: boolean;
  authState: AdminAuthSnapshot;
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

  if (!props.isAdmin) return <AdminLogin authState={props.authState} onLogin={props.onLogin} />;

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
    <div className="flex-1 h-screen flex flex-col p-4 md:p-8 lg:p-12 macro-gradient overflow-y-auto">
      <header className="flex flex-col lg:flex-row justify-between gap-5 border-b border-gf-tea/20 pb-6 mb-8">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-gf-wood">知行造境管理后台</h1>
            <button type="button" disabled={props.authState.status === 'signing-out'} onClick={() => void props.onLogout()} className="px-2.5 py-1 border border-red-200 bg-red-50 text-red-700 text-[10px] rounded flex items-center gap-1 disabled:opacity-50">
              <LogOut className="w-3.5 h-3.5" /> {props.authState.status === 'signing-out' ? '退出中' : '退出登录'}
            </button>
          </div>
          <p className="text-[10px] uppercase tracking-[0.25em] mt-2 text-gf-tea font-mono">Zhixing Studio Administration</p>
        </div>
        <nav className="flex flex-wrap gap-1 bg-white/50 border border-gf-tea/20 p-1 rounded self-start">
          {([
            ['projects', `项目 (${props.projects.length})`],
            ['reviews', `评论 (${props.reviews.filter((review) => review.status === 'pending').length} 待审)`],
            ['categories', '分类与可见性'],
            ['settings', '联络设置'],
          ] as const).map(([value, label]) => (
            <button key={value} type="button" onClick={() => { setTab(value); setShowEditor(false); }} className={`px-3 py-1.5 text-xs rounded ${tab === value ? 'bg-gf-wood text-gf-rice' : 'text-gf-tea'}`}>{label}</button>
          ))}
        </nav>
      </header>

      {message && <div className="mb-5 p-3 bg-white/75 border border-gf-tea/20 text-xs rounded">{message}</div>}

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
              setMessage('项目已保存并由 Firebase 确认。');
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
  );
}
