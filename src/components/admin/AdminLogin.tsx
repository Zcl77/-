import { LogIn } from 'lucide-react';
import { AdminAuthSnapshot } from '../../services/backend';
import StatusNotice from '../ui/StatusNotice';

interface AdminLoginProps {
  authState: AdminAuthSnapshot;
  dataSourceLabel: string;
  onLogin: () => Promise<void>;
}

export default function AdminLogin({ authState, dataSourceLabel, onLogin }: AdminLoginProps) {
  const busy = authState.status === 'checking' || authState.status === 'signing-in';
  const unavailable = authState.status === 'unavailable';

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

        {unavailable && (
          <StatusNotice compact title="当前为本地演示模式" description={authState.message} className="mt-5" />
        )}

        <p className="mt-5 text-center text-xs leading-6 text-studio-muted">
          当前数据源：{dataSourceLabel}。生产后台必须由服务端验证身份和管理员权限，前端状态不能自行授权。
        </p>

        <button
          type="button"
          onClick={() => void onLogin()}
          disabled={busy || unavailable}
          className="button-primary mt-6 w-full"
        >
          <LogIn className="h-4 w-4" />
          {unavailable ? '当前数据源不提供登录' : authState.status === 'checking' ? '正在检查登录状态' : authState.status === 'signing-in' ? '正在验证管理员权限' : '管理员登录'}
        </button>
      </div>
    </div>
  );
}
