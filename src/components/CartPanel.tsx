import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, ShoppingBag, X } from 'lucide-react';
import { Project } from '../types';
import { useI18n } from '../i18n';

interface CartPanelProps {
  items: Project[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onInquiry: () => void;
  onClose: () => void;
}

export default function CartPanel({ items, onRemove, onClear, onInquiry, onClose }: CartPanelProps) {
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={t('询价购物车')}>
      <motion.button
        type="button"
        className="absolute inset-0 h-full w-full bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-label={t('关闭')}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      />
      <motion.aside
        className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-studio-line bg-studio-canvas p-5 shadow-2xl sm:p-7"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-studio-line pb-5">
          <div>
            <span className="page-kicker">{t('独立站询价')}</span>
            <h2 className="mt-2 font-serif text-2xl font-semibold text-studio-ink">{t('询价购物车')}</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            title={t('关闭')}
            aria-label={t('关闭')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-studio-line bg-studio-raised">
              <ShoppingBag className="h-7 w-7 text-studio-brass" />
            </div>
            <p className="mt-4 font-serif text-lg text-studio-ink">{t('购物车还是空的')}</p>
            <p className="mt-2 text-sm leading-6 text-studio-muted">
              {t('把感兴趣的作品加入购物车，再一次提交询价。')}
            </p>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto py-5">
              <AnimatePresence initial={false}>
                {items.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 40, height: 0 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className="flex items-center gap-3 rounded-[8px] border border-studio-line bg-studio-surface-solid p-3 transition-colors duration-200 hover:border-studio-faint"
                  >
                    <img src={item.coverUrl} alt="" className="h-16 w-20 rounded-[4px] object-cover" />
                    <div className="min-w-0 flex-1">
                      <strong className="block truncate font-serif text-sm text-studio-ink">
                        {item.title}
                      </strong>
                      <span className="mt-1 block text-xs text-studio-muted">{item.category}</span>
                    </div>
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => onRemove(item.id)}
                      title={t('移除')}
                      aria-label={t('移除')}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <div className="border-t border-studio-line pt-5">
              <p className="text-xs leading-6 text-studio-muted">
                {t('这是询价清单，不是即时付款订单。工作室会根据规格、数量、运输和制作要求确认最终报价。')}
              </p>
              <div className="mt-4 flex gap-3">
                <button type="button" className="button-secondary flex-1" onClick={onClear}>
                  {t('清空')}
                </button>
                <button type="button" className="button-primary flex-[2]" onClick={onInquiry}>
                  <ArrowRight className="h-4 w-4" />
                  {t('前往提交询价')}
                </button>
              </div>
            </div>
          </>
        )}
      </motion.aside>
    </div>
  );
}
