import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Images, Link2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { PublicProcessPost } from '../types';
import MediaLightbox from './ui/MediaLightbox';
import SmartImage from './ui/SmartImage';
import StatusNotice from './ui/StatusNotice';
import { useI18n } from '../i18n';

interface WIPTimelineProps {
  posts: PublicProcessPost[];
  onOpenWork: (slug: string) => void;
}

export default function WIPTimeline({ posts, onOpenWork }: WIPTimelineProps) {
  const { t, formatDate: formatLocalizedDate } = useI18n();
  const formatDate = (value: string | null) =>
    value
      ? formatLocalizedDate(value, { year: 'numeric', month: '2-digit', day: '2-digit' })
      : t('日期待补充');
  const sortedPosts = useMemo(
    () =>
      [...posts].sort(
        (a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime(),
      ),
    [posts],
  );
  const [selectedId, setSelectedId] = useState(sortedPosts[0]?.id || '');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const selected = sortedPosts.find((post) => post.id === selectedId) || sortedPosts[0];
  const images = selected?.images.map((image) => image.media.displayUrl) || [];

  useEffect(() => {
    if (!sortedPosts.some((post) => post.id === selectedId)) setSelectedId(sortedPosts[0]?.id || '');
  }, [selectedId, sortedPosts]);

  useEffect(() => {
    setLightboxIndex(null);
  }, [selected?.id]);

  return (
    <div className="page-shell">
      <div className="page-inner">
        <header className="border-b border-studio-line pb-6 md:pb-8">
          <span className="page-kicker">{t('公开制作日志')}</span>
          <h1 className="page-title mt-2">{t('公开制作日志')}</h1>
          <p className="page-description mt-3">
            {t('记录可以公开分享的工艺、材料与制作过程。客户订单的私人进度只在登录后的“我的项目”中显示。')}
          </p>
        </header>

        {!selected ? (
          <StatusNotice
            tone="empty"
            title={t('尚无公开制作日志')}
            description={t('工作室发布真实过程记录后会显示在这里；不会用虚构进度填充页面。')}
            className="mt-7"
          />
        ) : (
          <div className="mt-7 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-10 xl:gap-14">
            <aside className="order-2 lg:order-1 lg:col-span-4" aria-label={t('制作日志索引')}>
              <div className="lg:sticky lg:top-8">
                <div className="flex items-center justify-between border-b border-studio-line pb-3">
                  <h2 className="section-title">{t('日志索引')}</h2>
                  <span className="text-[10px] text-studio-faint">
                    {sortedPosts.length} {t('篇')}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
                  {sortedPosts.map((post) => {
                    const active = post.id === selected.id;
                    return (
                      <button
                        key={post.id}
                        type="button"
                        onClick={() => setSelectedId(post.id)}
                        aria-pressed={active}
                        className={`rounded-[8px] border p-4 text-left transition-all duration-200 ${active ? 'border-studio-brass bg-studio-raised shadow-[0_0_0_2px_var(--color-studio-brass-glow)]' : 'border-studio-line bg-studio-surface-solid hover:border-studio-faint hover:bg-studio-raised'}`}
                      >
                        <span className="flex items-center gap-2 text-[10px] text-studio-faint">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {formatDate(post.publishedAt)}
                        </span>
                        <strong className="mt-2 block font-serif text-sm leading-6 text-studio-ink">
                          {post.title}
                        </strong>
                        {post.summary && (
                          <span className="mt-2 line-clamp-2 block text-xs leading-5 text-studio-muted">
                            {post.summary}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>

            <div className="order-1 min-w-0 lg:order-2 lg:col-span-8">
              <AnimatePresence mode="wait" initial={false}>
                <motion.article
                  key={selected.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                >
                  {images.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setLightboxIndex(0)}
                      className="group flex aspect-[16/10] w-full items-center justify-center overflow-hidden rounded-[10px] border border-studio-line bg-black shadow-[0_4px_24px_rgba(0,0,0,0.2)]"
                      aria-label={t('放大查看 {name}', { name: `${selected.title} ${t('图片')}` })}
                    >
                      <SmartImage
                        src={images[0]}
                        alt={selected.images[0].altText}
                        showFallbackText
                        className="media-hover h-full w-full object-contain"
                        decoding="async"
                        fetchPriority="high"
                      />
                    </button>
                  ) : (
                    <div className="flex min-h-48 items-center justify-center rounded-[10px] border border-studio-line bg-studio-surface-solid text-xs text-studio-muted">
                      <Images className="mr-2 h-4 w-4" />
                      {t('本篇日志未附过程图片')}
                    </div>
                  )}

                  <div className="mt-6 border-b border-studio-line pb-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="tag">{formatDate(selected.publishedAt)}</span>
                      {selected.isDevData && (
                        <span className="tag border-studio-warning/40 text-studio-warning">
                          {t('本地开发数据')}
                        </span>
                      )}
                    </div>
                    <h2 className="mt-3 font-serif text-2xl font-semibold leading-snug text-studio-ink md:text-3xl">
                      {selected.title}
                    </h2>
                    {selected.summary && (
                      <p className="mt-3 text-sm leading-7 text-studio-muted">{selected.summary}</p>
                    )}
                    {selected.work && (
                      <button
                        type="button"
                        onClick={() => onOpenWork(selected.work!.slug)}
                        className="button-quiet mt-4"
                      >
                        <Link2 className="h-4 w-4" />
                        {t('查看关联作品：')}
                        {selected.work.title}
                      </button>
                    )}
                  </div>

                  <div className="mt-7 max-w-[46rem] whitespace-pre-wrap text-sm leading-8 text-studio-muted">
                    {selected.body}
                  </div>

                  {selected.images.length > 1 && (
                    <section className="mt-10 border-t border-studio-line pt-7" aria-label={t('过程图片')}>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {selected.images.map((image, index) => (
                          <button
                            key={image.id}
                            type="button"
                            onClick={() => setLightboxIndex(index)}
                            className="group aspect-[4/3] overflow-hidden rounded-[6px] border border-studio-line bg-black transition-all duration-200 hover:border-studio-faint hover:shadow-[0_4px_16px_rgba(0,0,0,0.2)]"
                            aria-label={t('放大查看 {name}', { name: image.altText })}
                          >
                            <SmartImage
                              src={image.media.thumbnailUrl}
                              alt={image.altText}
                              className="media-hover h-full w-full object-cover"
                              loading="lazy"
                              decoding="async"
                            />
                          </button>
                        ))}
                      </div>
                    </section>
                  )}
                </motion.article>
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      {selected && lightboxIndex !== null && images.length > 0 && (
        <MediaLightbox
          images={images}
          activeIndex={lightboxIndex}
          alt={selected.title}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}
