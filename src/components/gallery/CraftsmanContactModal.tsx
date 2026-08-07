import { useState } from 'react';
import { Check, Copy, QrCode, Upload, X } from 'lucide-react';
import { CraftsmanProfile, ImageEditContext } from '../../types';

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
  const wechatId = profile?.wechatId ?? '';
  const wechatQr = profile?.wechatQr ?? '';

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
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4 animate-fade-in text-gf-wood font-sans">
      <div className="bg-gf-rice border border-gf-sand p-6 rounded shadow-2xl max-w-sm w-full relative space-y-4 text-left">
        <button type="button" onClick={onClose} className="absolute top-4 right-4 text-gf-tea hover:text-gf-wood transition-colors cursor-pointer" title="关闭">
          <X className="w-5 h-5" />
        </button>

        <div className="border-b border-gf-tea/20 pb-3">
          <span className="text-[10px] uppercase tracking-widest text-gf-tea block font-mono font-bold">筑造成员 Signature Panel</span>
          <h3 className="text-xl font-serif text-gf-wood font-bold mt-1">参与成员：{name}</h3>
          <p className="text-[11px] text-gf-tea/80 mt-0.5 font-light">项目参与成员联络信息</p>
        </div>

        {message && <div className="p-2.5 bg-white/70 border border-gf-tea/20 text-xs rounded">{message}</div>}

        <div className="space-y-2">
          <span className="text-[9px] uppercase tracking-wider text-gf-wood font-mono block">微信二维码 WeChat QR Code</span>
          <button
            type="button"
            onClick={() => isAdmin && onSelectForEdit()}
            className={`aspect-square w-44 mx-auto border rounded relative overflow-hidden flex flex-col items-center justify-center bg-white ${isAdmin ? 'cursor-pointer hover:border-amber-500 hover:ring-2 hover:ring-amber-200' : ''} ${isSelectedForEdit ? 'border-amber-500 ring-4 ring-amber-400/30' : 'border-gf-tea/15'}`}
          >
            {wechatQr ? (
              <img src={wechatQr} alt={`${name} 微信二维码`} className="w-full h-full object-contain p-2" referrerPolicy="no-referrer" />
            ) : (
              <span className="text-center p-4">
                <QrCode className="w-12 h-12 text-gf-tea/40 mx-auto mb-1" />
                <span className="text-[10px] text-gf-tea/60 block font-mono">暂无二维码图片</span>
              </span>
            )}
            {isAdmin && <span className="absolute inset-x-0 bottom-0 bg-stone-900/95 text-[10px] text-gf-sand py-1 text-center">{isSelectedForEdit ? '已选中为替换目标' : '点击选择替换目标'}</span>}
          </button>

          {isAdmin && (
            <div className="flex justify-center pt-1.5">
              <label className="flex items-center gap-1.5 px-3 py-1 bg-gf-wood text-gf-rice rounded text-[10px] cursor-pointer transition-colors shadow-xs">
                <Upload className="w-3.5 h-3.5" /> 选择并上传
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" disabled={busy} className="hidden" onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadQr(file);
                  event.currentTarget.value = '';
                }} />
              </label>
            </div>
          )}
        </div>

        <div className="space-y-1">
          <span className="text-[9px] uppercase tracking-wider text-gf-wood font-mono block">微信号 WeChat ID</span>
          {isAdmin ? (
            <input
              type="text"
              value={wechatIdInput}
              maxLength={100}
              disabled={busy}
              onChange={(event) => setWechatIdInput(event.target.value)}
              onBlur={() => void saveWechatId()}
              placeholder="请输入成员微信号"
              className="w-full px-2.5 py-1.5 bg-white border border-gf-tea/30 rounded text-xs text-gf-wood font-mono focus:outline-none focus:ring-1 focus:ring-gf-wood disabled:opacity-60"
            />
          ) : (
            <button type="button" onClick={() => void copyWechatId()} className="w-full p-2 border border-gf-tea/15 bg-white rounded flex items-center justify-between hover:bg-gf-wood/5 transition-colors group">
              <span className="text-sm font-bold font-mono text-gf-wood truncate">{wechatId || '暂无微信号信息'}</span>
              {wechatId && <span className="text-[10px] text-gf-tea group-hover:text-gf-wood flex items-center gap-1">{isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}{isCopied ? '已复制' : '复制'}</span>}
            </button>
          )}
        </div>

        <p className="pt-2 text-center text-[10px] text-gf-tea/60 leading-relaxed">{isAdmin ? '微信号在输入框失去焦点后保存；图片写入 Storage 和 Firestore 后才会生效。' : '联络信息由工作室后台维护。'}</p>
      </div>
    </div>
  );
}
