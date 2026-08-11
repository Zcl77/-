import { FormEvent, useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Check, MessageSquareText, RefreshCw, Send } from 'lucide-react';
import {
  acknowledgeUpdate,
  getMyProject,
  getProjectMessages,
  getProjectStages,
  getProjectUpdates,
  postProjectMessage,
} from '../../services/api/repositories';
import { CustomerProject, ProductionStage, ProgressUpdateItem, ProjectMessageItem } from '../../types';
import MediaLightbox from '../ui/MediaLightbox';
import SmartImage from '../ui/SmartImage';
import StatusNotice from '../ui/StatusNotice';

interface CustomerProjectDetailProps {
  projectId: string;
  onBack: () => void;
}

const STAGE_STATUS: Record<ProductionStage['status'], string> = {
  pending: '待开始',
  active: '进行中',
  completed: '已完成',
  skipped: '已跳过',
};

function formatDate(value: string | null | undefined, includeTime = false) {
  if (!value) return '暂未设置';
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(new Date(value));
}

export default function CustomerProjectDetail({ projectId, onBack }: CustomerProjectDetailProps) {
  const [project, setProject] = useState<CustomerProject | null>(null);
  const [stages, setStages] = useState<ProductionStage[]>([]);
  const [updates, setUpdates] = useState<ProgressUpdateItem[]>([]);
  const [messages, setMessages] = useState<ProjectMessageItem[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [messageBody, setMessageBody] = useState('');
  const [sending, setSending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number; alt: string } | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const [nextProject, nextStages, nextUpdates, nextMessages] = await Promise.all([
        getMyProject(projectId),
        getProjectStages(projectId),
        getProjectUpdates(projectId),
        getProjectMessages(projectId),
      ]);
      setProject(nextProject);
      setStages(nextStages);
      setUpdates(nextUpdates);
      setMessages(nextMessages);
      setStatus('ready');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '项目内容加载失败。');
      setStatus('error');
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (status !== 'ready') return undefined;
    const timer = window.setInterval(() => {
      void getProjectMessages(projectId)
        .then(setMessages)
        .catch(() => undefined);
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [projectId, status]);

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    const body = messageBody.trim();
    if (!body) return;
    setSending(true);
    setActionError(null);
    try {
      const message = await postProjectMessage(projectId, body);
      setMessages((current) => [...current, message]);
      setMessageBody('');
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : '留言发送失败。');
    } finally {
      setSending(false);
    }
  };

  const acknowledge = async (updateId: string) => {
    setActionError(null);
    try {
      const receipt = await acknowledgeUpdate(projectId, updateId);
      setUpdates((current) =>
        current.map((update) => (update.id === updateId ? { ...update, receipt } : update)),
      );
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : '确认失败，请稍后重试。');
    }
  };

  if (status === 'loading') {
    return (
      <StatusNotice
        tone="loading"
        title="正在读取私人项目"
        description="正在核对项目成员权限、进度和留言。"
      />
    );
  }
  if (status === 'error' || !project) {
    return (
      <StatusNotice
        tone="error"
        title="项目无法打开"
        description={error || '项目不存在或当前账号没有访问权限。'}
        action={
          <button type="button" onClick={() => void load()} className="button-secondary">
            <RefreshCw className="h-4 w-4" />
            重试
          </button>
        }
      />
    );
  }

  return (
    <>
      <button type="button" onClick={onBack} className="button-quiet mb-6">
        <ArrowLeft className="h-4 w-4" />
        返回我的项目
      </button>
      <header className="border-b border-studio-line pb-7">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div className="min-w-0">
            <span className="page-kicker">Private client project</span>
            <h1 className="page-title mt-2">{project.name}</h1>
            <p className="page-description mt-3">{project.description || '工作室尚未补充项目说明。'}</p>
          </div>
          <div className="shrink-0 text-left md:text-right">
            <span className="text-[10px] uppercase text-studio-faint">最后更新</span>
            <strong className="mt-1 block text-sm text-studio-ink">
              {formatDate(project.updatedAt, true)}
            </strong>
          </div>
        </div>
        <div className="mt-6">
          <div className="flex items-center justify-between text-xs text-studio-muted">
            <span>{project.currentStage?.name || '尚未设置当前阶段'}</span>
            <strong className="text-studio-ink">{project.completionPercent}%</strong>
          </div>
          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-studio-line"
            aria-label={`项目完成 ${project.completionPercent}%`}
          >
            <span
              className="block h-full bg-studio-brass"
              style={{ width: `${Math.min(100, Math.max(0, project.completionPercent))}%` }}
            />
          </div>
        </div>
      </header>

      <section className="mt-8" aria-labelledby="project-stages-title">
        <div className="flex items-end justify-between gap-4 border-b border-studio-line pb-3">
          <div>
            <span className="page-kicker">Production stages</span>
            <h2 id="project-stages-title" className="section-heading mt-2">
              制作阶段
            </h2>
          </div>
          <span className="text-[10px] text-studio-faint">{stages.length} 个阶段</span>
        </div>
        <ol className="mt-5 grid grid-cols-1 gap-px overflow-hidden rounded-[6px] border border-studio-line bg-studio-line sm:grid-cols-2 xl:grid-cols-4">
          {stages.map((stage, index) => (
            <li key={stage.id} className="min-w-0 bg-studio-surface p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] text-studio-faint">{String(index + 1).padStart(2, '0')}</span>
                <span
                  className={`text-[10px] ${stage.status === 'active' ? 'text-studio-warning' : stage.status === 'completed' ? 'text-studio-success' : 'text-studio-faint'}`}
                >
                  {STAGE_STATUS[stage.status]}
                </span>
              </div>
              <strong className="mt-3 block font-serif text-sm text-studio-ink">{stage.name}</strong>
              {stage.description && (
                <p className="mt-2 text-xs leading-6 text-studio-muted">{stage.description}</p>
              )}
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-10 grid grid-cols-1 gap-10 xl:grid-cols-12 xl:gap-12">
        <section className="xl:col-span-8" aria-labelledby="project-updates-title">
          <div className="border-b border-studio-line pb-3">
            <span className="page-kicker">Progress timeline</span>
            <h2 id="project-updates-title" className="section-heading mt-2">
              进度时间线
            </h2>
          </div>
          {updates.length === 0 ? (
            <StatusNotice
              tone="empty"
              title="尚未发布进度"
              description="工作室发布第一条真实制作记录后会显示在这里。"
              className="mt-5"
            />
          ) : (
            <ol>
              {updates.map((update) => {
                const imageUrls = update.images.map((image) => image.media.displayUrl);
                return (
                  <li key={update.id} className="border-b border-studio-line py-8">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          {update.stage && <span className="tag">{update.stage.name}</span>}
                          {update.receipt.viewedAt && (
                            <span className="tag border-studio-success/40 text-studio-success">已查看</span>
                          )}
                        </div>
                        <h3 className="mt-3 font-serif text-xl font-semibold text-studio-ink">
                          {update.title}
                        </h3>
                      </div>
                      <time className="shrink-0 text-[10px] text-studio-faint">
                        {formatDate(update.publishedAt, true)}
                      </time>
                    </div>
                    <p className="mt-4 whitespace-pre-wrap text-sm leading-8 text-studio-muted">
                      {update.body}
                    </p>
                    {imageUrls.length > 0 && (
                      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {update.images.map((image, index) => (
                          <button
                            key={image.id}
                            type="button"
                            onClick={() => setLightbox({ images: imageUrls, index, alt: update.title })}
                            className="group aspect-[4/3] overflow-hidden rounded-[4px] border border-studio-line bg-black"
                            aria-label={`放大查看 ${image.altText}`}
                          >
                            <SmartImage
                              src={image.media.thumbnailUrl}
                              alt={image.altText}
                              showFallbackText
                              className="media-hover h-full w-full object-cover"
                              loading="lazy"
                              decoding="async"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                    <dl className="mt-5 grid grid-cols-1 border-y border-studio-line text-xs sm:grid-cols-2">
                      <div className="py-3 sm:border-r sm:border-studio-line sm:pr-4">
                        <dt className="text-studio-faint">下一步计划</dt>
                        <dd className="mt-1 leading-6 text-studio-ink">
                          {update.nextPlan || project.nextPlan || '暂未设置'}
                        </dd>
                      </div>
                      <div className="py-3 sm:pl-4">
                        <dt className="text-studio-faint">预计下次更新</dt>
                        <dd className="mt-1 text-studio-ink">
                          {formatDate(update.expectedNextUpdateAt || project.expectedNextUpdateAt)}
                        </dd>
                      </div>
                    </dl>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-studio-muted">
                      <span>发布人：{update.author.displayName}</span>
                      {update.requiresAcknowledgement &&
                        (update.receipt.acknowledgedAt ? (
                          <span className="inline-flex items-center gap-1.5 text-studio-success">
                            <Check className="h-4 w-4" />
                            已于 {formatDate(update.receipt.acknowledgedAt, true)} 确认
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void acknowledge(update.id)}
                            className="button-secondary"
                          >
                            <Check className="h-4 w-4" />
                            确认已了解
                          </button>
                        ))}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <aside className="xl:col-span-4">
          <section className="ui-panel p-5" aria-labelledby="project-summary-title">
            <h2 id="project-summary-title" className="section-heading">
              项目信息
            </h2>
            <dl className="mt-4 divide-y divide-studio-line text-xs">
              <SummaryRow label="订单编号" value={project.order?.orderNumber || '未关联'} />
              <SummaryRow label="项目负责人" value={project.manager?.displayName || '工作室待分配'} />
              <SummaryRow label="下一步计划" value={project.nextPlan || '暂未设置'} />
              <SummaryRow label="预计下次更新" value={formatDate(project.expectedNextUpdateAt)} />
            </dl>
          </section>

          <section className="mt-6" aria-labelledby="project-messages-title">
            <div className="flex items-center justify-between border-b border-studio-line pb-3">
              <h2
                id="project-messages-title"
                className="flex items-center gap-2 text-sm font-semibold text-studio-ink"
              >
                <MessageSquareText className="h-4 w-4 text-studio-brass" />
                项目留言
              </h2>
              <span className="text-[10px] text-studio-faint">30 秒低频刷新</span>
            </div>
            {actionError && (
              <StatusNotice
                tone="error"
                compact
                title="操作未完成"
                description={actionError}
                className="mt-4"
              />
            )}
            <div className="mt-4 max-h-[28rem] space-y-3 overflow-y-auto pr-1" aria-live="polite">
              {messages.length === 0 ? (
                <p className="border-l border-studio-line pl-4 text-xs leading-6 text-studio-muted">
                  暂无留言。这里用于项目相关的简短沟通，不是即时聊天。
                </p>
              ) : (
                messages.map((message) => (
                  <article
                    key={message.id}
                    className={`rounded-[6px] border p-3 ${message.isMine ? 'border-studio-brass/40 bg-studio-raised' : 'border-studio-line bg-studio-surface'}`}
                  >
                    <div className="flex items-center justify-between gap-3 text-[10px] text-studio-faint">
                      <strong className="text-studio-muted">{message.author.displayName}</strong>
                      <time>{formatDate(message.createdAt, true)}</time>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-studio-ink">
                      {message.body}
                    </p>
                  </article>
                ))
              )}
            </div>
            <form onSubmit={sendMessage} className="mt-4">
              <label htmlFor="project-message" className="field-label">
                发送项目留言
              </label>
              <textarea
                id="project-message"
                required
                maxLength={3000}
                rows={4}
                value={messageBody}
                onChange={(event) => setMessageBody(event.target.value)}
                className="field-input resize-y"
                placeholder="说明需要确认的尺寸、细节或交付事项。"
              />
              <button
                type="submit"
                disabled={sending || !messageBody.trim()}
                className="button-primary mt-3 w-full"
              >
                <Send className="h-4 w-4" />
                {sending ? '正在发送' : '发送留言'}
              </button>
            </form>
          </section>
        </aside>
      </div>

      {lightbox && (
        <MediaLightbox
          images={lightbox.images}
          activeIndex={lightbox.index}
          alt={lightbox.alt}
          onIndexChange={(index) => setLightbox((current) => (current ? { ...current, index } : null))}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[6rem_1fr] gap-3 py-3">
      <dt className="text-studio-faint">{label}</dt>
      <dd className="break-words leading-6 text-studio-ink">{value}</dd>
    </div>
  );
}
