import { useState } from 'react';
import { Check, Copy, MessageSquareText, QrCode, Send, Star } from 'lucide-react';
import { REVIEW_LIMITS, validateReviewInput } from '../domain/validation';
import { Project, Review, StudioSettings } from '../types';
import StatusNotice from './ui/StatusNotice';

interface CommissionFormProps {
  onAddReview: (review: { reviewerName: string; rating: number; projectName: string; comment: string }) => Promise<string>;
  projects: Project[];
  reviews: Review[];
  studioSettings?: StudioSettings;
}

const RATING_LABELS: Record<number, string> = {
  1: '需要改进',
  2: '仍可完善',
  3: '工艺扎实',
  4: '完成出色',
  5: '非常喜欢',
};

export default function CommissionForm({ onAddReview, projects, reviews, studioSettings }: CommissionFormProps) {
  const [reviewerName, setReviewerName] = useState('');
  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [projectName, setProjectName] = useState('工作室总体打分');
  const [comment, setComment] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const wechatId = studioSettings?.wechatId.trim() ?? '';
  const wechatQrUrl = studioSettings?.wechatQrUrl;
  const averageRating = reviews.length > 0
    ? (reviews.reduce((total, review) => total + review.rating, 0) / reviews.length).toFixed(1)
    : '—';

  const handleCopyWeChat = async () => {
    if (!wechatId) return;
    try {
      await navigator.clipboard.writeText(wechatId);
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 2000);
    } catch {
      setErrorMsg('复制失败，请手动选择微信号。');
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMsg('');
    setIsSuccess(false);
    const input = {
      reviewerName: reviewerName.trim(),
      rating,
      projectName: projectName.trim(),
      comment: comment.trim(),
    };
    const errors = validateReviewInput(input);
    if (errors.length > 0) {
      setErrorMsg(errors[0]);
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddReview(input);
      setReviewerName('');
      setRating(5);
      setProjectName('工作室总体打分');
      setComment('');
      setIsSuccess(true);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : '提交失败，请稍后重试。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="page-inner">
        <header className="flex flex-col justify-between gap-6 border-b border-studio-line pb-6 md:flex-row md:items-end md:pb-8">
          <div>
            <span className="page-kicker">Reviews and contact</span>
            <h1 className="page-title mt-2">评论与联系</h1>
            <p className="page-description mt-3">评论提交后进入待审核状态，只有管理员批准的内容会公开显示。</p>
          </div>
          <dl className="grid w-full max-w-sm grid-cols-2 border-y border-studio-line md:w-auto md:min-w-72">
            <div className="border-r border-studio-line py-3 pr-5">
              <dt className="text-[10px] uppercase text-studio-faint">平均评分</dt>
              <dd className="mt-1 font-serif text-2xl text-studio-ink">{averageRating}<span className="ml-1 text-xs text-studio-muted">/ 5</span></dd>
            </div>
            <div className="py-3 pl-5">
              <dt className="text-[10px] uppercase text-studio-faint">公开评论</dt>
              <dd className="mt-1 font-serif text-2xl text-studio-ink">{reviews.length}<span className="ml-1 text-xs text-studio-muted">条</span></dd>
            </div>
          </dl>
        </header>

        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-10 xl:gap-14">
          <div className="space-y-8 lg:col-span-5">
            <section className="border-b border-studio-line pb-8" aria-labelledby="studio-contact">
              <span className="page-kicker">Studio contact</span>
              <h2 id="studio-contact" className="section-heading mt-2">项目咨询与合作联络</h2>
              <p className="mt-3 max-w-md text-sm leading-7 text-studio-muted">建筑微缩、场景制作或项目合作可通过工作室微信联系。联络信息由管理后台维护。</p>

              <div className="mt-5 flex flex-col gap-4 border-l border-studio-line pl-4 sm:flex-row sm:items-center">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[4px] border border-studio-line bg-studio-paper">
                  {wechatQrUrl ? (
                    <img src={wechatQrUrl} alt="知行造境工作室微信二维码" className="h-full w-full object-contain p-1" referrerPolicy="no-referrer" loading="lazy" decoding="async" />
                  ) : (
                    <QrCode className="h-10 w-10 text-studio-paper-ink/45" aria-hidden="true" />
                  )}
                </div>
                <div className="min-w-0">
                  <span className="block text-[10px] uppercase text-studio-faint">微信号</span>
                  <strong className="mt-1 block truncate font-mono text-sm text-studio-ink">{wechatId || '暂未配置'}</strong>
                  <button type="button" onClick={() => void handleCopyWeChat()} disabled={!wechatId} className="button-secondary mt-3 min-h-9 px-3">
                    {isCopied ? <Check className="h-4 w-4 text-studio-success" /> : <Copy className="h-4 w-4" />}
                    {isCopied ? '已复制' : '复制微信号'}
                  </button>
                </div>
              </div>
            </section>

            <section className="ui-panel p-5 md:p-6" aria-labelledby="review-form-title">
              <div className="border-b border-studio-line pb-4">
                <span className="page-kicker">Submit a review</span>
                <h2 id="review-form-title" className="section-heading mt-2">撰写评鉴</h2>
              </div>

              {errorMsg && <StatusNotice compact tone="error" title="提交未完成" description={errorMsg} className="mt-5" />}
              {isSuccess && <StatusNotice compact tone="success" title="评论已提交" description="内容已进入待审核状态，管理员批准后才会公开显示。" className="mt-5" />}

              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                <fieldset>
                  <legend className="field-label">评分 *</legend>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex" role="radiogroup" aria-label="选择 1 到 5 星评分">
                      {[1, 2, 3, 4, 5].map((value) => {
                        const previewRating = hoveredRating ?? rating;
                        return (
                          <label key={value} className="group relative cursor-pointer rounded-[4px] p-1.5" onMouseEnter={() => setHoveredRating(value)} onMouseLeave={() => setHoveredRating(null)}>
                            <input type="radio" name="rating" value={value} checked={rating === value} onChange={() => setRating(value)} className="peer sr-only" />
                            <Star className={`h-6 w-6 transition-colors duration-200 ${value <= previewRating ? 'fill-studio-brass text-studio-brass' : 'text-studio-faint group-hover:text-studio-muted'} peer-focus-visible:drop-shadow-[0_0_3px_#b79c67]`} aria-hidden="true" />
                            <span className="sr-only">{value} 星</span>
                          </label>
                        );
                      })}
                    </div>
                    <span className="text-xs text-studio-muted">{RATING_LABELS[hoveredRating ?? rating]}</span>
                  </div>
                </fieldset>

                <div>
                  <label htmlFor="review-project" className="field-label">评鉴对象</label>
                  <select id="review-project" value={projectName} onChange={(event) => setProjectName(event.target.value)} className="field-input cursor-pointer">
                    <option value="工作室总体打分">工作室总体打分</option>
                    {projects.map((project) => <option key={project.id} value={project.title}>{project.title}</option>)}
                  </select>
                </div>

                <div>
                  <label htmlFor="reviewer-name" className="field-label">姓名或昵称 *</label>
                  <input id="reviewer-name" type="text" required maxLength={REVIEW_LIMITS.reviewerName} value={reviewerName} onChange={(event) => setReviewerName(event.target.value)} placeholder="例如：观展人小张" className="field-input" />
                  <p className="mt-1 text-right text-[10px] text-studio-faint">{reviewerName.length} / {REVIEW_LIMITS.reviewerName}</p>
                </div>

                <div>
                  <label htmlFor="review-comment" className="field-label">评论内容 *</label>
                  <textarea id="review-comment" required maxLength={REVIEW_LIMITS.comment} rows={5} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="可描述您留意到的结构、材质、旧化或灯光细节。" className="field-input resize-y" />
                  <p className="mt-1 text-right text-[10px] text-studio-faint">{comment.length} / {REVIEW_LIMITS.comment}</p>
                </div>

                <button type="submit" disabled={isSubmitting} className="button-primary w-full">
                  <Send className="h-4 w-4" />{isSubmitting ? '正在提交并等待确认' : '提交评鉴'}
                </button>
              </form>
            </section>
          </div>

          <section className="lg:col-span-7" aria-labelledby="approved-reviews-title">
            <div className="flex items-center justify-between gap-4 border-b border-studio-line pb-4">
              <h2 id="approved-reviews-title" className="flex items-center gap-2 text-sm font-semibold text-studio-ink"><MessageSquareText className="h-4 w-4 text-studio-oxide" />已审核评论</h2>
              <span className="tag border-studio-success/40 text-studio-success">Approved only</span>
            </div>

            {reviews.length === 0 ? (
              <StatusNotice tone="empty" title="暂无已审核评论" description="新评论提交后会先进入待审核状态，批准后才会在这里显示。" className="mt-5" />
            ) : (
              <div className="mt-5 grid grid-cols-1 gap-3">
                {reviews.map((review) => (
                  <article key={review.id} className="rounded-[6px] border border-studio-line bg-studio-surface p-5">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="font-serif text-sm font-semibold text-studio-ink">{review.reviewerName}</strong>
                          <span className="tag normal-case">{review.projectName}</span>
                          {review.isDemo && <span className="tag border-studio-warning/40 text-studio-warning">演示评论</span>}
                        </div>
                        <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-studio-muted">{review.comment}</p>
                      </div>
                      <div className="shrink-0 sm:text-right">
                        <div className="flex gap-0.5" aria-label={`${review.rating} 星评分`}>
                          {Array.from({ length: 5 }, (_, index) => <Star key={index} className={`h-3.5 w-3.5 ${index < review.rating ? 'fill-studio-brass text-studio-brass' : 'text-studio-line'}`} aria-hidden="true" />)}
                        </div>
                        <time dateTime={review.createdAt} className="mt-2 block text-[10px] text-studio-faint">
                          {new Date(review.createdAt).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                        </time>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
