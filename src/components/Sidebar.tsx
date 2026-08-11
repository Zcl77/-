import { BookOpenText, Images, MessageSquareText, UserRound } from 'lucide-react';

export type AppTab = 'gallery' | 'process' | 'contact' | 'account';

interface SidebarProps {
  activeTab: AppTab;
  onNavigate: (tab: AppTab) => void;
  accountLabel: string;
}

const BASE_ITEMS: Array<{ id: Exclude<AppTab, 'account'>; label: string; title: string; icon: typeof Images }> = [
  { id: 'gallery', label: '作品', title: '作品展厅', icon: Images },
  { id: 'process', label: '制作', title: '公开制作日志', icon: BookOpenText },
  { id: 'contact', label: '询价', title: '询价与评价', icon: MessageSquareText },
];

function BrandButton({ onClick, compact = false }: { onClick: () => void; compact?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={`group flex items-center ${compact ? 'gap-2' : 'flex-col gap-3'} text-left`} aria-label="返回知行造境作品展厅">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[4px] border border-studio-brass/60 bg-studio-brass text-lg font-semibold text-studio-canvas transition-colors duration-200 group-hover:bg-[#c3aa76]">知</span>
      <span className={compact ? 'block' : 'text-center'}><strong className="block font-serif text-sm font-semibold text-studio-ink">知行造境</strong><span className="mt-0.5 block text-[9px] font-medium uppercase tracking-[0.12em] text-studio-muted">Zhixing Studio</span></span>
    </button>
  );
}

export default function Sidebar({ activeTab, onNavigate, accountLabel }: SidebarProps) {
  const items = [...BASE_ITEMS, { id: 'account' as const, label: accountLabel, title: accountLabel === '我的项目' ? '客户项目中心' : '客户登录', icon: UserRound }];
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-28 flex-col items-center border-r border-studio-line bg-studio-surface px-3 py-6 lg:flex">
        <BrandButton onClick={() => onNavigate('gallery')} />
        <nav className="my-auto flex w-full flex-col gap-2" aria-label="主要导航">
          {items.map(({ id, label, title, icon: Icon }) => {
            const active = activeTab === id;
            return <button key={id} type="button" onClick={() => onNavigate(id)} aria-current={active ? 'page' : undefined} className={`relative flex min-h-16 w-full flex-col items-center justify-center gap-1.5 rounded-[4px] border px-2 py-2 text-[11px] transition-colors duration-200 ${active ? 'border-studio-line bg-studio-raised text-studio-ink' : 'border-transparent text-studio-muted hover:bg-studio-raised hover:text-studio-ink'}`} title={title}><Icon className={`h-4 w-4 ${active ? 'text-studio-brass' : ''}`} aria-hidden="true" /><span>{label}</span></button>;
          })}
        </nav>
        <p className="text-center text-[9px] leading-4 text-studio-faint">微缩建筑<br />与场景制作</p>
      </aside>

      <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b border-studio-line bg-studio-surface px-4 lg:hidden">
        <BrandButton compact onClick={() => onNavigate('gallery')} />
        <span className="text-[10px] text-studio-faint">{items.find((item) => item.id === activeTab)?.title}</span>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-50 grid h-[4.5rem] grid-cols-4 border-t border-studio-line bg-studio-surface px-2 pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="移动端主要导航">
        {items.map(({ id, label, title, icon: Icon }) => {
          const active = activeTab === id;
          return <button key={id} type="button" onClick={() => onNavigate(id)} aria-current={active ? 'page' : undefined} className={`flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-[10px] transition-colors duration-200 ${active ? 'text-studio-ink' : 'text-studio-muted'}`} title={title}><Icon className={`h-4 w-4 ${active ? 'text-studio-brass' : ''}`} aria-hidden="true" /><span className="max-w-full truncate">{label}</span></button>;
        })}
      </nav>
    </>
  );
}
