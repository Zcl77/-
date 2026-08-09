import { Images, MessageSquareText, Settings2, Waypoints } from 'lucide-react';

type AppTab = 'gallery' | 'wip' | 'commission' | 'admin';

interface SidebarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  pendingCommissionsCount: number;
}

const PRIMARY_ITEMS: Array<{ id: Exclude<AppTab, 'admin'>; label: string; title: string; icon: typeof Images }> = [
  { id: 'gallery', label: '作品', title: '作品展厅', icon: Images },
  { id: 'wip', label: '制作日志', title: '公开制作日志', icon: Waypoints },
  { id: 'commission', label: '联系', title: '评论与联系', icon: MessageSquareText },
];

const ADMIN_ITEM = { id: 'admin' as const, label: '管理', title: '管理后台', icon: Settings2 };
const ALL_ITEMS = [...PRIMARY_ITEMS, ADMIN_ITEM];

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
          {PRIMARY_ITEMS.map(({ id, label, title, icon: Icon }) => {
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
              </button>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={() => setActiveTab('admin')}
          aria-current={activeTab === 'admin' ? 'page' : undefined}
          className={`relative mb-5 flex h-10 w-10 items-center justify-center rounded-[4px] border transition-colors ${activeTab === 'admin' ? 'border-studio-brass bg-studio-raised text-studio-brass' : 'border-studio-line text-studio-muted hover:bg-studio-raised hover:text-studio-ink'}`}
          title="打开管理后台"
          aria-label="打开管理后台"
        >
          <Settings2 className="h-4 w-4" aria-hidden="true" />
          {pendingCommissionsCount > 0 && (
            <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-studio-warning px-1 text-[9px] font-bold text-studio-canvas" aria-label={`${pendingCommissionsCount} 条待审核评论`}>
              {pendingCommissionsCount}
            </span>
          )}
        </button>

        <p className="text-center text-[9px] leading-4 text-studio-faint">微缩建筑<br />与场景制作</p>
      </aside>

      <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b border-studio-line bg-studio-surface px-4 lg:hidden">
        <BrandButton compact onClick={() => setActiveTab('gallery')} />
        <div className="flex items-center gap-2">
          <span className="hidden text-[10px] text-studio-faint xs:block">{ALL_ITEMS.find((item) => item.id === activeTab)?.title}</span>
          <button
            type="button"
            onClick={() => setActiveTab('admin')}
            className={`icon-button relative h-9 min-h-9 w-9 ${activeTab === 'admin' ? 'border-studio-brass text-studio-brass' : ''}`}
            title="打开管理后台"
            aria-label="打开管理后台"
          >
            <Settings2 className="h-4 w-4" aria-hidden="true" />
            {pendingCommissionsCount > 0 && (
              <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-studio-warning px-1 text-[9px] font-bold text-studio-canvas">
                {pendingCommissionsCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-50 grid h-[4.5rem] grid-cols-3 border-t border-studio-line bg-studio-surface px-2 pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="移动端主要导航">
        {PRIMARY_ITEMS.map(({ id, label, title, icon: Icon }) => {
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
            </button>
          );
        })}
      </nav>
    </>
  );
}
