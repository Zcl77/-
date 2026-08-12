import { FormEvent, useState } from 'react';
import { KeyRound } from 'lucide-react';
import StatusNotice from '../ui/StatusNotice';

interface PasswordChangePanelProps {
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<unknown>;
}

export default function PasswordChangePanel({ onChangePassword }: PasswordChangePanelProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (newPassword !== confirmation) {
      setError('两次输入的新密码不一致。');
      return;
    }
    setSubmitting(true);
    try {
      await onChangePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmation('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '密码修改失败。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      className="mx-auto w-full max-w-lg border-y border-studio-line py-8"
      aria-labelledby="change-password-title"
    >
      <span className="page-kicker">First sign in</span>
      <h1 id="change-password-title" className="page-title mt-2">
        请先设置新密码
      </h1>
      <p className="page-description mt-3">
        当前密码是工作室交付的临时凭据。修改成功前，私人项目内容保持锁定。
      </p>
      {error && <StatusNotice tone="error" compact title="密码未修改" description={error} className="mt-6" />}
      <form onSubmit={submit} className="mt-7 space-y-5">
        <div>
          <label htmlFor="current-password" className="field-label">
            当前临时密码
          </label>
          <input
            id="current-password"
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            className="field-input"
          />
        </div>
        <div>
          <label htmlFor="new-password" className="field-label">
            新密码
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className="field-input"
          />
        </div>
        <div>
          <label htmlFor="confirm-password" className="field-label">
            再次输入新密码
          </label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            required
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            className="field-input"
          />
        </div>
        <button type="submit" disabled={submitting} className="button-primary w-full">
          <KeyRound className="h-4 w-4" />
          {submitting ? '正在修改' : '保存新密码并进入项目'}
        </button>
      </form>
    </section>
  );
}
