import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, BriefcaseBusiness, Check, LogOut, RefreshCw, Settings2, X } from 'lucide-react';
import {
  confirmOrderCheckout,
  decideQuote,
  getMyOrders,
  getMyProjects,
  mockPayOrder,
} from '../../services/api/repositories';
import { LatestRequestGate, useVisiblePolling } from '../../hooks/useVisiblePolling';
import { getOrderUiActions, replaceOrder } from '../../domain/orderPayment';
import { AuthenticatedUser, CustomerOrder, CustomerProject } from '../../types';
import StatusNotice from '../ui/StatusNotice';
import CustomerProjectDetail from './CustomerProjectDetail';
import PasswordChangePanel from './PasswordChangePanel';
import CheckoutPanel from './CheckoutPanel';
import { useI18n } from '../../i18n';

interface CustomerPortalProps {
  user: AuthenticatedUser;
  selectedProjectId: string | null;
  selectedOrderId: string | null;
  onOpenProject: (projectId: string) => void;
  onOpenCheckout: (orderId: string) => void;
  onBackToProjects: () => void;
  onLogout: () => Promise<void>;
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<unknown>;
}

const PROJECT_STATUS: Record<CustomerProject['status'], string> = {
  planning: '筹备中',
  active: '制作中',
  paused: '已暂停',
  review: '待验收',
  completed: '已完成',
  cancelled: '已取消',
};

const ORDER_STATUS: Record<CustomerOrder['confirmationStatus'], string> = {
  inquiry: '询价处理中',
  proposed: '等待确认报价',
  confirmed: '报价已接受',
  cancelled: '订单已取消',
};

const QUOTE_DECISION: Record<CustomerOrder['quoteDecision'], string> = {
  none: '尚未报价',
  pending: '等待您的决定',
  accepted: '您已接受',
  rejected: '您已拒绝',
};

const PAYMENT_STATUS: Record<CustomerOrder['paymentStatus'], string> = {
  unpaid: '未付款',
  deposit_pending: '定金待支付',
  deposit_paid: '定金已支付',
  final_pending: '尾款待支付',
  paid: '已付清',
  cancelled: '已取消',
  refunded: '已退款',
};

const PAYMENT_TYPE: Record<CustomerOrder['paymentRecords'][number]['paymentType'], string> = {
  deposit: '定金',
  final: '尾款',
  refund: '退款',
};

export default function CustomerPortal({
  user,
  selectedProjectId,
  selectedOrderId,
  onOpenProject,
  onOpenCheckout,
  onBackToProjects,
  onLogout,
  onChangePassword,
}: CustomerPortalProps) {
  const { t, formatDate, formatMoney, errorMessage } = useI18n();
  const dateTime = (value: string) =>
    formatDate(value, { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  const paymentPartStatus = (value: CustomerOrder['depositStatus']) =>
    t(
      value === 'recorded'
        ? '已确认'
        : value === 'waived'
          ? '无需收取'
          : value === 'pending'
            ? '待支付'
            : '未记录',
    );
  const [projects, setProjects] = useState<CustomerProject[]>([]);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [quoteAction, setQuoteAction] = useState<{
    orderId: string;
    decision: 'accepted' | 'rejected';
  } | null>(null);
  const [quoteMessage, setQuoteMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [paymentAction, setPaymentAction] = useState<{ orderId: string; type: 'deposit' | 'final' } | null>(
    null,
  );
  const [paymentMessage, setPaymentMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(
    null,
  );
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const requestGate = useRef(new LatestRequestGate());
  const quoteSubmitting = useRef(false);
  const paymentSubmitting = useRef(false);
  const errorMessageRef = useRef(errorMessage);

  useEffect(() => {
    errorMessageRef.current = errorMessage;
  }, [errorMessage]);

  const load = useCallback(
    async (background = false) => {
      if (user.isStaff || user.mustChangePassword) return;
      const isLatest = requestGate.current.issue();
      if (!background) {
        setStatus('loading');
        setError(null);
      }
      try {
        const [nextOrders, nextProjects] = await Promise.all([getMyOrders(), getMyProjects()]);
        if (!isLatest()) return;
        setOrders(nextOrders);
        setProjects(nextProjects);
        setStatus('ready');
        setSyncError(null);
      } catch (reason) {
        if (!isLatest()) return;
        const message = errorMessageRef.current(reason, '项目列表加载失败。');
        if (background) setSyncError(message);
        else {
          setError(message);
          setStatus('error');
        }
        throw reason;
      }
    },
    [user.isStaff, user.mustChangePassword],
  );

  useEffect(() => {
    const gate = requestGate.current;
    void load().catch(() => undefined);
    return () => gate.invalidate();
  }, [load]);
  useVisiblePolling(
    () => load(true),
    30_000,
    status === 'ready' && !user.isStaff && !user.mustChangePassword,
  );

  const submitQuoteDecision = async (orderId: string, decision: 'accepted' | 'rejected') => {
    if (quoteSubmitting.current) return;
    quoteSubmitting.current = true;
    setQuoteAction({ orderId, decision });
    setQuoteMessage(null);
    try {
      const result = await decideQuote(orderId, decision);
      setOrders((current) => replaceOrder(current, result.order));
      setQuoteMessage({
        tone: 'success',
        text: t(result.changed ? '报价决定已记录。' : '该报价决定已经记录，无需重复提交。'),
      });
      await load(true).catch(() => undefined);
    } catch (reason) {
      setQuoteMessage({
        tone: 'error',
        text: errorMessage(reason, '报价决定未能提交。'),
      });
    } finally {
      quoteSubmitting.current = false;
      setQuoteAction(null);
    }
  };

  const submitMockPayment = async (orderId: string, type: 'deposit' | 'final') => {
    if (paymentSubmitting.current) return;
    paymentSubmitting.current = true;
    setPaymentAction({ orderId, type });
    setPaymentMessage(null);
    try {
      const result = await mockPayOrder(orderId, type);
      setOrders((current) => replaceOrder(current, result.order));
      setPaymentMessage({
        tone: 'success',
        text: t(
          result.created ? '本地模拟付款已记录；该记录不代表真实收款。' : '该模拟付款已记录，无需重复提交。',
        ),
      });
      await load(true).catch(() => undefined);
    } catch (reason) {
      setPaymentMessage({
        tone: 'error',
        text: errorMessage(reason, '本地模拟付款未能完成。'),
      });
    } finally {
      paymentSubmitting.current = false;
      setPaymentAction(null);
    }
  };

  const logout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutError(null);
    try {
      await onLogout();
    } catch (reason) {
      setLogoutError(errorMessage(reason, '退出登录失败，请重试。'));
    } finally {
      setLoggingOut(false);
    }
  };
  const selectedOrder = orders.find((order) => order.id === selectedOrderId) || null;

  const submitCheckout = async (orderId: string, address: Parameters<typeof confirmOrderCheckout>[1]) => {
    try {
      const result = await confirmOrderCheckout(orderId, address);
      setOrders((current) => replaceOrder(current, result.order));
      await load(true).catch(() => undefined);
      return result.changed;
    } catch (reason) {
      throw new Error(errorMessage(reason, '结账确认失败，请稍后重试。'), { cause: reason });
    }
  };

  return (
    <div className="page-shell">
      <div className="page-inner">
        <div className="mb-8 flex flex-col justify-between gap-4 border-b border-studio-line pb-5 sm:flex-row sm:items-center">
          <div>
            <span className="page-kicker">{t('已登录')}</span>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-studio-ink">
              {user.displayName}
              {user.isDevData && (
                <span className="tag border-studio-warning/50 text-studio-warning">{t('本地开发账号')}</span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            disabled={loggingOut}
            className="button-secondary self-start sm:self-auto"
          >
            <LogOut className="h-4 w-4" />
            {t(loggingOut ? '正在退出' : '退出登录')}
          </button>
        </div>
        {logoutError && (
          <StatusNotice
            tone="error"
            compact
            title={t('退出未完成')}
            description={logoutError}
            className="mb-6"
          />
        )}

        {user.mustChangePassword ? (
          <PasswordChangePanel onChangePassword={onChangePassword} />
        ) : user.isStaff ? (
          <section className="mx-auto max-w-xl border-y border-studio-line py-10 text-center">
            <Settings2 className="mx-auto h-6 w-6 text-studio-brass" aria-hidden="true" />
            <h1 className="mt-4 font-serif text-2xl font-semibold text-studio-ink">{t('工作室管理账号')}</h1>
            <p className="mt-3 text-sm leading-7 text-studio-muted">
              {t('第一版内容、客户、订单、进度和审核统一在 Django 管理后台处理。')}
            </p>
            <a href="/admin/" className="button-primary mt-6">
              <Settings2 className="h-4 w-4" />
              {t('进入管理后台')}
            </a>
          </section>
        ) : selectedOrderId && status === 'ready' && selectedOrder ? (
          <CheckoutPanel order={selectedOrder} onBack={onBackToProjects} onConfirm={submitCheckout} />
        ) : selectedOrderId ? (
          <StatusNotice
            tone={status === 'error' || status === 'ready' ? 'error' : 'loading'}
            title={t(status === 'error' || status === 'ready' ? '结账页面无法打开' : '正在读取结账信息')}
            description={
              status === 'error'
                ? error || undefined
                : status === 'ready'
                  ? t('订单不存在或当前账号无权查看。')
                  : t('正在核对订单权限与金额。')
            }
          />
        ) : selectedProjectId ? (
          <CustomerProjectDetail projectId={selectedProjectId} onBack={onBackToProjects} />
        ) : (
          <>
            <header className="border-b border-studio-line pb-7">
              <span className="page-kicker">{t('我的项目')}</span>
              <h1 className="page-title mt-2">{t('我的项目')}</h1>
              <p className="page-description mt-3">
                {t('查看真实制作阶段、最近更新、下一步计划和需要您确认的内容。')}
              </p>
            </header>

            {syncError && (
              <StatusNotice
                tone="error"
                compact
                title={t('自动同步暂时中断')}
                description={`${syncError} ${t('页面会自动退避重试，您也可以立即重试。')}`}
                action={
                  <button type="button" onClick={() => void load(true)} className="button-secondary">
                    <RefreshCw className="h-4 w-4" />
                    {t('立即重试')}
                  </button>
                }
                className="mt-7"
              />
            )}

            {status === 'loading' && (
              <StatusNotice
                tone="loading"
                title={t('正在读取我的项目')}
                description={t('正在核对当前账号与项目成员关系。')}
                className="mt-7"
              />
            )}
            {status === 'error' && (
              <StatusNotice
                tone="error"
                title={t('项目列表加载失败')}
                description={error || undefined}
                action={
                  <button
                    type="button"
                    onClick={() => void load().catch(() => undefined)}
                    className="button-secondary"
                  >
                    <RefreshCw className="h-4 w-4" />
                    {t('重试')}
                  </button>
                }
                className="mt-7"
              />
            )}
            {status === 'ready' && orders.length > 0 && (
              <section className="mt-7" aria-labelledby="customer-orders-title">
                <div className="flex items-end justify-between gap-4 border-b border-studio-line pb-3">
                  <div>
                    <span className="page-kicker">{t('报价与订单')}</span>
                    <h2 id="customer-orders-title" className="section-heading mt-2">
                      {t('报价与订单')}
                    </h2>
                  </div>
                  <span className="text-[10px] text-studio-warning">
                    {orders.some((order) =>
                      order.availableActions.some((action) => action.startsWith('mock_pay_')),
                    )
                      ? t('仅限本地测试 / 模拟支付')
                      : t('付款记录')}
                  </span>
                </div>
                {quoteMessage && (
                  <StatusNotice
                    tone={quoteMessage.tone}
                    compact
                    title={t('报价状态')}
                    description={quoteMessage.text}
                    className="mt-4"
                  />
                )}
                {paymentMessage && (
                  <StatusNotice
                    tone={paymentMessage.tone}
                    compact
                    title={t('本地模拟付款')}
                    description={paymentMessage.text}
                    className="mt-4"
                  />
                )}
                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {orders.map((order) => {
                    const deciding = quoteAction?.orderId === order.id;
                    const { canDecide, mockPaymentType } = getOrderUiActions(order);
                    const canPayDeposit = mockPaymentType === 'deposit';
                    const canPayFinal = mockPaymentType === 'final';
                    const canCheckout = order.availableActions.includes('confirm_checkout');
                    const paying = paymentAction?.orderId === order.id;
                    return (
                      <article
                        key={order.id}
                        className="rounded-[6px] border border-studio-line bg-studio-surface p-5"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <span className="tag">{t(ORDER_STATUS[order.confirmationStatus])}</span>
                            <h3 className="mt-3 font-serif text-lg font-semibold text-studio-ink">
                              {order.orderType}
                            </h3>
                            <p className="mt-1 text-xs text-studio-faint">
                              {t('订单编号')} {order.orderNumber}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="block text-[10px] text-studio-faint">{t('订单总额')}</span>
                            <strong className="mt-1 block font-serif text-xl text-studio-ink">
                              {formatMoney(order.agreedAmount, order.currency)}
                            </strong>
                          </div>
                        </div>
                        <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-[4px] bg-studio-line text-xs">
                          <OrderState label={t('报价决定')} value={t(QUOTE_DECISION[order.quoteDecision])} />
                          <OrderState label={t('币种')} value={order.currency} />
                          <OrderState label={t('付款状态')} value={t(PAYMENT_STATUS[order.paymentStatus])} />
                          <OrderState
                            label={t('定金金额')}
                            value={formatMoney(order.depositAmount, order.currency)}
                          />
                          <OrderState label={t('定金状态')} value={paymentPartStatus(order.depositStatus)} />
                          <OrderState
                            label={t('尾款金额')}
                            value={formatMoney(order.finalAmount, order.currency)}
                          />
                          <OrderState
                            label={t('尾款状态')}
                            value={paymentPartStatus(order.finalPaymentStatus)}
                          />
                          <OrderState
                            label={t('交付')}
                            value={
                              order.deliveryStatus === 'delivered'
                                ? t('已交付')
                                : order.deliveryStatus === 'ready'
                                  ? t('待交付')
                                  : t('未交付')
                            }
                          />
                        </dl>
                        {order.quoteValidUntil && (
                          <p className="mt-3 text-xs text-studio-faint">
                            {t('报价有效期')} {dateTime(order.quoteValidUntil)}
                          </p>
                        )}
                        {canDecide && (
                          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <button
                              type="button"
                              disabled={Boolean(quoteAction)}
                              onClick={() => void submitQuoteDecision(order.id, 'accepted')}
                              className="button-primary"
                            >
                              <Check className="h-4 w-4" />
                              {t(deciding && quoteAction?.decision === 'accepted' ? '正在接受' : '接受报价')}
                            </button>
                            <button
                              type="button"
                              disabled={Boolean(quoteAction)}
                              onClick={() => void submitQuoteDecision(order.id, 'rejected')}
                              className="button-secondary"
                            >
                              <X className="h-4 w-4" />
                              {t(deciding && quoteAction?.decision === 'rejected' ? '正在拒绝' : '拒绝报价')}
                            </button>
                          </div>
                        )}
                        {canCheckout && (
                          <button
                            type="button"
                            onClick={() => onOpenCheckout(order.id)}
                            className="button-primary mt-4 w-full"
                          >
                            {t('进入结账确认')}
                            <ArrowRight className="ml-auto h-4 w-4" />
                          </button>
                        )}
                        {(canPayDeposit || canPayFinal) && (
                          <div className="mt-4 border-t border-studio-line pt-4">
                            <p className="mb-3 text-xs leading-6 text-studio-warning">
                              {t('本地测试功能：不会发起真实扣款，也不连接任何支付渠道。')}
                            </p>
                            <button
                              type="button"
                              disabled={Boolean(paymentAction)}
                              onClick={() =>
                                void submitMockPayment(order.id, canPayDeposit ? 'deposit' : 'final')
                              }
                              className="button-secondary w-full"
                            >
                              {t(
                                paying
                                  ? '正在记录模拟付款'
                                  : canPayDeposit
                                    ? '本地测试 / 模拟支付定金'
                                    : '本地测试 / 模拟支付尾款',
                              )}
                            </button>
                          </div>
                        )}
                        {order.paymentRecords.length > 0 && (
                          <div className="mt-4 border-t border-studio-line pt-4">
                            <h4 className="text-xs font-semibold text-studio-ink">{t('付款记录摘要')}</h4>
                            <ul className="mt-2 space-y-2 text-xs text-studio-muted">
                              {order.paymentRecords.slice(0, 3).map((payment) => (
                                <li key={payment.id} className="flex items-center justify-between gap-3">
                                  <span>
                                    {t(PAYMENT_TYPE[payment.paymentType])} · {t('本地模拟')} ·{' '}
                                    {payment.status === 'succeeded' ? t('成功') : payment.status}
                                  </span>
                                  <span>{formatMoney(payment.amount, payment.currency)}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            )}
            {status === 'ready' && projects.length === 0 && (
              <StatusNotice
                tone="empty"
                title={t('当前账号尚未绑定项目')}
                description={t('请联系工作室核对账号或项目成员信息。')}
                className="mt-7"
              />
            )}
            {status === 'ready' && projects.length > 0 && (
              <div className="mt-7 grid grid-cols-1 gap-4 lg:grid-cols-2">
                {projects.map((project) => (
                  <article
                    key={project.id}
                    className="rounded-[6px] border border-studio-line bg-studio-surface p-5 md:p-6"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <span className="tag">{t(PROJECT_STATUS[project.status])}</span>
                        <h2 className="mt-3 font-serif text-xl font-semibold text-studio-ink">
                          {project.name}
                        </h2>
                      </div>
                      {project.unreadUpdateCount > 0 && (
                        <span className="tag shrink-0 border-studio-warning/50 text-studio-warning">
                          {project.unreadUpdateCount} {t('条未读')}
                        </span>
                      )}
                    </div>
                    <div className="mt-5 flex items-center justify-between text-xs text-studio-muted">
                      <span>{project.currentStage?.name || t('阶段待设置')}</span>
                      <strong className="text-studio-ink">{project.completionPercent}%</strong>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-studio-line">
                      <span
                        className="block h-full bg-studio-brass"
                        style={{ width: `${project.completionPercent}%` }}
                      />
                    </div>
                    <dl className="mt-5 grid grid-cols-1 gap-3 border-y border-studio-line py-4 text-xs sm:grid-cols-2">
                      <div>
                        <dt className="text-studio-faint">{t('最近进度')}</dt>
                        <dd className="mt-1 leading-6 text-studio-ink">
                          {project.latestUpdate?.title || t('尚未发布')}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-studio-faint">{t('更新时间')}</dt>
                        <dd className="mt-1 leading-6 text-studio-ink">{dateTime(project.updatedAt)}</dd>
                      </div>
                    </dl>
                    <button
                      type="button"
                      onClick={() => onOpenProject(project.id)}
                      className="button-secondary mt-5 w-full"
                    >
                      <BriefcaseBusiness className="h-4 w-4" />
                      {t('查看项目详情')}
                      <ArrowRight className="ml-auto h-4 w-4" />
                    </button>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function OrderState({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-studio-raised p-3">
      <dt className="text-studio-faint">{label}</dt>
      <dd className="mt-1 text-studio-ink">{value}</dd>
    </div>
  );
}
