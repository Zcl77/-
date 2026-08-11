import { Project, ReviewInput } from '../types';

export const REVIEW_LIMITS = {
  reviewerName: 50,
  projectName: 120,
  comment: 1000,
} as const;

export const IMAGE_UPLOAD_LIMIT_BYTES = 10 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
] as const;

export function createUniqueId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  throw new Error('当前浏览器不支持安全的 UUID 生成，请升级浏览器后重试。');
}

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

export function validateProject(project: Project): string[] {
  const errors: string[] = [];
  if (!project.id || project.id.length > 128 || !/^[a-zA-Z0-9_-]+$/.test(project.id)) {
    errors.push('项目 ID 不合法。');
  }
  if (!project.title.trim() || project.title.trim().length > 200) {
    errors.push('项目名称不能为空且不能超过 200 个字符。');
  }
  if (!project.category.trim() || project.category.trim().length > 100) {
    errors.push('项目分类不能为空且不能超过 100 个字符。');
  }
  if (!project.scale.trim() || project.scale.trim().length > 40) {
    errors.push('项目比例不能为空且不能超过 40 个字符。');
  }
  if (!['WIP', 'Completed', 'Sold'].includes(project.status)) {
    errors.push('项目状态不合法。');
  }
  if (!['public', 'hidden'].includes(project.visibility)) {
    errors.push('项目可见性不合法。');
  }
  if (!project.description.trim() || project.description.trim().length > 5000) {
    errors.push('项目说明不能为空且不能超过 5000 个字符。');
  }
  if (!Number.isFinite(project.completionPercent) || project.completionPercent < 0 || project.completionPercent > 100) {
    errors.push('完成比例必须在 0–100 之间。');
  }
  if (project.timeSpent !== undefined && (!Number.isFinite(project.timeSpent) || project.timeSpent < 0)) {
    errors.push('累计工时不能为负数。');
  }
  if (project.images.length > 100 || project.worksteps.length > 100 || (project.rooms?.length ?? 0) > 100) {
    errors.push('项目图片、制作阶段或空间数量超过限制。');
  }
  return errors;
}

export function validateImageFile(file: Pick<File, 'size' | 'type'>): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return '仅支持 JPEG、PNG、WebP、GIF 或 AVIF 图片。';
  }
  if (file.size <= 0) return '图片文件为空。';
  if (file.size > IMAGE_UPLOAD_LIMIT_BYTES) return '图片不能超过 10 MB。';
  return null;
}
