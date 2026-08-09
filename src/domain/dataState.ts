export type LoadedDataStatus = 'ready' | 'empty';
export type FailedDataStatus = 'stale' | 'error';

export function resolveLoadedDataStatus(projectCount: number): LoadedDataStatus {
  return projectCount > 0 ? 'ready' : 'empty';
}

export function resolveFailedDataStatus(hasCachedProjects: boolean): FailedDataStatus {
  return hasCachedProjects ? 'stale' : 'error';
}
