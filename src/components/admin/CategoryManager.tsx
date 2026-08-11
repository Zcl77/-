import { useState } from 'react';
import { Check, Edit2, Plus, Trash2, X } from 'lucide-react';
import { Project } from '../../types';
import StatusNotice from '../ui/StatusNotice';

interface CategoryManagerProps {
  categories: string[];
  hiddenCategories: string[];
  projects: Project[];
  onAdd: (name: string) => Promise<void>;
  onRename: (oldName: string, newName: string) => Promise<void>;
  onDelete: (name: string) => Promise<void>;
  onVisibilityChange: (name: string, visible: boolean) => Promise<void>;
}

export default function CategoryManager(props: CategoryManagerProps) {
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const run = async (key: string, action: () => Promise<void>, success: string) => {
    setBusy(key);
    setMessage(null);
    try {
      await action();
      setMessage(success);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '操作失败。');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section aria-labelledby="category-manager-title">
      <div>
        <h2 id="category-manager-title" className="section-heading">分类与游客可见性</h2>
        <p className="mt-1 max-w-2xl text-xs leading-6 text-studio-muted">隐藏分类时，关联项目会在同一次原子写入中同步隐藏；任一步失败都不会留下部分结果。</p>
      </div>

      {message && <StatusNotice compact title={message} className="mt-5" />}

      <div className="mt-6 grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="overflow-hidden rounded-[6px] border border-studio-line bg-studio-surface">
            {props.categories.map((category) => {
              const visible = !props.hiddenCategories.includes(category);
              const count = props.projects.filter((project) => project.category === category).length;
              return (
                <div key={category} className="border-b border-studio-line p-4 last:border-b-0">
                  {editing === category ? (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <label className="min-w-0 flex-1"><span className="sr-only">新的分类名称</span><input value={editingName} onChange={(event) => setEditingName(event.target.value)} maxLength={100} className="field-input" /></label>
                      <div className="flex gap-2">
                        <button type="button" disabled={busy !== null} onClick={() => void run(`rename:${category}`, async () => {
                          const trimmed = editingName.trim();
                          if (!trimmed) throw new Error('分类名不能为空。');
                          if (props.categories.includes(trimmed) && trimmed !== category) throw new Error('分类名已存在。');
                          await props.onRename(category, trimmed);
                          setEditing(null);
                        }, '分类已重命名。')} className="button-primary min-h-11 px-3"><Check className="h-4 w-4" />保存</button>
                        <button type="button" onClick={() => setEditing(null)} className="icon-button h-11 min-h-11 w-11" title="取消"><X className="h-4 w-4" /></button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                      <label className="flex min-w-0 cursor-pointer items-center gap-3">
                        <input type="checkbox" checked={visible} disabled={busy !== null} onChange={(event) => void run(`visible:${category}`, () => props.onVisibilityChange(category, event.target.checked), event.target.checked ? '分类已公开。' : '分类及关联项目已对游客隐藏。')} className="h-4 w-4 accent-studio-brass" />
                        <span className="min-w-0">
                          <strong className="block truncate font-serif text-sm font-semibold text-studio-ink">{category}</strong>
                          <span className="mt-0.5 block text-[10px] text-studio-muted">{count} 个项目 · {visible ? '访客可见' : '仅管理员可见'}</span>
                        </span>
                      </label>
                      <div className="flex shrink-0 gap-2 self-end sm:self-auto">
                        <button type="button" onClick={() => { setEditing(category); setEditingName(category); }} className="icon-button h-9 min-h-9 w-9" title="重命名" aria-label={`重命名 ${category}`}><Edit2 className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => {
                          if (!confirm(`删除分类“${category}”？关联项目将归入“未分类”。`)) return;
                          void run(`delete:${category}`, () => props.onDelete(category), '分类已删除。');
                        }} className="icon-button h-9 min-h-9 w-9 text-studio-danger" title="删除" aria-label={`删除 ${category}`}><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {props.categories.length === 0 && <StatusNotice tone="empty" title="暂无分类" className="m-4" />}
          </div>
        </div>

        <form className="ui-panel p-5 lg:col-span-4" onSubmit={(event) => {
          event.preventDefault();
          void run('add', async () => {
            const trimmed = newName.trim();
            if (!trimmed) throw new Error('分类名不能为空。');
            if (props.categories.includes(trimmed)) throw new Error('分类名已存在。');
            await props.onAdd(trimmed);
            setNewName('');
          }, '分类已创建。');
        }}>
          <h3 className="text-sm font-semibold text-studio-ink">创建分类</h3>
          <label className="mt-4 block"><span className="field-label">分类名称</span><input value={newName} onChange={(event) => setNewName(event.target.value)} maxLength={100} placeholder="例如：历史建筑复原" className="field-input" /></label>
          <button type="submit" disabled={busy !== null} className="button-primary mt-4 w-full"><Plus className="h-4 w-4" />添加分类</button>
        </form>
      </div>
    </section>
  );
}
