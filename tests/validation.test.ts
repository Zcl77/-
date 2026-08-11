import { describe, expect, it } from 'vitest';
import { validateImageFile, validateReviewInput } from '../src/domain/validation';

describe('review validation', () => {
  it('accepts a valid 1-5 integer rating', () => {
    expect(
      validateReviewInput({ reviewerName: '访客', rating: 5, projectName: '张园', comment: '细节很好。' }),
    ).toEqual([]);
  });

  it('allows a stable work slug without treating it as display text', () => {
    expect(
      validateReviewInput({
        reviewerName: '访客',
        rating: 4,
        projectName: '同名作品',
        comment: '期待看到更多制作细节。',
        workSlug: 'stable-work-slug',
      }),
    ).toEqual([]);
  });

  it('rejects fractional/out-of-range ratings and oversized text', () => {
    expect(
      validateReviewInput({
        reviewerName: 'a'.repeat(81),
        rating: 4.5,
        projectName: '张园',
        comment: 'x'.repeat(2001),
      }),
    ).toEqual(['昵称不能超过 80 个字符。', '评分必须是 1–5 的整数。', '评鉴内容不能超过 2000 个字符。']);
  });
});

describe('image validation', () => {
  it('matches the Django JPEG, PNG, WebP and 15 MB boundary', () => {
    expect(validateImageFile({ type: 'image/png', size: 1024 } as File)).toBeNull();
    expect(validateImageFile({ type: 'image/svg+xml', size: 1024 } as File)).toContain('仅支持');
    expect(validateImageFile({ type: 'image/gif', size: 1024 } as File)).toContain('仅支持');
    expect(validateImageFile({ type: 'image/jpeg', size: 15 * 1024 * 1024 + 1 } as File)).toContain('15 MB');
    expect(validateImageFile({ type: 'image/webp', size: 0 } as File)).toContain('为空');
  });
});
