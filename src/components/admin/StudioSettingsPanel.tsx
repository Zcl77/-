import { useEffect, useState } from 'react';
import { QrCode, Save, Upload } from 'lucide-react';
import { UploadDestination } from '../../services/backend';
import { StoredImage, StudioSettings } from '../../types';
import StatusNotice from '../ui/StatusNotice';

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
      setMessage('图片已上传到媒体存储。点击“保存设置”后才会正式生效。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '图片上传失败。');
    } finally {
      setProgress(null);
    }
  };

  const save = async () => {
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
  };

  return (
    <section className="max-w-3xl" aria-labelledby="studio-settings-title">
      <h2 id="studio-settings-title" className="section-heading">工作室联络设置</h2>
      <p className="mt-1 text-xs leading-6 text-studio-muted">这些信息会显示在访客评论与联系页面。图片上传成功后仍需保存设置。</p>

      {message && <StatusNotice compact title={message} className="mt-5" />}

      <div className="ui-panel mt-6 p-5 md:p-6">
        <label className="block">
          <span className="field-label">微信号</span>
          <input value={draft.wechatId} onChange={(event) => setDraft({ ...draft, wechatId: event.target.value })} maxLength={100} className="field-input" />
        </label>

        <div className="mt-6 flex flex-col items-start gap-6 border-t border-studio-line pt-6 sm:flex-row">
          <div className="flex aspect-square w-44 shrink-0 items-center justify-center overflow-hidden rounded-[4px] border border-studio-line bg-studio-paper">
            {draft.wechatQrUrl ? <img src={draft.wechatQrUrl} alt="工作室微信二维码预览" className="h-full w-full object-contain p-2" referrerPolicy="no-referrer" loading="lazy" decoding="async" /> : <QrCode className="h-12 w-12 text-studio-paper-ink/45" />}
          </div>
          <div className="min-w-0 flex-1">
            <span className="field-label">二维码图片</span>
            <label className="button-secondary cursor-pointer">
              <Upload className="h-4 w-4" />选择图片
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" disabled={progress !== null} className="hidden" onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void upload(file);
                event.currentTarget.value = '';
              }} />
            </label>
            {progress !== null && (
              <div className="mt-4" role="status" aria-live="polite">
                <div className="flex justify-between text-[10px] text-studio-muted"><span>上传中</span><span>{progress}%</span></div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-studio-line"><div className="h-full bg-studio-brass" style={{ width: `${progress}%` }} /></div>
              </div>
            )}
            <p className="mt-4 max-w-md text-xs leading-6 text-studio-muted">新图片保存到 Firebase Storage；Firestore 仅记录下载 URL、对象路径、类型、大小和上传时间。</p>
          </div>
        </div>

        <div className="mt-6 flex justify-end border-t border-studio-line pt-5">
          <button type="button" disabled={busy || progress !== null} onClick={() => void save()} className="button-primary"><Save className="h-4 w-4" />{busy ? '正在保存并等待确认' : '保存设置'}</button>
        </div>
      </div>
    </section>
  );
}
