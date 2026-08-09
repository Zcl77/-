import { useCallback, useEffect, useState } from 'react';
import { AdminAuthSnapshot, loadStudioBackend } from '../services/backend';
import { getErrorMessage } from '../services/backend/errors';

const INITIAL_AUTH: AdminAuthSnapshot = { status: 'checking', user: null };

export function useAdminAuth() {
  const [authState, setAuthState] = useState<AdminAuthSnapshot>(INITIAL_AUTH);

  useEffect(() => {
    let active = true;
    let unsubscribe: () => void = () => undefined;
    void loadStudioBackend()
      .then((backend) => {
        if (active) unsubscribe = backend.auth.observe(setAuthState);
      })
      .catch((error: unknown) => {
        if (active) {
          setAuthState({
            status: 'error',
            user: null,
            message: getErrorMessage(error, '管理员认证初始化失败。'),
          });
        }
      });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const login = useCallback(async () => {
    setAuthState({ status: 'signing-in', user: null });
    try {
      const backend = await loadStudioBackend();
      const user = await backend.auth.signIn();
      setAuthState({ status: 'authorized', user });
    } catch (error) {
      const forbidden = error instanceof Error && error.name === 'AdminClaimRequiredError';
      setAuthState({
        status: forbidden ? 'forbidden' : 'error',
        user: null,
        message: getErrorMessage(error, '登录失败。'),
      });
    }
  }, []);

  const logout = useCallback(async () => {
    setAuthState((current) => ({ ...current, status: 'signing-out' }));
    try {
      const backend = await loadStudioBackend();
      await backend.auth.signOut();
      setAuthState({ status: 'signed-out', user: null });
    } catch (error) {
      setAuthState((current) => ({
        ...current,
        status: 'error',
        message: getErrorMessage(error, '退出登录失败。'),
      }));
    }
  }, []);

  return {
    authState,
    isAdmin: authState.status === 'authorized',
    login,
    logout,
  };
}
