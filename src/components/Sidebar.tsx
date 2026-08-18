import { BookOpenText, Images, MessageSquareText, ShoppingBag, UserRound } from 'lucide-react';
import { motion } from 'motion/react';
import { useI18n } from '../i18n';
import LanguageSwitcher from './ui/LanguageSwitcher';

export type AppTab = 'gallery' | 'process' | 'contact' | 'account';

interface SidebarProps {
  activeTab: AppTab;
  onNavigate: (tab: AppTab) => void;
  accountLabel: string;
  cartCount: number;
  onOpenCart: () => void;
}

const BASE_ITEMS: Array<{
  id: Exclude<AppTab, 'account'>;
  label: string;
  title: string;
  icon: typeof Images;
}> = [
  { id: 'gallery', label: '作品', title: '作品展厅', icon: Images },
  { id: 'process', label: '制作', title: '公开制作日志', icon: BookOpenText },
  { id: 'contact', label: '询价', title: '询价与评价', icon: MessageSquareText },
];

function BrandButton({ onClick, compact = false }: { onClick: () => void; compact?: boolean }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex items-center ${compact ? 'gap-2' : 'flex-col gap-3'} text-left transition-transform duration-200 hover:scale-[1.02] active:scale-95`}
      aria-label={t('返回知行造境作品展厅')}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] border border-studio-brass/60 bg-studio-brass text-lg font-semibold text-studio-canvas transition-all duration-200 group-hover:bg-[#d0b07e] group-hover:shadow-[0_0_16px_rgba(196,165,114,0.25)]">
        知
      </span>
      <span className={compact ? 'block' : 'text-center'}>
        <strong className="block font-serif text-sm font-semibold text-studio-ink">{t('知行造境')}</strong>
        <span className="mt-0.5 block text-[9px] font-medium uppercase tracking-[0.12em] text-studio-muted">
          Zhixing Studio
        </span>
      </span>
    </button>
  );
}

export default function Sidebar({
  activeTab,
  onNavigate,
  accountLabel,
  cartCount,
  onOpenCart,
}: SidebarProps) {
  const { t } = useI18n();
  const items = [
    ...BASE_ITEMS.map((item) => ({ ...item, label: t(item.label), title: t(item.title) })),
    {
      id: 'account' as const,
      label: accountLabel,
      title: accountLabel === t('我的项目') ? t('客户项目中心') : t('客户登录'),
      icon: UserRound,
    },
  ];
  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-28 flex-col items-center border-r border-studio-line bg-studio-surface-solid/95 px-3 py-6 backdrop-blur-md lg:flex">
        <BrandButton onClick={() => onNavigate('gallery')} />
        <nav className="my-auto flex w-full flex-col gap-2" aria-label={t('主要导航')}>
          {items.map(({ id, label, title, icon: Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onNavigate(id)}
                aria-current={active ? 'page' : undefined}
                className={`relative flex min-h-16 w-full flex-col items-center justify-center gap-1.5 rounded-[8px] border px-2 py-2 text-[11px] transition-all duration-200 ${active ? 'border-studio-line bg-studio-raised text-studio-ink shadow-[0_2px_8px_rgba(0,0,0,0.12)]' : 'border-transparent text-studio-muted hover:bg-studio-raised/60 hover:text-studio-ink'}`}
                title={title}
              >
                {active && (
                  <motion.span
                    layoutId="sidebar-active-indicator"
                    className="absolute left-0 top-1/2 h-[60%] w-[3px] -translate-y-1/2 rounded-full bg-studio-brass"
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  />
                )}
                <Icon
                  className={`h-4 w-4 transition-colors duration-200 ${active ? 'text-studio-brass' : ''}`}
                  aria-hidden="true"
                />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={onOpenCart}
          className="relative mt-4 flex min-h-14 w-full flex-col items-center justify-center gap-1 rounded-[8px] border border-studio-line text-[11px] text-studio-muted transition-all duration-200 hover:bg-studio-raised hover:text-studio-ink"
          title={t('询价购物车')}
        >
          <ShoppingBag className="h-4 w-4" aria-hidden="true" />
          <span>{t('购物车')}</span>
          {cartCount > 0 && (
            <span className="badge-pulse absolute right-3 top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-studio-brass px-1 text-[9px] font-semibold text-studio-canvas">
              {cartCount}
            </span>
          )}
        </button>
        <LanguageSwitcher />
        <p className="mt-3 text-center text-[9px] leading-4 text-studio-faint">
          {t('微缩建筑')}
          <br />
          {t('与场景制作')}
        </p>
      </aside>

      {/* Mobile Header */}
      <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b border-studio-line bg-studio-surface-solid/95 px-4 backdrop-blur-md lg:hidden">
        <BrandButton compact onClick={() => onNavigate('gallery')} />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenCart}
            className="relative icon-button"
            title={t('询价购物车')}
            aria-label={t('询价购物车')}
          >
            <ShoppingBag className="h-4 w-4" />
            {cartCount > 0 && (
              <span className="badge-pulse absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-studio-brass px-1 text-[9px] font-semibold text-studio-canvas">
                {cartCount}
              </span>
            )}
          </button>
          <LanguageSwitcher />
          <span className="hidden text-[10px] text-studio-faint sm:inline">
            {items.find((item) => item.id === activeTab)?.title}
          </span>
        </div>
      </header>

      {/* Mobile Bottom Nav */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 grid h-[4.5rem] grid-cols-4 border-t border-studio-line bg-studio-surface-solid/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
        aria-label={t('移动端主要导航')}
      >
        {items.map(({ id, label, title, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              aria-current={active ? 'page' : undefined}
              className={`relative flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-[10px] transition-colors duration-200 ${active ? 'text-studio-ink' : 'text-studio-muted'}`}
              title={title}
            >
              {active && (
                <motion.span
                  layoutId="mobile-nav-indicator"
                  className="absolute top-0 h-[2px] w-8 rounded-full bg-studio-brass"
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                />
              )}
              <Icon
                className={`h-4 w-4 transition-colors duration-200 ${active ? 'text-studio-brass' : ''}`}
                aria-hidden="true"
              />
              <span className="max-w-full truncate">{label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
