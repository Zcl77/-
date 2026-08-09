import { StudioBackend } from './contracts';
import { assertFirebaseEnvironment, getDataProvider } from './runtimeConfig';

let backendPromise: Promise<StudioBackend> | undefined;

export function loadStudioBackend(): Promise<StudioBackend> {
  if (!backendPromise) {
    const provider = getDataProvider();
    backendPromise = provider === 'firebase'
      ? (async () => {
        assertFirebaseEnvironment();
        return (await import('./firebaseBackend')).firebaseBackend;
      })()
      : import('./mockBackend').then((module) => module.mockBackend);
  }
  return backendPromise;
}

export { getDataProvider } from './runtimeConfig';
export type {
  AdminAuthSnapshot,
  AdminIdentity,
  DataProvider,
  StudioBackend,
  UploadDestination,
} from './contracts';
