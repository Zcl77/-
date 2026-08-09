import { describe, expect, it } from 'vitest';
import { resolveFailedDataStatus, resolveLoadedDataStatus } from '../src/domain/dataState';
import { mockBackend } from '../src/services/backend/mockBackend';
import { resolveDataProvider, RuntimeConfigError } from '../src/services/backend/runtimeConfig';

describe('data provider configuration', () => {
  it('uses mock locally and Firebase for production when no provider is declared', () => {
    expect(resolveDataProvider(undefined, true)).toBe('mock');
    expect(resolveDataProvider(undefined, false)).toBe('firebase');
  });

  it('rejects unknown providers instead of silently choosing one', () => {
    expect(() => resolveDataProvider('unknown', true)).toThrow(RuntimeConfigError);
  });
});

describe('local demo adapter', () => {
  it('publishes the explicit demo dataset without Firebase configuration', async () => {
    let projectCount = -1;
    let reviewCount = -1;
    const unsubscribe = mockBackend.content.subscribe(false, {
      onProjects: (projects) => { projectCount = projects.length; },
      onReviews: (reviews) => { reviewCount = reviews.length; },
      onCategories: () => undefined,
      onHiddenCategories: () => undefined,
      onCraftsmen: () => undefined,
      onSettings: () => undefined,
      onError: () => undefined,
    });

    await new Promise<void>((resolve) => queueMicrotask(resolve));
    unsubscribe();

    expect(projectCount).toBeGreaterThan(0);
    expect(reviewCount).toBeGreaterThan(0);
  });

  it('keeps new visitor comments pending', async () => {
    const id = await mockBackend.reviews.submit({
      reviewerName: '本地访客',
      rating: 5,
      projectName: '工作室总体打分',
      comment: '用于验证本地适配器的测试评论。',
    });
    expect(id).toMatch(/^[a-zA-Z0-9_-]+$/);
  });
});

describe('studio data states', () => {
  it('distinguishes a valid empty response from loaded projects', () => {
    expect(resolveLoadedDataStatus(0)).toBe('empty');
    expect(resolveLoadedDataStatus(3)).toBe('ready');
  });

  it('distinguishes a stale cache from a blocking request failure', () => {
    expect(resolveFailedDataStatus(true)).toBe('stale');
    expect(resolveFailedDataStatus(false)).toBe('error');
  });
});
