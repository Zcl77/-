import { Images, MessageSquareText, Settings2, Waypoints } from 'lucide-react';

type AppTab = 'gallery' | 'wip' | 'commission' | 'admin';

interface SidebarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  pendingCommissionsCount: number;
}

const ITEMS: Array<{ id: AppTab; label: string; title: string; icon: typeof Images }> = [
  { id: 'gallery', label: '作品', title: '作品展厅', icon: Images },
  { id: 'wip', label: '进度', title: '制作进度', icon: Waypoints },
  { id: 'commission', label: '评鉴', title: '评论与联系', icon: MessageSquareText },
  { id: 'admin', label: '后台', title: '管理后台', icon: Settings2 },
];

function BrandButton({ onClick, compact = false }: { onClick: () => void; compact?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={`group flex items-center ${compact ? 'gap-2' : 'flex-col gap-3'} text-left`} aria-label="返回知行造境作品展厅">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[4px] border border-studio-brass/60 bg-studio-brass text-lg font-semibold text-studio-canvas transition-colors duration-200 group-hover:bg-[#c3aa76]">知</span>
      <span className={compact ? 'block' : 'text-center'}>
        <strong className="block font-serif text-sm font-semibold text-studio-ink">知行造境</strong>
        <span className="mt-0.5 block text-[9px] font-medium uppercase tracking-[0.12em] text-studio-muted">Zhixing Studio</span>
      </span>
    </button>
  );
}

export default function Sidebar({ activeTab, setActiveTab, pendingCommissionsCount }: SidebarProps) {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-28 flex-col items-center border-r border-studio-line bg-studio-surface px-3 py-6 lg:flex">
        <BrandButton onClick={() => setActiveTab('gallery')} />

        <nav className="my-auto flex w-full flex-col gap-2" aria-label="主要导航">
          {ITEMS.map(({ id, label, title, icon: Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                aria-current={active ? 'page' : undefined}
                className={`relative flex min-h-16 w-full flex-col items-center justify-center gap-1.5 rounded-[4px] border px-2 py-2 text-[11px] transition-colors duration-200 ${active ? 'border-studio-line bg-studio-raised text-studio-ink' : 'border-transparent text-studio-muted hover:bg-studio-raised hover:text-studio-ink'}`}
                title={title}
              >
                <Icon className={`h-4 w-4 ${active ? 'text-studio-brass' : ''}`} aria-hidden="true" />
                <span>{label}</span>
                {id === 'admin' && pendingCommissionsCount > 0 && (
                  <span className="absolute right-2 top-2 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-studio-warning px-1 text-[9px] font-bold text-studio-canvas" aria-label={`${pendingCommissionsCount} 条待审核评论`}>
                    {pendingCommissionsCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <p className="text-center text-[9px] leading-4 text-studio-faint">微缩建筑<br />与场景制作</p>
      </aside>

      <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b border-studio-line bg-studio-surface px-4 lg:hidden">
        <BrandButton compact onClick={() => setActiveTab('gallery')} />
        <span className="text-[10px] text-studio-faint">{ITEMS.find((item) => item.id === activeTab)?.title}</span>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-50 grid h-[4.5rem] grid-cols-4 border-t border-studio-line bg-studio-surface px-2 pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="移动端主要导航">
        {ITEMS.map(({ id, label, title, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              aria-current={active ? 'page' : undefined}
              className={`relative flex min-w-0 flex-col items-center justify-center gap-1 text-[10px] transition-colors duration-200 ${active ? 'text-studio-ink' : 'text-studio-muted'}`}
              title={title}
            >
              <Icon className={`h-4 w-4 ${active ? 'text-studio-brass' : ''}`} aria-hidden="true" />
              <span>{label}</span>
              {id === 'admin' && pendingCommissionsCount > 0 && (
                <span className="absolute right-[24%] top-2.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-studio-warning px-1 text-[9px] font-bold text-studio-canvas">
                  {pendingCommissionsCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
}
