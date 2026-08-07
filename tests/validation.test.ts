import { describe, expect, it } from 'vitest';
import { hasAdminClaim } from '../src/domain/auth';
import { createUniqueId, validateImageFile, validateProject, validateReviewInput } from '../src/domain/validation';
import { applyProjectVisibility, getPublicProjects } from '../src/domain/visibility';
import { Project } from '../src/types';

const project: Project = {
  id: 'stable-project-id',
  title: '张园建筑微缩',
  scale: '1:64',
  category: '建筑微缩',
  status: 'WIP',
  visibility: 'public',
  description: '项目说明',
  timeSpent: 10,
  createdAt: '2026-08-06T00:00:00.000Z',
  completionPercent: 20,
  coverUrl: 'https://example.com/cover.jpg',
  images: [],
  worksteps: [],
};

describe('administrator claims', () => {
  it('requires the explicit boolean admin claim', () => {
    expect(hasAdminClaim({ admin: true, email_verified: true })).toBe(true);
    expect(hasAdminClaim({ admin: 'true', email_verified: true })).toBe(false);
    expect(hasAdminClaim({ email_verified: true })).toBe(false);
  });
});

describe('unique IDs', () => {
  it('creates rule-compatible UUIDs without depending on a title', () => {
    const first = createUniqueId();
    const second = createUniqueId();
    expect(first).toMatch(/^[a-zA-Z0-9_-]+$/);
    expect(second).not.toBe(first);
  });
});

describe('review validation', () => {
  it('accepts a valid 1-5 integer rating', () => {
    expect(validateReviewInput({ reviewerName: '访客', rating: 5, projectName: '张园', comment: '细节很好。' })).toEqual([]);
  });

  it('rejects fractional/out-of-range ratings and oversized text', () => {
    expect(validateReviewInput({ reviewerName: 'a'.repeat(51), rating: 4.5, projectName: '张园', comment: 'x'.repeat(1001) })).toEqual([
      '昵称不能超过 50 个字符。',
      '评分必须是 1–5 的整数。',
      '评鉴内容不能超过 1000 个字符。',
    ]);
  });
});

describe('project visibility and validation', () => {
  it('keeps hidden categories out of every public project list', () => {
    const hiddenProject = { ...project, id: 'hidden', category: '未公开' };
    expect(getPublicProjects([project, hiddenProject], ['未公开'])).toEqual([project]);
  });

  it('defaults legacy cached projects without visibility to hidden', () => {
    const legacyProject = { ...project, visibility: undefined } as unknown as Project;
    expect(getPublicProjects([legacyProject], [])).toEqual([]);
  });

  it('forces hidden categories without widening an explicitly hidden project', () => {
    expect(applyProjectVisibility(project, ['建筑微缩']).visibility).toBe('hidden');
    expect(applyProjectVisibility({ ...project, visibility: 'hidden' }, []).visibility).toBe('hidden');
  });

  it('keeps an existing stable ID valid while titles change', () => {
    expect(validateProject({ ...project, title: '新的中文标题' })).toEqual([]);
    expect(project.id).toBe('stable-project-id');
  });
});

describe('image validation', () => {
  it('allows supported images and rejects SVG/oversized files', () => {
    expect(validateImageFile({ type: 'image/png', size: 1024 } as File)).toBeNull();
    expect(validateImageFile({ type: 'image/svg+xml', size: 1024 } as File)).toContain('仅支持');
    expect(validateImageFile({ type: 'image/jpeg', size: 10 * 1024 * 1024 + 1 } as File)).toContain('10 MB');
  });
});
