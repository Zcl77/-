import { useEffect, useState } from 'react';
import { QrCode, Save, Upload } from 'lucide-react';
import { StoredImage, StudioSettings } from '../../types';
import { UploadDestination } from '../../services/firebase/storageRepository';

interface StudioSettingsPanelProps {
  settings: StudioSettings;
  onSave: (settings: StudioSettings) => Promise<void>;
  onUploadAsset: (file: File, destination: UploadDestination, onProgress?: (value: number) => void) => Promise<StoredImage>;
}

export default function StudioSettingsPanel({ settings, onSave, onUploadAsset }: StudioSettingsPanelProps) {
  const [draft, setDraft] = useState(settings);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => setDraft(settings), [settings]);

  const upload = async (file: File) => {
    setMessage(null);
    setProgress(0);
    try {
      const asset = await onUploadAsset(file, { scope: 'settings', ownerId: 'studio', slot: 'wechat-qr' }, setProgress);
      setDraft((current) => ({ ...current, wechatQrUrl: asset.url, wechatQrAsset: asset }));
      setMessage('图片已上传到 Storage。点击“保存设置”后才会正式生效。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '图片上传失败。');
    } finally {
      setProgress(null);
    }
  };

  return (
    <div className="bg-white/70 border border-gf-tea/20 p-6 rounded space-y-5 max-w-3xl">
      <h3 className="font-serif text-xl font-bold">主理人联络设置</h3>
      {message && <div className="p-3 border border-gf-tea/20 bg-gf-rice/60 text-xs rounded">{message}</div>}
      <label className="block space-y-1.5">
        <span className="text-[10px] uppercase tracking-widest text-gf-tea font-mono font-bold">微信号</span>
        <input value={draft.wechatId} onChange={(event) => setDraft({ ...draft, wechatId: event.target.value })} maxLength={100} className="w-full border border-gf-tea/30 p-2 text-sm rounded" />
      </label>
      <div className="flex flex-col sm:flex-row gap-5 items-start">
        <div className="w-44 aspect-square border border-gf-tea/20 bg-white rounded flex items-center justify-center overflow-hidden">
          {draft.wechatQrUrl ? <img src={draft.wechatQrUrl} alt="主理人微信二维码" className="w-full h-full object-contain" /> : <QrCode className="w-12 h-12 text-gf-tea" />}
        </div>
        <div className="space-y-3">
          <label className="inline-flex items-center gap-2 px-4 py-2 bg-gf-wood text-gf-rice rounded text-xs cursor-pointer">
            <Upload className="w-4 h-4" /> 选择二维码图片
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" className="hidden" onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
              event.currentTarget.value = '';
            }} />
          </label>
          {progress !== null && <p className="text-xs text-gf-tea">上传中 {progress}%</p>}
          <p className="text-[11px] text-gf-tea max-w-sm leading-relaxed">新图片保存在 Firebase Storage；Firestore 仅记录下载 URL、对象路径、类型、大小和上传时间。</p>
        </div>
      </div>
      <button type="button" disabled={busy} onClick={() => void (async () => {
        setBusy(true);
        setMessage(null);
        try {
          await onSave({ ...draft, wechatId: draft.wechatId.trim() });
          setMessage('设置已保存并由 Firebase 确认。');
        } catch (error) {
          setMessage(error instanceof Error ? error.message : '设置保存失败。');
        } finally {
          setBusy(false);
        }
      })()} className="px-5 py-2 bg-gf-wood text-gf-rice rounded text-xs font-bold flex items-center gap-2 disabled:opacity-50">
        <Save className="w-4 h-4" /> {busy ? '保存中' : '保存设置'}
      </button>
    </div>
  );
}
