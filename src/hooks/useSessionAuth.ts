import { useCallback, useEffect, useRef, useState } from 'react';
import {
  changePassword as requestPasswordChange,
  getCurrentUser,
  login as requestLogin,
  logout as requestLogout,
} from '../services/api/repositories';
import { CurrentUser } from '../types';
import { useI18n } from '../i18n';

export function useSessionAuth() {
  const { t, errorMessage } = useI18n();
  const [user, setUser] = useState<CurrentUser>({ authenticated: false });
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const errorMessageRef = useRef(errorMessage);

  useEffect(() => {
    errorMessageRef.current = errorMessage;
  }, [errorMessage]);

  const refresh = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      setUser(await getCurrentUser());
      setStatus('ready');
    } catch (reason) {
      setUser({ authenticated: false });
      setError(errorMessageRef.current(reason, '登录状态检查失败。'));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const expire = () => {
      setUser({ authenticated: false });
      setStatus('ready');
      setError(t('登录状态已过期，请重新登录。'));
    };
    window.addEventListener('zhixing:session-expired', expire);
    return () => window.removeEventListener('zhixing:session-expired', expire);
  }, [t]);

  const login = useCallback(async (username: string, password: string) => {
    const result = await requestLogin(username, password);
    setUser(result.user);
    setStatus('ready');
    setError(null);
    return result;
  }, []);

  const logout = useCallback(async () => {
    await requestLogout();
    setUser({ authenticated: false });
    setStatus('ready');
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const result = await requestPasswordChange(currentPassword, newPassword);
    setUser(result.user);
    return result.user;
  }, []);

  return { user, status, error, login, logout, changePassword, refresh };
}
