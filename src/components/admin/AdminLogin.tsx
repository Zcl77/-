import { LogIn } from 'lucide-react';
import { AdminAuthSnapshot } from '../../services/firebase/authRepository';
import StatusNotice from '../ui/StatusNotice';

interface AdminLoginProps {
  authState: AdminAuthSnapshot;
  onLogin: () => Promise<void>;
}

export default function AdminLogin({ authState, onLogin }: AdminLoginProps) {
  const busy = authState.status === 'checking' || authState.status === 'signing-in';

  return (
    <div className="flex min-h-dvh items-center justify-center bg-studio-canvas p-4 md:p-8">
      <div className="w-full max-w-sm rounded-[6px] border border-studio-line bg-studio-surface p-6 shadow-[var(--shadow-float)] md:p-8">
        <div className="border-b border-studio-line pb-5 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-[4px] bg-studio-brass font-serif text-xl font-semibold text-studio-canvas">知</span>
          <h2 className="mt-4 font-serif text-xl font-semibold text-studio-ink">知行造境管理后台</h2>
          <p className="mt-1 text-[10px] uppercase text-studio-muted">Zhixing Studio Admin</p>
        </div>

        {(authState.status === 'forbidden' || authState.status === 'error') && (
          <StatusNotice compact tone="error" title="身份验证失败" description={authState.message ?? '当前账号没有管理员权限。'} className="mt-5" />
        )}

        <p className="mt-5 text-center text-xs leading-6 text-studio-muted">
          Google 登录仅用于验证身份。只有 ID Token 含 <code className="font-mono text-studio-ink">admin: true</code> Claim 的账号可以进入。
        </p>

        <button
          type="button"
          onClick={() => void onLogin()}
          disabled={busy}
          className="button-primary mt-6 w-full"
        >
          <LogIn className="h-4 w-4" />
          {authState.status === 'checking' ? '正在检查登录状态' : authState.status === 'signing-in' ? '正在验证管理员权限' : '使用 Google 登录'}
        </button>
      </div>
    </div>
  );
}
