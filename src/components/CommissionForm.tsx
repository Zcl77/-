import { FormEvent, useEffect, useRef, useState } from 'react';
import { FileImage, MessageSquareText, Send, Star } from 'lucide-react';
import { REVIEW_LIMITS, validateImageFile, validateReviewInput } from '../domain/validation';
import { InquiryInput, Project, Review, ReviewInput, SiteInfo } from '../types';
import StatusNotice from './ui/StatusNotice';
import { useI18n } from '../i18n';

interface CommissionFormProps {
  onAddReview: (review: ReviewInput) => Promise<string>;
  onSubmitInquiry: (inquiry: InquiryInput) => Promise<string>;
  projects: Project[];
  reviews: Review[];
  site: SiteInfo;
  selectedProjectNames?: string[];
  onInquirySubmitted?: () => void;
}

const EMPTY_INQUIRY: Omit<InquiryInput, 'attachments'> = {
  name: '',
  contactType: 'wechat',
  contactValue: '',
  projectType: '',
  scale: '',
  budgetRange: '',
  expectedDeliveryDate: '',
  description: '',
  privacyConsent: false,
};

export default function CommissionForm({
  onAddReview,
  onSubmitInquiry,
  projects,
  reviews,
  site,
  selectedProjectNames = [],
  onInquirySubmitted,
}: CommissionFormProps) {
  const { t, errorMessage } = useI18n();
  const [inquiry, setInquiry] = useState(EMPTY_INQUIRY);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [inquiryState, setInquiryState] = useState<'idle' | 'working' | 'success' | 'error'>('idle');
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [reviewerName, setReviewerName] = useState('');
  const [rating, setRating] = useState(5);
  const [reviewTarget, setReviewTarget] = useState('studio');
  const [comment, setComment] = useState('');
  const [reviewState, setReviewState] = useState<'idle' | 'working' | 'success' | 'error'>('idle');
  const [reviewMessage, setReviewMessage] = useState('');
  const reviewSubmitting = useRef(false);
  const inquirySubmitting = useRef(false);

  useEffect(() => {
    if (selectedProjectNames.length === 0 || inquiry.description) return;
    setInquiry((current) => ({
      ...current,
      description: `购物车作品：${selectedProjectNames.join('、')}\n\n`,
    }));
  }, [inquiry.description, selectedProjectNames]);

  const setInquiryField = <K extends keyof typeof EMPTY_INQUIRY>(
    key: K,
    value: (typeof EMPTY_INQUIRY)[K],
  ) => {
    setInquiry((current) => ({ ...current, [key]: value }));
  };

  const submitInquiryForm = async (event: FormEvent) => {
    event.preventDefault();
    if (inquirySubmitting.current) return;
    const invalidAttachment = attachments.map(validateImageFile).find(Boolean);
    if (invalidAttachment) {
      setInquiryState('error');
      setInquiryMessage(t(invalidAttachment));
      return;
    }
    setInquiryState('working');
    setInquiryMessage('');
    inquirySubmitting.current = true;
    try {
      await onSubmitInquiry({ ...inquiry, attachments });
      setInquiry(EMPTY_INQUIRY);
      setAttachments([]);
      setInquiryState('success');
      setInquiryMessage(t('工作室会按您留下的方式联系；第一版不会自动发送短信或微信消息。'));
      onInquirySubmitted?.();
    } catch (reason) {
      setInquiryMessage(errorMessage(reason, '询价提交失败，请稍后重试。'));
      setInquiryState('error');
    } finally {
      inquirySubmitting.current = false;
    }
  };

  const selectAttachments = (files: File[]) => {
    if (files.length > 5) {
      setAttachments([]);
      setInquiryState('error');
      setInquiryMessage(t('参考图片最多选择 5 张。'));
      return;
    }
    const invalidAttachment = files.map(validateImageFile).find(Boolean);
    if (invalidAttachment) {
      setAttachments([]);
      setInquiryState('error');
      setInquiryMessage(t(invalidAttachment));
      return;
    }
    setAttachments(files);
    if (inquiryState === 'error') {
      setInquiryState('idle');
      setInquiryMessage('');
    }
  };

  const submitReviewForm = async (event: FormEvent) => {
    event.preventDefault();
    if (reviewSubmitting.current) return;
    const selectedProject = projects.find((project) => project.slug === reviewTarget);
    const input = {
      reviewerName: reviewerName.trim(),
      rating,
      projectName: selectedProject?.title || t('工作室总体评价'),
      comment: comment.trim(),
      workSlug: selectedProject?.slug,
    };
    const errors = validateReviewInput(input);
    if (errors.length > 0) {
      setReviewState('error');
      setReviewMessage(t(errors[0]));
      return;
    }
    setReviewState('working');
    setReviewMessage('');
    reviewSubmitting.current = true;
    try {
      await onAddReview(input);
      setReviewerName('');
      setRating(5);
      setReviewTarget('studio');
      setComment('');
      setReviewState('success');
      setReviewMessage(t('审核通过后才会出现在公开列表。'));
    } catch (reason) {
      setReviewMessage(errorMessage(reason, '评价提交失败，请稍后重试。'));
      setReviewState('error');
    } finally {
      reviewSubmitting.current = false;
    }
  };

  const averageRating =
    reviews.length > 0
      ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
      : '—';
  const contacts = [
    [t('联系人'), site.contactName],
    [t('微信'), site.wechat],
    [t('电话'), site.phone],
    [t('邮箱'), site.email],
  ].filter((item): item is [string, string] => Boolean(item[1]));

  return (
    <div className="page-shell">
      <div className="page-inner">
        <header className="flex flex-col justify-between gap-6 border-b border-studio-line pb-7 md:flex-row md:items-end">
          <div>
            <span className="page-kicker">{t('询价与评价')}</span>
            <h1 className="page-title mt-2">{t('询价与评价')}</h1>
            <p className="page-description mt-3">
              {t('提交制作需求，或分享真实合作体验。评价审核通过后才会公开。')}
            </p>
          </div>
          <dl className="grid w-full max-w-sm grid-cols-2 border-y border-studio-line md:w-auto md:min-w-72">
            <div className="border-r border-studio-line py-3 pr-5">
              <dt className="text-[10px] uppercase text-studio-faint">{t('平均评分')}</dt>
              <dd className="mt-1 font-serif text-2xl text-studio-ink">
                {averageRating}
                <span className="ml-1 text-xs text-studio-muted">/ 5</span>
              </dd>
            </div>
            <div className="py-3 pl-5">
              <dt className="text-[10px] uppercase text-studio-faint">{t('公开评价')}</dt>
              <dd className="mt-1 font-serif text-2xl text-studio-ink">
                {reviews.length}
                <span className="ml-1 text-xs text-studio-muted">{t('条')}</span>
              </dd>
            </div>
          </dl>
        </header>

        <div className="mt-8 grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-10 xl:gap-14">
          <div className="lg:col-span-6">
            <section className="border-b border-studio-line pb-7" aria-labelledby="contact-title">
              <span className="page-kicker">{t('工作室联系信息')}</span>
              <h2 id="contact-title" className="section-heading mt-2">
                {t('联系工作室')}
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-studio-muted">
                {site.description || t('可通过下方询价表说明模型类型、比例、预算和期望交付时间。')}
              </p>
              {contacts.length > 0 && (
                <dl className="mt-5 grid grid-cols-1 gap-px overflow-hidden rounded-[6px] border border-studio-line bg-studio-line sm:grid-cols-2">
                  {contacts.map(([label, value]) => (
                    <Contact key={label} label={label} value={value} />
                  ))}
                </dl>
              )}
            </section>

            <section className="mt-8 ui-panel p-5 md:p-6" aria-labelledby="inquiry-title">
              <span className="page-kicker">{t('项目询价')}</span>
              <h2 id="inquiry-title" className="section-heading mt-2">
                {t('提交制作需求')}
              </h2>
              {inquiryState === 'error' && (
                <StatusNotice
                  tone="error"
                  compact
                  title={t('询价未提交')}
                  description={inquiryMessage}
                  className="mt-5"
                />
              )}
              {inquiryState === 'success' && (
                <StatusNotice
                  tone="success"
                  compact
                  title={t('询价已提交')}
                  description={
                    inquiryMessage || t('工作室会按您留下的方式联系；第一版不会自动发送短信或微信消息。')
                  }
                  className="mt-5"
                />
              )}
              <form onSubmit={submitInquiryForm} className="mt-6 space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label={t('姓名 *')} id="inquiry-name">
                    <input
                      id="inquiry-name"
                      required
                      maxLength={80}
                      value={inquiry.name}
                      onChange={(event) => setInquiryField('name', event.target.value)}
                      className="field-input"
                    />
                  </Field>
                  <Field label={t('项目类型 *')} id="inquiry-type">
                    <input
                      id="inquiry-type"
                      required
                      maxLength={100}
                      value={inquiry.projectType}
                      onChange={(event) => setInquiryField('projectType', event.target.value)}
                      className="field-input"
                      placeholder={t('例如：建筑微缩模型')}
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-[8rem_1fr] gap-3">
                  <Field label={t('联系方式')} id="contact-type">
                    <select
                      id="contact-type"
                      value={inquiry.contactType}
                      onChange={(event) =>
                        setInquiryField('contactType', event.target.value as InquiryInput['contactType'])
                      }
                      className="field-input"
                    >
                      <option value="wechat">{t('微信')}</option>
                      <option value="phone">{t('手机号')}</option>
                    </select>
                  </Field>
                  <Field label={t('号码或微信号 *')} id="contact-value">
                    <input
                      id="contact-value"
                      required
                      maxLength={80}
                      value={inquiry.contactValue}
                      onChange={(event) => setInquiryField('contactValue', event.target.value)}
                      className="field-input"
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Field label={t('模型比例')} id="inquiry-scale">
                    <input
                      id="inquiry-scale"
                      maxLength={40}
                      value={inquiry.scale}
                      onChange={(event) => setInquiryField('scale', event.target.value)}
                      className="field-input"
                      placeholder={t('例如 1:50')}
                    />
                  </Field>
                  <Field label={t('预算范围')} id="inquiry-budget">
                    <input
                      id="inquiry-budget"
                      maxLength={80}
                      value={inquiry.budgetRange}
                      onChange={(event) => setInquiryField('budgetRange', event.target.value)}
                      className="field-input"
                    />
                  </Field>
                  <Field label={t('期望交付')} id="inquiry-date">
                    <input
                      id="inquiry-date"
                      type="date"
                      value={inquiry.expectedDeliveryDate}
                      onChange={(event) => setInquiryField('expectedDeliveryDate', event.target.value)}
                      className="field-input"
                    />
                  </Field>
                </div>
                <Field label={t('需求说明 *')} id="inquiry-description">
                  <textarea
                    id="inquiry-description"
                    required
                    maxLength={5000}
                    rows={6}
                    value={inquiry.description}
                    onChange={(event) => setInquiryField('description', event.target.value)}
                    className="field-input resize-y"
                    placeholder={t('请说明尺寸、场景、用途、材料偏好和时间要求。')}
                  />
                </Field>
                <div>
                  <label htmlFor="inquiry-files" className="field-label">
                    {t('参考图片（最多 5 张，每张不超过 15 MB）')}
                  </label>
                  <label htmlFor="inquiry-files" className="button-secondary cursor-pointer">
                    <FileImage className="h-4 w-4" />
                    {t('选择图片')}
                  </label>
                  <input
                    id="inquiry-files"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="sr-only"
                    onChange={(event) => selectAttachments(Array.from(event.target.files || []))}
                  />
                  {attachments.length > 0 && (
                    <p className="mt-2 break-words text-xs leading-6 text-studio-muted">
                      {attachments.map((file) => file.name).join('、')}
                    </p>
                  )}
                </div>
                <label className="flex items-start gap-3 text-xs leading-6 text-studio-muted">
                  <input
                    type="checkbox"
                    checked={inquiry.privacyConsent}
                    onChange={(event) => setInquiryField('privacyConsent', event.target.checked)}
                    className="mt-1 h-4 w-4 accent-studio-brass"
                    required
                  />
                  <span>
                    {t('我同意工作室仅为处理本次询价使用所提交的联系方式和参考资料。')}
                    {site.privacyNotice && ` ${site.privacyNotice}`}
                  </span>
                </label>
                <button type="submit" disabled={inquiryState === 'working'} className="button-primary w-full">
                  <Send className="h-4 w-4" />
                  {t(inquiryState === 'working' ? '正在安全上传并提交' : '提交询价')}
                </button>
              </form>
            </section>
          </div>

          <div className="lg:col-span-6">
            <section className="ui-panel p-5 md:p-6" aria-labelledby="review-form-title">
              <span className="page-kicker">{t('真实评价')}</span>
              <h2 id="review-form-title" className="section-heading mt-2">
                {t('提交真实评价')}
              </h2>
              <p className="mt-3 text-xs leading-6 text-studio-muted">
                {t('请只提交真实体验。内容默认待审核，不会自动公开。')}
              </p>
              {reviewState === 'error' && (
                <StatusNotice
                  tone="error"
                  compact
                  title={t('评价未提交')}
                  description={reviewMessage}
                  className="mt-5"
                />
              )}
              {reviewState === 'success' && (
                <StatusNotice
                  tone="success"
                  compact
                  title={t('评价已提交')}
                  description={reviewMessage || t('审核通过后才会出现在公开列表。')}
                  className="mt-5"
                />
              )}
              <form onSubmit={submitReviewForm} className="mt-6 space-y-5">
                <fieldset>
                  <legend className="field-label">{t('评分 *')}</legend>
                  <div className="flex gap-1" role="radiogroup" aria-label={t('选择 1 到 5 星评分')}>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <label key={value} className="cursor-pointer rounded-[4px] p-1.5">
                        <input
                          type="radio"
                          name="rating"
                          value={value}
                          checked={rating === value}
                          onChange={() => setRating(value)}
                          className="peer sr-only"
                        />
                        <Star
                          className={`h-6 w-6 ${value <= rating ? 'fill-studio-brass text-studio-brass' : 'text-studio-faint'} peer-focus-visible:drop-shadow-[0_0_3px_#b79c67]`}
                        />
                        <span className="sr-only">{t('{count} 星', { count: value })}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <Field label={t('评价对象')} id="review-project">
                  <select
                    id="review-project"
                    value={reviewTarget}
                    onChange={(event) => setReviewTarget(event.target.value)}
                    className="field-input"
                  >
                    <option value="studio">{t('工作室总体评价')}</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.slug}>
                        {project.title}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t('姓名或昵称 *')} id="reviewer-name">
                  <input
                    id="reviewer-name"
                    required
                    maxLength={REVIEW_LIMITS.reviewerName}
                    value={reviewerName}
                    onChange={(event) => setReviewerName(event.target.value)}
                    className="field-input"
                  />
                </Field>
                <Field label={t('评价内容 *')} id="review-comment">
                  <textarea
                    id="review-comment"
                    required
                    maxLength={REVIEW_LIMITS.comment}
                    rows={5}
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    className="field-input resize-y"
                  />
                </Field>
                <button
                  type="submit"
                  disabled={reviewState === 'working'}
                  className="button-secondary w-full"
                >
                  <MessageSquareText className="h-4 w-4" />
                  {t(reviewState === 'working' ? '正在提交' : '提交待审核评价')}
                </button>
              </form>
            </section>

            <section className="mt-8" aria-labelledby="approved-reviews-title">
              <div className="flex items-center justify-between border-b border-studio-line pb-3">
                <h2 id="approved-reviews-title" className="section-heading">
                  {t('已审核评价')}
                </h2>
                <span className="tag border-studio-success/40 text-studio-success">{t('仅显示已审核')}</span>
              </div>
              {reviews.length === 0 ? (
                <StatusNotice
                  tone="empty"
                  title={t('暂无已审核评价')}
                  description={t('不会用演示评价或虚构反馈填充这里。')}
                  className="mt-5"
                />
              ) : (
                <div className="mt-5 space-y-3">
                  {reviews.map((review) => (
                    <article
                      key={review.id}
                      className="rounded-[6px] border border-studio-line bg-studio-surface p-5"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="font-serif text-sm text-studio-ink">{review.reviewerName}</strong>
                        <span className="tag">{review.projectName}</span>
                        {review.isDemo && (
                          <span className="tag border-studio-warning/40 text-studio-warning">
                            {t('本地开发数据')}
                          </span>
                        )}
                      </div>
                      <div
                        className="mt-3 flex gap-0.5"
                        aria-label={t('{count} 星', { count: review.rating })}
                      >
                        {Array.from({ length: 5 }, (_, index) => (
                          <Star
                            key={index}
                            className={`h-3.5 w-3.5 ${index < review.rating ? 'fill-studio-brass text-studio-brass' : 'text-studio-line'}`}
                          />
                        ))}
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-studio-muted">
                        {review.comment}
                      </p>
                      <time className="mt-3 block text-[10px] text-studio-faint">
                        {new Date(review.createdAt).toLocaleDateString('zh-CN')}
                      </time>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      {children}
    </div>
  );
}

function Contact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 bg-studio-surface p-4">
      <dt className="text-[10px] uppercase text-studio-faint">{label}</dt>
      <dd className="mt-1 break-words text-sm text-studio-ink">{value}</dd>
    </div>
  );
}
