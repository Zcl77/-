import {
  GoogleAuthProvider,
  User,
  getIdTokenResult,
  onIdTokenChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { hasAdminClaim } from '../../domain/auth';
import { auth } from './client';

export type AdminAuthStatus =
  | 'checking'
  | 'signed-out'
  | 'signing-in'
  | 'authorized'
  | 'forbidden'
  | 'signing-out'
  | 'error';

export interface AdminAuthSnapshot {
  status: AdminAuthStatus;
  user: User | null;
  message?: string;
}

export class AdminClaimRequiredError extends Error {
  constructor() {
    super('该 Google 账号没有管理员 Claim，后台访问已拒绝。');
    this.name = 'AdminClaimRequiredError';
  }
}

export function observeAdminAuth(listener: (snapshot: AdminAuthSnapshot) => void): () => void {
  return onIdTokenChanged(auth, async (user) => {
    if (!user) {
      listener({ status: 'signed-out', user: null });
      return;
    }

    try {
      const token = await getIdTokenResult(user);
      if (auth.currentUser?.uid !== user.uid) return;
      if (hasAdminClaim(token.claims)) {
        listener({ status: 'authorized', user });
      } else {
        await signOut(auth);
        listener({
          status: 'forbidden',
          user: null,
          message: '账号已通过 Google 验证，但未配置管理员权限。',
        });
      }
    } catch (error) {
      if (auth.currentUser?.uid !== user.uid) return;
      try {
        await signOut(auth);
      } catch {
        // Access remains denied even when Firebase cannot complete the cleanup request.
      }
      listener({
        status: 'error',
        user: null,
        message: error instanceof Error ? error.message : '管理员权限检查失败。',
      });
    }
  });
}

export async function signInAsAdmin(): Promise<User> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  const token = await getIdTokenResult(result.user, true);
  if (!hasAdminClaim(token.claims)) {
    await signOut(auth);
    throw new AdminClaimRequiredError();
  }
  return result.user;
}

export function signOutAdmin(): Promise<void> {
  return signOut(auth);
}
