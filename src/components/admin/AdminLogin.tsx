import { LogIn, ShieldAlert } from 'lucide-react';
import { AdminAuthSnapshot } from '../../services/firebase/authRepository';

interface AdminLoginProps {
  authState: AdminAuthSnapshot;
  onLogin: () => Promise<void>;
}

export default function AdminLogin({ authState, onLogin }: AdminLoginProps) {
  const busy = authState.status === 'checking' || authState.status === 'signing-in';

  return (
    <div className="flex-1 min-h-screen p-4 md:p-8 flex items-center justify-center macro-gradient text-gf-wood">
      <div className="bg-gf-rice/90 border border-gf-sand p-8 rounded shadow-2xl max-w-sm w-full space-y-6 text-left">
        <div className="text-center space-y-2 border-b border-gf-tea/20 pb-5">
          <span className="w-12 h-12 bg-gf-wood text-gf-rice font-serif text-2xl flex items-center justify-center rounded-full mx-auto shadow">知</span>
          <h2 className="text-xl font-serif font-bold">知行造境管理后台</h2>
          <p className="text-[10px] text-gf-tea font-mono uppercase tracking-widest">Zhixing Studio Admin</p>
        </div>

        {(authState.status === 'forbidden' || authState.status === 'error') && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{authState.message ?? '身份验证失败。'}</span>
          </div>
        )}

        <p className="text-xs leading-relaxed text-gf-tea text-center">
          Google 登录只用于确认身份。仅 ID Token 中含有 <code className="font-mono">admin: true</code> Claim 的账号可以进入后台。
        </p>

        <button
          type="button"
          onClick={() => void onLogin()}
          disabled={busy}
          className="w-full py-2.5 bg-gf-wood text-gf-rice font-serif font-semibold rounded transition-colors shadow-md text-xs tracking-widest flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-wait"
        >
          <LogIn className="w-4 h-4" />
          {authState.status === 'checking' ? '正在检查登录状态' : authState.status === 'signing-in' ? '正在验证管理员权限' : '使用 Google 登录'}
        </button>
      </div>
    </div>
  );
}
