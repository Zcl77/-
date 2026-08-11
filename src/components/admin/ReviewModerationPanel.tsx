import { Check, Trash2, X } from 'lucide-react';
import { Review, ReviewStatus } from '../../types';

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

export default function ReviewModerationPanel({ reviews, busyId, onModerate, onDelete }: ReviewModerationPanelProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-xs uppercase tracking-widest text-gf-tea font-mono font-bold">评论审核 ({reviews.length})</h3>
      {reviews.map((review) => (
        <article key={review.id} className="bg-white/60 border border-gf-tea/20 p-5 rounded space-y-3 shadow-sm">
          <div className="flex flex-wrap justify-between gap-3 border-b border-gf-tea/15 pb-3">
            <div>
              <h4 className="font-serif font-bold">{review.reviewerName}</h4>
              <p className="text-xs text-gf-tea mt-1">{review.projectName} · {review.rating}/5</p>
            </div>
            <div className="flex items-center gap-2 text-[10px]">
              {review.isDemo && <span className="text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">演示内容</span>}
              <span className="bg-gf-rice border border-gf-tea/20 px-2 py-0.5 rounded">{STATUS_LABELS[review.status]}</span>
            </div>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{review.comment}</p>
          <p className="text-[10px] text-gf-tea font-mono">{new Date(review.createdAt).toLocaleString('zh-CN')}</p>
          <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-gf-tea/10">
            <button type="button" disabled={busyId === review.id || review.status === 'approved'} onClick={() => void onModerate(review.id, 'approved')} className="px-3 py-1.5 text-xs border border-emerald-200 bg-emerald-50 text-emerald-800 rounded flex items-center gap-1 disabled:opacity-40">
              <Check className="w-3.5 h-3.5" /> 批准
            </button>
            <button type="button" disabled={busyId === review.id || review.status === 'rejected'} onClick={() => void onModerate(review.id, 'rejected')} className="px-3 py-1.5 text-xs border border-stone-200 bg-stone-50 text-stone-700 rounded flex items-center gap-1 disabled:opacity-40">
              <X className="w-3.5 h-3.5" /> 拒绝
            </button>
            <button type="button" disabled={busyId === review.id} onClick={() => void onDelete(review.id)} className="px-3 py-1.5 text-xs border border-red-200 bg-red-50 text-red-700 rounded flex items-center gap-1 disabled:opacity-40">
              <Trash2 className="w-3.5 h-3.5" /> 删除
            </button>
          </div>
        </article>
      ))}
      {reviews.length === 0 && <div className="p-10 text-center border border-dashed border-gf-tea/30 rounded text-sm text-gf-tea">暂无评论。</div>}
    </div>
  );
}
