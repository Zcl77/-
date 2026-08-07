import { useState } from 'react';
import { Check, Edit2, Plus, Trash2, X } from 'lucide-react';
import { Project } from '../../types';

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
    <div className="space-y-5">
      <h3 className="text-xs uppercase tracking-widest text-gf-tea font-mono font-bold">分类与游客可见性</h3>
      {message && <div className="p-3 bg-white/70 border border-gf-tea/20 text-xs rounded">{message}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <div className="bg-white/50 border border-gf-tea/20 p-5 rounded space-y-3">
          {props.categories.map((category) => {
            const visible = !props.hiddenCategories.includes(category);
            const count = props.projects.filter((project) => project.category === category).length;
            return (
              <div key={category} className="bg-white/70 border border-gf-tea/10 p-3 rounded">
                {editing === category ? (
                  <div className="flex gap-2">
                    <input value={editingName} onChange={(event) => setEditingName(event.target.value)} maxLength={100} className="flex-1 border border-gf-tea/30 px-2 py-1 text-sm rounded" />
                    <button type="button" onClick={() => void run(`rename:${category}`, async () => {
                      const trimmed = editingName.trim();
                      if (!trimmed) throw new Error('分类名不能为空。');
                      if (props.categories.includes(trimmed) && trimmed !== category) throw new Error('分类名已存在。');
                      await props.onRename(category, trimmed);
                      setEditing(null);
                    }, '分类已重命名。')} className="p-1.5 text-emerald-700" title="保存"><Check className="w-4 h-4" /></button>
                    <button type="button" onClick={() => setEditing(null)} className="p-1.5 text-stone-600" title="取消"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={visible} disabled={busy !== null} onChange={(event) => void run(`visible:${category}`, () => props.onVisibilityChange(category, event.target.checked), event.target.checked ? '分类已公开。' : '分类及关联项目已对游客隐藏。')} className="accent-gf-wood" />
                      <span className="font-serif font-bold">{category}</span>
                      <span className="text-[10px] text-gf-tea">{count} 项</span>
                    </label>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => { setEditing(category); setEditingName(category); }} className="p-1.5 text-gf-tea" title="重命名"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button type="button" onClick={() => {
                        if (!confirm(`删除分类“${category}”？关联项目将归入“未分类”。`)) return;
                        void run(`delete:${category}`, () => props.onDelete(category), '分类已删除。');
                      }} className="p-1.5 text-red-700" title="删除"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="bg-white/50 border border-gf-tea/20 p-5 rounded space-y-3">
          <label className="text-[10px] uppercase tracking-widest text-gf-tea font-mono font-bold">新分类</label>
          <input value={newName} onChange={(event) => setNewName(event.target.value)} maxLength={100} placeholder="例如：历史建筑复原" className="w-full border border-gf-tea/30 p-2 text-sm rounded" />
          <button type="button" disabled={busy !== null} onClick={() => void run('add', async () => {
            const trimmed = newName.trim();
            if (!trimmed) throw new Error('分类名不能为空。');
            if (props.categories.includes(trimmed)) throw new Error('分类名已存在。');
            await props.onAdd(trimmed);
            setNewName('');
          }, '分类已创建。')} className="w-full py-2 bg-gf-wood text-gf-rice text-xs font-bold rounded flex items-center justify-center gap-1 disabled:opacity-50">
            <Plus className="w-3.5 h-3.5" /> 添加分类
          </button>
          <p className="text-[11px] text-gf-tea leading-relaxed">隐藏分类会在一次原子写入中同步更新关联项目的可见性；任一步失败都不会留下半套结果。</p>
        </div>
      </div>
    </div>
  );
}
