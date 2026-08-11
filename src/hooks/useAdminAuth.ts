import { useCallback, useEffect, useState } from 'react';
import {
  AdminAuthSnapshot,
  observeAdminAuth,
  signInAsAdmin,
  signOutAdmin,
} from '../services/firebase/authRepository';
import { getErrorMessage } from '../services/firebase/errors';

const INITIAL_AUTH: AdminAuthSnapshot = { status: 'checking', user: null };

export function useAdminAuth() {
  const [authState, setAuthState] = useState<AdminAuthSnapshot>(INITIAL_AUTH);

  useEffect(() => observeAdminAuth(setAuthState), []);

  const login = useCallback(async () => {
    setAuthState({ status: 'signing-in', user: null });
    try {
      const user = await signInAsAdmin();
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
      await signOutAdmin();
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
