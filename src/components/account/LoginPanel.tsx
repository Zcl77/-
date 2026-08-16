import { FormEvent, useState } from 'react';
import { KeyRound, LogIn, ShieldCheck } from 'lucide-react';
import StatusNotice from '../ui/StatusNotice';
import { useI18n } from '../../i18n';

interface LoginPanelProps {
  onLogin: (username: string, password: string) => Promise<{ next: string }>;
  onCustomerLogin: () => void;
  notice?: string | null;
}

export default function LoginPanel({ onLogin, onCustomerLogin, notice }: LoginPanelProps) {
  const { t, errorMessage } = useI18n();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await onLogin(username.trim(), password);
      setPassword('');
      if (result.next === '/admin/') {
        window.location.assign('/admin/');
      } else {
        onCustomerLogin();
      }
    } catch (reason) {
      setError(errorMessage(reason, '登录失败，请稍后重试。'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="page-inner flex min-h-[calc(100dvh-4.5rem)] items-center py-10 lg:min-h-dvh">
        <section
          className="mx-auto w-full max-w-md border-y border-studio-line py-8"
          aria-labelledby="customer-login-title"
        >
          <span className="page-kicker">{t('私人项目访问')}</span>
          <h1 id="customer-login-title" className="page-title mt-2">
            {t('客户项目登录')}
          </h1>
          <p className="page-description mt-3">
            {t('登录后只显示工作室明确绑定给您的订单、制作阶段、私人图片和留言。')}
          </p>

          <div className="mt-6 flex gap-3 border-l border-studio-line pl-4 text-xs leading-6 text-studio-muted">
            <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-studio-brass" aria-hidden="true" />
            <p>{t('账号由工作室创建并线下交付。本站不使用 Google 登录，也不会在浏览器长期保存登录令牌。')}</p>
          </div>

          {(error || notice) && (
            <StatusNotice
              tone="error"
              compact
              title={t('登录未完成')}
              description={error || notice || undefined}
              className="mt-6"
            />
          )}

          <form onSubmit={submit} className="mt-7 space-y-5">
            <div>
              <label htmlFor="login-username" className="field-label">
                {t('用户名')}
              </label>
              <input
                id="login-username"
                name="username"
                autoComplete="username"
                required
                maxLength={18}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="field-input"
              />
              <p className="mt-2 text-[11px] text-studio-faint">{t('用户名最多 18 个字符。')}</p>
            </div>
            <div>
              <label htmlFor="login-password" className="field-label">
                {t('密码')}
              </label>
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="field-input"
              />
            </div>
            <button type="submit" disabled={submitting} className="button-primary w-full">
              {submitting ? <KeyRound className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
              {t(submitting ? '正在安全登录' : '登录我的项目')}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
