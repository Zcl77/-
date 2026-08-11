import { useEffect, useRef, useState } from 'react';
import { Check, Copy, QrCode, Upload, X } from 'lucide-react';
import { CraftsmanProfile, ImageEditContext } from '../../types';
import StatusNotice from '../ui/StatusNotice';

interface CraftsmanContactModalProps {
  name: string;
  profile?: CraftsmanProfile;
  profiles: Record<string, CraftsmanProfile>;
  isAdmin: boolean;
  isSelectedForEdit: boolean;
  onClose: () => void;
  onSelectForEdit: () => void;
  onUpdateProfiles?: (profiles: Record<string, CraftsmanProfile>) => Promise<void>;
  onUploadImage?: (file: File, context: ImageEditContext) => Promise<void>;
}

export default function CraftsmanContactModal({
  name,
  profile,
  profiles,
  isAdmin,
  isSelectedForEdit,
  onClose,
  onSelectForEdit,
  onUpdateProfiles,
  onUploadImage,
}: CraftsmanContactModalProps) {
  const [wechatIdInput, setWechatIdInput] = useState(profile?.wechatId ?? '');
  const [isCopied, setIsCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const wechatId = profile?.wechatId ?? '';
  const wechatQr = profile?.wechatQr ?? '';

  useEffect(() => {
    const previousActive = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      previousActive?.focus();
    };
  }, [onClose]);

  const copyWechatId = async () => {
    if (!wechatId) return;
    try {
      await navigator.clipboard.writeText(wechatId);
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 2000);
    } catch {
      setMessage('复制失败，请手动选择微信号。');
    }
  };

  const saveWechatId = async () => {
    if (!onUpdateProfiles || wechatIdInput.trim() === wechatId) return;
    setBusy(true);
    setMessage(null);
    try {
      await onUpdateProfiles({
        ...profiles,
        [name]: {
          name,
          wechatId: wechatIdInput.trim(),
          wechatQr,
          wechatQrAsset: profile?.wechatQrAsset,
        },
      });
      setMessage('微信号已保存并由 Firebase 确认。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '微信号保存失败。');
    } finally {
      setBusy(false);
    }
  };

  const uploadQr = async (file: File) => {
    if (!onUploadImage) return;
    setBusy(true);
    setMessage('二维码上传中。');
    try {
      await onUploadImage(file, { type: 'craftsman-qr', craftsmanName: name });
      setMessage('二维码已上传并保存。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '二维码上传失败。');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 p-4" role="dialog" aria-modal="true" aria-labelledby="craftsman-contact-title" onMouseDown={(event) => {
      if (event.currentTarget === event.target) onClose();
    }}>
      <div className="relative max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-[6px] border border-studio-line bg-studio-surface p-5 shadow-[var(--shadow-float)] md:p-6">
        <button ref={closeRef} type="button" onClick={onClose} className="icon-button absolute right-4 top-4" title="关闭" aria-label="关闭成员联系信息">
          <X className="h-4 w-4" />
        </button>

        <div className="border-b border-studio-line pb-4 pr-12">
          <span className="page-kicker">Craftsman contact</span>
          <h3 id="craftsman-contact-title" className="mt-2 font-serif text-xl font-semibold text-studio-ink">{name}</h3>
          <p className="mt-1 text-xs text-studio-muted">项目参与成员联络信息</p>
        </div>

        {message && <StatusNotice compact title={message} className="mt-5" />}

        <div className="mt-5">
          <span className="field-label">微信二维码</span>
          <button
            type="button"
            onClick={() => isAdmin && onSelectForEdit()}
            className={`relative mx-auto flex aspect-square w-44 flex-col items-center justify-center overflow-hidden rounded-[4px] border bg-studio-paper ${isAdmin ? 'cursor-pointer hover:border-studio-warning' : ''} ${isSelectedForEdit ? 'border-studio-warning ring-2 ring-studio-warning/50' : 'border-studio-line'}`}
          >
            {wechatQr ? (
              <img src={wechatQr} alt={`${name} 微信二维码`} className="h-full w-full object-contain p-2" referrerPolicy="no-referrer" loading="lazy" decoding="async" />
            ) : (
              <span className="p-4 text-center">
                <QrCode className="mx-auto mb-2 h-10 w-10 text-studio-paper-ink/40" />
                <span className="block text-[10px] text-studio-paper-ink/60">暂无二维码图片</span>
              </span>
            )}
            {isAdmin && <span className="absolute inset-x-0 bottom-0 bg-studio-canvas/95 py-1.5 text-center text-[10px] text-studio-ink">{isSelectedForEdit ? '已选中替换目标' : '点击选择替换目标'}</span>}
          </button>

          {isAdmin && (
            <div className="flex justify-center pt-3">
              <label className="button-secondary cursor-pointer">
                <Upload className="h-4 w-4" /> 选择并上传
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" disabled={busy} className="hidden" onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadQr(file);
                  event.currentTarget.value = '';
                }} />
              </label>
            </div>
          )}
        </div>

        <div className="mt-5">
          <span className="field-label">微信号</span>
          {isAdmin ? (
            <input
              type="text"
              value={wechatIdInput}
              maxLength={100}
              disabled={busy}
              onChange={(event) => setWechatIdInput(event.target.value)}
              onBlur={() => void saveWechatId()}
              placeholder="请输入成员微信号"
              className="field-input font-mono"
            />
          ) : (
            <button type="button" onClick={() => void copyWechatId()} disabled={!wechatId} className="button-secondary w-full justify-between">
              <span className="truncate font-mono text-sm">{wechatId || '暂无微信号信息'}</span>
              {wechatId && <span className="flex items-center gap-1 text-[10px] text-studio-muted">{isCopied ? <Check className="h-3.5 w-3.5 text-studio-success" /> : <Copy className="h-3.5 w-3.5" />}{isCopied ? '已复制' : '复制'}</span>}
            </button>
          )}
        </div>

        <p className="mt-5 border-t border-studio-line pt-4 text-center text-[10px] leading-5 text-studio-faint">{isAdmin ? '微信号在输入框失去焦点后保存；图片写入 Storage 和 Firestore 后才会生效。' : '联络信息由工作室后台维护。'}</p>
      </div>
    </div>
  );
}
