import { useMemo, useState } from 'react';
import { Check, Trash2, X } from 'lucide-react';
import { Review, ReviewStatus } from '../../types';
import StatusNotice from '../ui/StatusNotice';

interface ReviewModerationPanelProps {
  reviews: Review[];
  busyId?: string | null;
  onModerate: (id: string, status: Exclude<ReviewStatus, 'pending'>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: '待审核',
  approved: '已批准',
  rejected: '已拒绝',
};

const STATUS_CLASSES: Record<ReviewStatus, string> = {
  pending: 'border-studio-warning/50 text-studio-warning',
  approved: 'border-studio-success/50 text-studio-success',
  rejected: 'border-studio-danger/50 text-studio-danger',
};

export default function ReviewModerationPanel({ reviews, busyId, onModerate, onDelete }: ReviewModerationPanelProps) {
  const [filter, setFilter] = useState<'all' | ReviewStatus>('all');
  const visibleReviews = useMemo(() => reviews
    .filter((review) => filter === 'all' || review.status === filter)
    .sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }), [filter, reviews]);

  return (
    <section aria-labelledby="review-moderation-title">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 id="review-moderation-title" className="section-heading">评论审核</h2>
          <p className="mt-1 text-xs text-studio-muted">批准后公开显示；拒绝内容仅管理员可见，删除后不可恢复。</p>
        </div>
        <div className="flex max-w-full gap-1 overflow-x-auto rounded-[4px] border border-studio-line bg-studio-surface p-1" aria-label="评论状态筛选">
          {([
            ['all', `全部 ${reviews.length}`],
            ['pending', `待审核 ${reviews.filter((review) => review.status === 'pending').length}`],
            ['approved', `已批准 ${reviews.filter((review) => review.status === 'approved').length}`],
            ['rejected', `已拒绝 ${reviews.filter((review) => review.status === 'rejected').length}`],
          ] as const).map(([value, label]) => (
            <button key={value} type="button" onClick={() => setFilter(value)} aria-pressed={filter === value} className={`min-h-8 shrink-0 rounded-[3px] px-3 text-[10px] ${filter === value ? 'bg-studio-brass text-studio-canvas' : 'text-studio-muted hover:bg-studio-raised hover:text-studio-ink'}`}>{label}</button>
          ))}
        </div>
      </div>

      {visibleReviews.length === 0 ? (
        <StatusNotice tone="empty" title="当前筛选下暂无评论" className="mt-5" />
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-2">
          {visibleReviews.map((review) => (
            <article key={review.id} className="rounded-[6px] border border-studio-line bg-studio-surface p-5">
              <div className="flex flex-wrap justify-between gap-3 border-b border-studio-line pb-3">
                <div>
                  <h3 className="font-serif text-sm font-semibold text-studio-ink">{review.reviewerName}</h3>
                  <p className="mt-1 text-xs text-studio-muted">{review.projectName} · {review.rating}/5</p>
                </div>
                <div className="flex items-center gap-2">
                  {review.isDemo && <span className="tag border-studio-warning/40 text-studio-warning">演示</span>}
                  <span className={`tag ${STATUS_CLASSES[review.status]}`}>{STATUS_LABELS[review.status]}</span>
                </div>
              </div>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-studio-muted">{review.comment}</p>
              <time dateTime={review.createdAt} className="mt-3 block font-mono text-[10px] text-studio-faint">{new Date(review.createdAt).toLocaleString('zh-CN')}</time>
              <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-studio-line pt-4">
                <button type="button" disabled={busyId === review.id || review.status === 'approved'} onClick={() => void onModerate(review.id, 'approved')} className="button-secondary min-h-9 px-3 text-studio-success"><Check className="h-3.5 w-3.5" />批准</button>
                <button type="button" disabled={busyId === review.id || review.status === 'rejected'} onClick={() => void onModerate(review.id, 'rejected')} className="button-secondary min-h-9 px-3"><X className="h-3.5 w-3.5" />拒绝</button>
                <button type="button" disabled={busyId === review.id} onClick={() => void onDelete(review.id)} className="button-secondary min-h-9 px-3 text-studio-danger"><Trash2 className="h-3.5 w-3.5" />删除</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
