import { FirebaseError } from 'firebase/app';

const FRIENDLY_MESSAGES: Record<string, string> = {
  'auth/popup-closed-by-user': '登录窗口已关闭。',
  'auth/cancelled-popup-request': '登录请求已取消。',
  'auth/network-request-failed': '网络连接失败，请检查网络后重试。',
  'permission-denied': '权限不足，操作已被 Firebase 安全规则拒绝。',
  'storage/unauthorized': '没有上传或删除该图片的权限。',
  'storage/retry-limit-exceeded': '图片上传超时，请稍后重试。',
};

export function getErrorMessage(error: unknown, fallback = '操作失败，请稍后重试。'): string {
  if (error instanceof FirebaseError) {
    return FRIENDLY_MESSAGES[error.code] ?? `${fallback}（${error.code}）`;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
