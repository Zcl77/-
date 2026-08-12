import { ReviewInput } from '../types';

export const REVIEW_LIMITS = {
  reviewerName: 80,
  projectName: 160,
  comment: 2000,
} as const;

export const IMAGE_UPLOAD_LIMIT_BYTES = 15 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export function validateReviewInput(input: ReviewInput): string[] {
  const errors: string[] = [];
  const reviewerName = input.reviewerName.trim();
  const projectName = input.projectName.trim();
  const comment = input.comment.trim();

  if (!reviewerName) errors.push('请填写昵称。');
  if (reviewerName.length > REVIEW_LIMITS.reviewerName) {
    errors.push(`昵称不能超过 ${REVIEW_LIMITS.reviewerName} 个字符。`);
  }
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    errors.push('评分必须是 1–5 的整数。');
  }
  if (!projectName) errors.push('请选择评鉴对象。');
  if (projectName.length > REVIEW_LIMITS.projectName) {
    errors.push(`项目名称不能超过 ${REVIEW_LIMITS.projectName} 个字符。`);
  }
  if (!comment) errors.push('请填写评鉴内容。');
  if (comment.length > REVIEW_LIMITS.comment) {
    errors.push(`评鉴内容不能超过 ${REVIEW_LIMITS.comment} 个字符。`);
  }

  return errors;
}

export function validateImageFile(file: Pick<File, 'size' | 'type'>): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return '仅支持 JPEG、PNG 或 WebP 图片。';
  }
  if (file.size <= 0) return '图片文件为空。';
  if (file.size > IMAGE_UPLOAD_LIMIT_BYTES) return '图片不能超过 15 MB。';
  return null;
}
