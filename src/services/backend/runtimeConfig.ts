import { DataProvider } from './contracts';

export class RuntimeConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RuntimeConfigError';
  }
}

export function resolveDataProvider(value: string | undefined, isDevelopment: boolean): DataProvider {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return isDevelopment ? 'mock' : 'firebase';
  if (normalized === 'mock' || normalized === 'firebase') return normalized;
  throw new RuntimeConfigError('VITE_DATA_PROVIDER 只能设置为 "mock" 或 "firebase"。');
}

export function getDataProvider(): DataProvider {
  return resolveDataProvider(import.meta.env.VITE_DATA_PROVIDER, import.meta.env.DEV);
}

export function assertFirebaseEnvironment(): void {
  const required = {
    VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
    VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    VITE_FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    VITE_FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
  };
  const missing = Object.entries(required)
    .filter(([, value]) => !value?.trim())
    .map(([key]) => key);
  if (missing.length > 0) {
    throw new RuntimeConfigError(`Firebase 环境变量缺失：${missing.join(', ')}`);
  }
}
