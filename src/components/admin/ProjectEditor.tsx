import { ClipboardEvent, DragEvent, FormEvent, useState } from 'react';
import { Image as ImageIcon, Plus, Save, Trash2, Upload, X } from 'lucide-react';
import { Project, RoomDetail, StoredImage, WorkStep } from '../../types';
import { createUniqueId, validateProject } from '../../domain/validation';
import { applyProjectVisibility, retainReferencedAssets } from '../../domain/visibility';
import { UploadDestination } from '../../services/firebase/storageRepository';
import StatusNotice from '../ui/StatusNotice';

interface ProjectEditorProps {
  project: Project;
  categories: string[];
  hiddenCategories: string[];
  onSave: (project: Project) => Promise<void>;
  onCancel: () => void;
  onUploadAsset: (file: File, destination: UploadDestination, onProgress?: (value: number) => void) => Promise<StoredImage>;
}

interface ImageFieldProps {
  label: string;
  value: string;
  progress?: number;
  message?: string;
  onChange: (value: string) => void;
  onUpload: (file: File) => void;
}

const STANDARD_STAGES = ['需求确认', '方案设计', '三维建模', '打印制作', '组装涂装', '成品验收', '包装交付'];

export function createProjectDraft(categories: string[], hiddenCategories: string[]): Project {
  const category = categories[0] ?? '未分类';
  return applyProjectVisibility({
    id: createUniqueId(),
    slug: '',
    title: '',
    scale: '1:64',
    category,
    status: 'WIP',
    visibility: 'public',
    description: '',
    timeSpent: 0,
    createdAt: new Date().toISOString(),
    completionPercent: 0,
    coverUrl: '',
    images: [],
    rooms: [],
    imageAssets: [],
    worksteps: STANDARD_STAGES.map((name, index) => ({
      id: createUniqueId(),
      name,
      status: index === 0 ? 'ACTIVE' : 'NEXT',
      detail: '',
      images: [],
    })),
  }, hiddenCategories);
}

function ImageField({ label, value, progress, message, onChange, onUpload }: ImageFieldProps) {
  const acceptFile = (file?: File | null) => {
    if (file) onUpload(file);
  };
  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    let item: DataTransferItem | undefined;
    for (let index = 0; index < event.clipboardData.items.length; index += 1) {
      const candidate = event.clipboardData.items[index];
      if (candidate.type.startsWith('image/')) {
        item = candidate;
        break;
      }
    }
    const file = item?.getAsFile();
    if (file) {
      event.preventDefault();
      acceptFile(file);
    }
  };
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    acceptFile(event.dataTransfer.files?.[0]);
  };

  return (
    <div className="space-y-2" onPaste={handlePaste} onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
      <label className="field-label">{label}</label>
      <div className="flex flex-col items-stretch gap-2 sm:flex-row">
        <input value={value} onChange={(event) => onChange(event.target.value)} placeholder="https://... 或旧 Base64 数据" className="field-input min-w-0 flex-1 font-mono text-xs" />
        <label className="button-secondary shrink-0 cursor-pointer">
          <Upload className="h-3.5 w-3.5" /> 上传
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" className="hidden" onChange={(event) => {
            acceptFile(event.target.files?.[0]);
            event.currentTarget.value = '';
          }} />
        </label>
        <div className="flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[4px] border border-studio-line bg-black">
          {value ? <img src={value} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" loading="lazy" decoding="async" /> : <ImageIcon className="h-5 w-5 text-studio-faint" />}
        </div>
      </div>
      {progress !== undefined && <div role="status" className="text-[10px] text-studio-muted">上传中 {progress}%</div>}
      {message && <p className="text-[10px] text-studio-muted">{message}</p>}
    </div>
  );
}

export default function ProjectEditor({ project, categories, hiddenCategories, onSave, onCancel, onUploadAsset }: ProjectEditorProps) {
  const [draft, setDraft] = useState<Project>(() => structuredClone(project));
  const [authors, setAuthors] = useState(project.authors?.join(', ') ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [uploads, setUploads] = useState<Record<string, { progress?: number; message?: string }>>({});

  const update = <K extends keyof Project>(key: K, value: Project[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const upload = async (file: File, slot: string, apply: (url: string) => void) => {
    setUploads((current) => ({ ...current, [slot]: { progress: 0 } }));
    try {
      const asset = await onUploadAsset(file, { scope: 'projects', ownerId: draft.id, slot }, (progress) => {
        setUploads((current) => ({ ...current, [slot]: { progress } }));
      });
      apply(asset.url);
      setDraft((current) => ({
        ...current,
        imageAssets: [...(current.imageAssets ?? []).filter((existing) => existing.path !== asset.path), asset],
      }));
      setUploads((current) => ({ ...current, [slot]: { message: '已上传到 Storage；保存项目后生效。' } }));
    } catch (error) {
      setUploads((current) => ({ ...current, [slot]: { message: error instanceof Error ? error.message : '上传失败。' } }));
    }
  };

  const updateRoom = (index: number, updater: (room: RoomDetail) => RoomDetail) => {
    const rooms = [...(draft.rooms ?? [])];
    rooms[index] = updater(rooms[index]);
    update('rooms', rooms);
  };

  const updateStep = (index: number, updater: (step: WorkStep) => WorkStep) => {
    const worksteps = [...draft.worksteps];
    worksteps[index] = updater(worksteps[index]);
    update('worksteps', worksteps);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);
    const normalized = retainReferencedAssets({
      ...draft,
      visibility: hiddenCategories.includes(draft.category) ? 'hidden' : draft.visibility,
      title: draft.title.trim(),
      scale: draft.scale.trim(),
      category: draft.category.trim(),
      description: draft.description.trim(),
      coverUrl: draft.coverUrl.trim(),
      images: draft.images.map((value) => value.trim()).filter(Boolean),
      authors: authors.split(/[,，]/).map((value) => value.trim()).filter(Boolean),
      rooms: draft.rooms?.map((room) => ({
        ...room,
        name: room.name.trim(),
        description: room.description.trim(),
        coverUrl: room.coverUrl.trim(),
        images: room.images.map((value) => value.trim()).filter(Boolean),
        detailsList: room.detailsList?.map((value) => value.trim()).filter(Boolean),
      })),
      worksteps: draft.worksteps.map((step) => ({
        ...step,
        name: step.name.trim(),
        detail: step.detail?.trim(),
        image: step.image?.trim(),
        images: step.images?.map((value) => value.trim()).filter(Boolean),
      })),
    });
    const errors = validateProject(normalized);
    if (errors.length > 0) {
      setMessage(errors.join(' '));
      return;
    }
    setSaving(true);
    try {
      await onSave(normalized);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '项目保存失败。');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="max-w-6xl space-y-8 text-left">
      <div className="flex items-start justify-between gap-4 border-b border-studio-line pb-5">
        <div>
          <h2 className="section-heading">{project.title ? '编辑项目' : '新建项目'}</h2>
          <p className="mt-1 font-mono text-[10px] text-studio-faint">稳定 ID：{draft.id}</p>
        </div>
        <button type="button" onClick={onCancel} className="icon-button" title="取消编辑" aria-label="取消编辑"><X className="h-4 w-4" /></button>
      </div>

      {message && <StatusNotice compact tone="error" title="项目尚未保存" description={message} />}
      {draft.isDemo && <StatusNotice compact tone="warning" title="演示项目" description="该项目来自早期演示数据，前台会明确显示“演示内容”。" />}

      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <label className="space-y-1.5"><span className="field-label">项目名称 *</span><input required maxLength={200} value={draft.title} onChange={(event) => update('title', event.target.value)} className="field-input" /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1.5"><span className="field-label">比例 *</span><input required maxLength={40} value={draft.scale} onChange={(event) => update('scale', event.target.value)} className="field-input" /></label>
          <label className="space-y-1.5"><span className="field-label">分类 *</span><select value={draft.category} onChange={(event) => {
            const category = event.target.value;
             setDraft((current) => ({
               ...current,
               category,
               visibility: hiddenCategories.includes(category) ? 'hidden' : current.visibility,
             }));
          }} className="field-input">{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
        </div>
        <label className="space-y-1.5"><span className="field-label">状态</span><select value={draft.status} onChange={(event) => update('status', event.target.value as Project['status'])} className="field-input"><option value="WIP">制作中</option><option value="Completed">已完成</option><option value="Sold">已售出</option></select></label>
        <label className="space-y-1.5"><span className="field-label">项目可见性</span><select value={draft.visibility} disabled={hiddenCategories.includes(draft.category)} onChange={(event) => update('visibility', event.target.value as Project['visibility'])} className="field-input disabled:opacity-60"><option value="public">公开</option><option value="hidden">隐藏</option></select>{hiddenCategories.includes(draft.category) && <span className="block text-[10px] text-studio-warning">该分类已隐藏，项目必须保持隐藏。</span>}</label>
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1.5"><span className="field-label">累计工时</span><input type="number" min="0" value={draft.timeSpent} onChange={(event) => update('timeSpent', Number(event.target.value))} className="field-input" /></label>
          <label className="space-y-1.5"><span className="field-label">完成比例</span><input type="number" min="0" max="100" value={draft.completionPercent} onChange={(event) => update('completionPercent', Number(event.target.value))} className="field-input" /></label>
        </div>
      </section>

      <label className="block space-y-1.5"><span className="field-label">项目说明 *</span><textarea required maxLength={5000} rows={5} value={draft.description} onChange={(event) => update('description', event.target.value)} className="field-input resize-y" /></label>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="space-y-1.5"><span className="field-label">尺寸</span><input value={draft.dimensions ?? ''} onChange={(event) => update('dimensions', event.target.value)} className="field-input" /></label>
        <label className="space-y-1.5"><span className="field-label">材料</span><input value={draft.materials ?? ''} onChange={(event) => update('materials', event.target.value)} className="field-input" /></label>
        <label className="space-y-1.5"><span className="field-label">制作周期</span><input value={draft.period ?? ''} onChange={(event) => update('period', event.target.value)} className="field-input" /></label>
        <label className="space-y-1.5"><span className="field-label">灵感来源</span><input value={draft.inspiration ?? ''} onChange={(event) => update('inspiration', event.target.value)} className="field-input" /></label>
        <label className="space-y-1.5 md:col-span-2"><span className="field-label">参与成员（逗号分隔）</span><input value={authors} onChange={(event) => setAuthors(event.target.value)} className="field-input" /></label>
      </section>

      <section className="space-y-4 border-t border-studio-line pt-6">
        <h3 className="section-title">图片</h3>
        <ImageField label="封面图" value={draft.coverUrl} progress={uploads.cover?.progress} message={uploads.cover?.message} onChange={(value) => update('coverUrl', value)} onUpload={(file) => void upload(file, 'cover', (url) => update('coverUrl', url))} />
        {draft.images.map((value, index) => {
          const slot = `gallery-${index}`;
          return <div key={index} className="flex items-end gap-2"><div className="flex-1"><ImageField label={`作品图片 ${index + 1}`} value={value} progress={uploads[slot]?.progress} message={uploads[slot]?.message} onChange={(url) => { const next = [...draft.images]; next[index] = url; update('images', next); }} onUpload={(file) => void upload(file, slot, (url) => { const next = [...draft.images]; next[index] = url; update('images', next); })} /></div><button type="button" onClick={() => update('images', draft.images.filter((_, itemIndex) => itemIndex !== index))} className="icon-button mb-0.5 h-10 min-h-10 w-10 text-studio-danger" title="删除图片"><Trash2 className="h-4 w-4" /></button></div>;
        })}
        <button type="button" onClick={() => update('images', [...draft.images, ''])} className="small-action"><Plus className="w-3.5 h-3.5" /> 添加作品图片</button>
      </section>

      <section className="space-y-4 border-t border-studio-line pt-6">
        <div className="flex justify-between items-center"><h3 className="section-title">空间与房间细节</h3><button type="button" onClick={() => update('rooms', [...(draft.rooms ?? []), { id: createUniqueId(), name: '', coverUrl: '', images: [], description: '', detailsList: [] }])} className="small-action"><Plus className="w-3.5 h-3.5" /> 添加空间</button></div>
        {(draft.rooms ?? []).map((room, roomIndex) => (
          <div key={room.id} className="ui-panel-muted space-y-4 p-4">
            <div className="flex justify-between"><span className="text-xs font-bold text-studio-ink">空间 {roomIndex + 1}</span><button type="button" onClick={() => update('rooms', draft.rooms?.filter((_, index) => index !== roomIndex))} className="text-studio-danger" title="删除空间"><Trash2 className="h-4 w-4" /></button></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><input required placeholder="空间名称" value={room.name} onChange={(event) => updateRoom(roomIndex, (current) => ({ ...current, name: event.target.value }))} className="field-input" /><textarea required placeholder="空间说明" value={room.description} onChange={(event) => updateRoom(roomIndex, (current) => ({ ...current, description: event.target.value }))} className="field-input" /></div>
            <ImageField label="空间封面" value={room.coverUrl} progress={uploads[`room-${room.id}-cover`]?.progress} message={uploads[`room-${room.id}-cover`]?.message} onChange={(url) => updateRoom(roomIndex, (current) => ({ ...current, coverUrl: url }))} onUpload={(file) => void upload(file, `room-${room.id}-cover`, (url) => updateRoom(roomIndex, (current) => ({ ...current, coverUrl: url })))} />
            <textarea rows={3} placeholder="细节清单，每行一项" value={room.detailsList?.join('\n') ?? ''} onChange={(event) => updateRoom(roomIndex, (current) => ({ ...current, detailsList: event.target.value.split('\n') }))} className="field-input" />
            {room.images.map((url, imageIndex) => {
              const slot = `room-${room.id}-image-${imageIndex}`;
              return <div key={imageIndex} className="flex items-end gap-2"><div className="flex-1"><ImageField label={`空间图片 ${imageIndex + 1}`} value={url} progress={uploads[slot]?.progress} message={uploads[slot]?.message} onChange={(value) => updateRoom(roomIndex, (current) => ({ ...current, images: current.images.map((item, index) => index === imageIndex ? value : item) }))} onUpload={(file) => void upload(file, slot, (value) => updateRoom(roomIndex, (current) => ({ ...current, images: current.images.map((item, index) => index === imageIndex ? value : item) })))} /></div><button type="button" onClick={() => updateRoom(roomIndex, (current) => ({ ...current, images: current.images.filter((_, index) => index !== imageIndex) }))} className="icon-button mb-0.5 h-10 min-h-10 w-10 text-studio-danger" title="删除空间图片"><Trash2 className="h-4 w-4" /></button></div>;
            })}
            <button type="button" onClick={() => updateRoom(roomIndex, (current) => ({ ...current, images: [...current.images, ''] }))} className="small-action"><Plus className="w-3.5 h-3.5" /> 添加空间图片</button>
          </div>
        ))}
      </section>

      <section className="space-y-4 border-t border-studio-line pt-6">
        <div className="flex justify-between items-center"><h3 className="section-title">制作阶段</h3><button type="button" onClick={() => update('worksteps', [...draft.worksteps, { id: createUniqueId(), name: '', status: 'NEXT', detail: '', images: [] }])} className="small-action"><Plus className="w-3.5 h-3.5" /> 添加阶段</button></div>
        {draft.worksteps.map((step, index) => {
          const slot = `step-${step.id}`;
          return (
            <div key={step.id} className="ui-panel-muted space-y-3 p-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <input required value={step.name} onChange={(event) => updateStep(index, (current) => ({ ...current, name: event.target.value }))} placeholder="阶段名称" className="field-input md:col-span-4" />
                <select value={step.status} onChange={(event) => updateStep(index, (current) => ({ ...current, status: event.target.value as WorkStep['status'] }))} className="field-input md:col-span-3"><option value="DONE">已完成</option><option value="ACTIVE">进行中</option><option value="NEXT">待开始</option></select>
                <input value={step.detail ?? ''} onChange={(event) => updateStep(index, (current) => ({ ...current, detail: event.target.value }))} placeholder="阶段说明" className="field-input md:col-span-4" />
                <button type="button" onClick={() => update('worksteps', draft.worksteps.filter((_, itemIndex) => itemIndex !== index))} className="justify-self-end text-studio-danger" title="删除阶段"><Trash2 className="h-4 w-4" /></button>
              </div>
              <ImageField label="阶段主图" value={step.image ?? ''} progress={uploads[slot]?.progress} message={uploads[slot]?.message} onChange={(url) => updateStep(index, (current) => ({ ...current, image: url, images: current.images?.length ? [url, ...current.images.slice(1)] : url ? [url] : [] }))} onUpload={(file) => void upload(file, slot, (url) => updateStep(index, (current) => ({ ...current, image: url, images: current.images?.length ? [url, ...current.images.slice(1)] : [url] })))} />
              <textarea rows={2} placeholder="更多过程图 URL，每行一张" value={step.images?.join('\n') ?? ''} onChange={(event) => updateStep(index, (current) => ({ ...current, images: event.target.value.split('\n'), image: event.target.value.split('\n').find(Boolean) ?? '' }))} className="field-input font-mono text-xs" />
            </div>
          );
        })}
      </section>

      <div className="flex justify-end gap-3 border-t border-studio-line pt-5">
        <button type="button" onClick={onCancel} className="button-secondary">取消</button>
        <button type="submit" disabled={saving} className="button-primary"><Save className="h-4 w-4" /> {saving ? '正在保存并等待确认' : '保存项目'}</button>
      </div>
    </form>
  );
}
