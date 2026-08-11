import { useCallback, useEffect, useState } from 'react';
import {
  changePassword as requestPasswordChange,
  getCurrentUser,
  login as requestLogin,
  logout as requestLogout,
} from '../services/api/repositories';
import { CurrentUser } from '../types';

export function useSessionAuth() {
  const [user, setUser] = useState<CurrentUser>({ authenticated: false });
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      setUser(await getCurrentUser());
      setStatus('ready');
    } catch (reason) {
      setUser({ authenticated: false });
      setError(reason instanceof Error ? reason.message : '登录状态检查失败。');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
