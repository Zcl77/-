import { describe, expect, it } from 'vitest';
import {
  buildVisibilityPreflight,
  createRemoteWriteGuard,
  decideProjectVisibility,
  formatVisibilityPreflight,
  isApplyRequested,
} from '../scripts/migration-visibility.mjs';

describe('migration apply guard', () => {
  it('defaults to dry-run unless the exact --apply flag is present', () => {
    expect(isApplyRequested([])).toBe(false);
    expect(isApplyRequested(['--project', 'demo'])).toBe(false);
    expect(isApplyRequested(['--apply=true'])).toBe(false);
    expect(isApplyRequested(['--apply'])).toBe(true);
  });

  it('blocks remote write callbacks in dry-run mode', async () => {
    let writeAttempted = false;
    const writeRemote = createRemoteWriteGuard(false);

    await expect(writeRemote(() => {
      writeAttempted = true;
    })).rejects.toThrow('dry-run 模式禁止执行远程写入');
    expect(writeAttempted).toBe(false);
  });

  it('allows remote write callbacks only after explicit apply mode', async () => {
    const writeRemote = createRemoteWriteGuard(true);
    await expect(writeRemote(async () => 'written')).resolves.toBe('written');
  });
});

describe('legacy project visibility migration', () => {
  it('defaults a project without visibility to hidden', () => {
    const decision = decideProjectVisibility({ title: '旧项目', category: '公开分类' }, []);

    expect(decision.targetVisibility).toBe('hidden');
    expect(decision.missingVisibility).toBe(true);
    expect(decision.expandsPublicScope).toBe(false);
  });

  it('keeps only explicitly public projects in non-hidden categories public', () => {
    expect(decideProjectVisibility({ visibility: 'public', category: '公开分类' }, []).targetVisibility)
      .toBe('public');
    expect(decideProjectVisibility({ visibility: 'public', category: '隐藏分类' }, ['隐藏分类']).targetVisibility)
      .toBe('hidden');
    expect(decideProjectVisibility({ visibility: 'hidden', category: '公开分类' }, []).targetVisibility)
      .toBe('hidden');
    expect(decideProjectVisibility({ visibility: 'legacy', category: '公开分类' }, []).targetVisibility)
      .toBe('hidden');
  });

  it('reports every requested visibility category without expanding public scope', () => {
    const report = buildVisibilityPreflight([
      { id: 'public-project', data: { title: '公开作品', category: '公开分类', visibility: 'public' } },
      { id: 'missing-project', data: { title: '旧作品', category: '公开分类' } },
      { id: 'hidden-category-project', data: { title: '隐藏分类作品', category: '隐藏分类', visibility: 'public' } },
      { id: 'hidden-project', data: { title: '已隐藏作品', category: '公开分类', visibility: 'hidden' } },
    ], ['隐藏分类']);

    expect(report.keepsPublic.map((entry) => entry.id)).toEqual(['public-project']);
    expect(report.setsHidden.map((entry) => entry.id)).toEqual(['missing-project', 'hidden-category-project']);
    expect(report.missingVisibility.map((entry) => entry.id)).toEqual(['missing-project']);
    expect(report.expandsPublicScope).toEqual([]);

    const output = formatVisibilityPreflight(report);
    expect(output).toContain('保持公开（1）');
    expect(output).toContain('将被设为隐藏（2）');
    expect(output).toContain('缺少 visibility 字段（1）');
    expect(output).toContain('扩大公开范围：否（0）');
  });
});
