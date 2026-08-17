import { useEffect, useMemo } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import CommissionForm from './components/CommissionForm';
import GalleryView from './components/GalleryView';
import Sidebar, { AppTab } from './components/Sidebar';
import WIPTimeline from './components/WIPTimeline';
import CustomerPortal from './components/account/CustomerPortal';
import LoginPanel from './components/account/LoginPanel';
import StatusNotice from './components/ui/StatusNotice';
import { parseRoute } from './domain/routes';
import { usePublicSiteData } from './hooks/usePublicSiteData';
import { useRoute } from './hooks/useRoute';
import { useSessionAuth } from './hooks/useSessionAuth';
import { submitInquiry, submitReview } from './services/api/repositories';
import { useI18n } from './i18n';

export default function App() {
  const { path, navigate } = useRoute();
  const route = useMemo(() => parseRoute(path), [path]);
  const publicData = usePublicSiteData();
  const auth = useSessionAuth();
  const { locale, localeTransitionPhase, t } = useI18n();
  const accountLabel = auth.user.authenticated ? t('我的项目') : t('客户登录');

  useEffect(() => {
    const titles: Record<AppTab, string> = {
      gallery: t('作品展厅'),
      process: t('公开制作日志'),
      contact: t('询价与评价'),
      account: accountLabel,
    };
    document.title = `${titles[route.tab]} | ${t('知行造境')}`;
  }, [accountLabel, locale, route.tab, t]);

  const navigateTab = (tab: AppTab) => {
    const routes: Record<AppTab, string> = {
      gallery: '/',
      process: '/process',
      contact: '/contact',
      account: auth.user.authenticated ? '/my-projects' : '/login',
    };
    navigate(routes[tab]);
  };

  const publicPage = () => {
    if (!route.found) return <NotFound onHome={() => navigate('/')} />;
    if (publicData.status === 'loading') {
      return (
        <PageStatus>
          <StatusNotice
            tone="loading"
            title={t('正在读取网站内容')}
            description={t('正在从本地 Django 服务读取公开作品、制作日志与已审核评价。')}
          />
        </PageStatus>
      );
    }
    if (publicData.status === 'error') {
      return (
        <PageStatus>
          <StatusNotice
            tone="error"
            title={t('网站内容加载失败')}
            description={publicData.error || undefined}
            action={
              <button type="button" onClick={() => void publicData.reload()} className="button-secondary">
                <RefreshCw className="h-4 w-4" />
                {t('重新加载')}
              </button>
            }
          />
        </PageStatus>
      );
    }
    if (route.tab === 'gallery') {
      if (route.workSlug && !publicData.projects.some((project) => project.slug === route.workSlug)) {
        return <NotFound title={t('作品不存在或尚未公开')} onHome={() => navigate('/')} />;
      }
      return (
        <GalleryView
          projects={publicData.projects}
          categories={publicData.categories}
          selectedProjectSlug={route.workSlug}
          onProjectChange={(project) => navigate(`/works/${project.slug}`)}
          onCategoryChange={() => navigate('/')}
        />
      );
    }
    if (route.tab === 'process')
      return (
        <WIPTimeline posts={publicData.processPosts} onOpenWork={(slug) => navigate(`/works/${slug}`)} />
      );
    return (
      <CommissionForm
        projects={publicData.projects}
        reviews={publicData.reviews}
        site={publicData.site}
        onAddReview={submitReview}
        onSubmitInquiry={submitInquiry}
      />
    );
  };

  const accountPage = () => {
    if (auth.status === 'loading')
      return (
        <PageStatus>
          <StatusNotice tone="loading" title={t('正在检查登录状态')} description={t('正在恢复安全会话。')} />
        </PageStatus>
      );
    if (auth.status === 'error' && !auth.user.authenticated)
      return (
        <PageStatus>
          <StatusNotice
            tone="error"
            title={t('登录服务暂时不可用')}
            description={auth.error || undefined}
            action={
              <button type="button" onClick={() => void auth.refresh()} className="button-secondary">
                <RefreshCw className="h-4 w-4" />
                {t('重试')}
              </button>
            }
          />
        </PageStatus>
      );
    if (!auth.user.authenticated)
      return (
        <LoginPanel
          onLogin={auth.login}
          onCustomerLogin={() => navigate('/my-projects', true)}
          notice={auth.error}
        />
      );
    return (
      <CustomerPortal
        user={auth.user}
        selectedProjectId={route.projectId}
        onOpenProject={(projectId) => navigate(`/my-projects/${projectId}`)}
        onBackToProjects={() => navigate('/my-projects')}
        onLogout={async () => {
          await auth.logout();
          navigate('/login', true);
        }}
        onChangePassword={auth.changePassword}
      />
    );
  };

  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
      <div className="min-h-dvh bg-studio-canvas font-sans text-studio-ink">
        <Sidebar activeTab={route.tab} onNavigate={navigateTab} accountLabel={accountLabel} />
        <div
          className="locale-transition-content min-h-dvh pb-[4.5rem] pt-14 lg:pb-0 lg:pl-28 lg:pt-0"
          data-locale-phase={localeTransitionPhase}
        >
          {route.tab !== 'account' && publicData.refreshError && (
            <div className="mx-auto max-w-7xl px-5 pt-4 md:px-8">
              <StatusNotice
                tone="error"
                compact
                title={t('自动同步暂时中断')}
                description={`${publicData.refreshError} ${t('页面会自动退避重试。')}`}
                action={
                  <button type="button" onClick={() => void publicData.reload()} className="button-secondary">
                    <RefreshCw className="h-4 w-4" />
                    {t('立即重试')}
                  </button>
                }
              />
            </div>
          )}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${route.tab}-${route.workSlug || route.projectId || ''}`}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
            >
              {route.tab === 'account' ? accountPage() : publicPage()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </MotionConfig>
  );
}

function PageStatus({ children }: { children: React.ReactNode }) {
  return (
    <main className="page-shell">
      <div className="page-inner">{children}</div>
    </main>
  );
}

function NotFound({ title, onHome }: { title?: string; onHome: () => void }) {
  const { t } = useI18n();
  return (
    <PageStatus>
      <StatusNotice
        tone="empty"
        title={title ? t(title) : t('页面不存在')}
        description={t('链接可能已经变更，或内容当前不可公开访问。')}
        action={
          <button type="button" onClick={onHome} className="button-secondary">
            <ArrowLeft className="h-4 w-4" />
            {t('返回作品展厅')}
          </button>
        }
      />
    </PageStatus>
  );
}
