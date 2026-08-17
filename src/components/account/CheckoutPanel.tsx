import { FormEvent, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { CustomerOrder, OrderContactAddress } from '../../types';
import { useI18n } from '../../i18n';
import StatusNotice from '../ui/StatusNotice';

const EMPTY_ADDRESS: OrderContactAddress = {
  recipientName: '',
  email: '',
  phone: '',
  countryCode: '',
  region: '',
  city: '',
  addressLine: '',
  postalCode: '',
};

interface CheckoutPanelProps {
  order: CustomerOrder;
  onBack: () => void;
  onConfirm: (orderId: string, address: OrderContactAddress) => Promise<boolean>;
}

export default function CheckoutPanel({ order, onBack, onConfirm }: CheckoutPanelProps) {
  const { t, formatMoney } = useI18n();
  const [address, setAddress] = useState<OrderContactAddress>(order.contactAddress || EMPTY_ADDRESS);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const submittingRef = useRef(false);
  const confirmed = order.checkoutStatus === 'confirmed';

  const setField = <K extends keyof OrderContactAddress>(key: K, value: OrderContactAddress[K]) => {
    setAddress((current) => ({ ...current, [key]: value }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submittingRef.current || confirmed) return;
    submittingRef.current = true;
    setSubmitting(true);
    setNotice(null);
    try {
      const changed = await onConfirm(order.id, {
        ...address,
        countryCode: address.countryCode.trim().toUpperCase(),
      });
      setNotice({
        tone: 'success',
        text: t(changed ? '结账信息已确认。' : '结账信息已经确认，无需重复提交。'),
      });
    } catch (reason) {
      setNotice({
        tone: 'error',
        text: reason instanceof Error ? reason.message : t('结账确认失败，请稍后重试。'),
      });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const amounts = [
    [t('商品或服务小计'), order.serviceSubtotal],
    [t('运费'), order.shippingAmount],
    [t('税费'), order.taxAmount],
    [t('折扣'), order.discountAmount === '0.00' ? '0.00' : `-${order.discountAmount}`],
    [t('定金金额'), order.depositAmount],
    [t('尾款金额'), order.finalAmount],
  ];

  return (
    <section className="mx-auto max-w-4xl">
      <button type="button" onClick={onBack} className="button-secondary">
        <ArrowLeft className="h-4 w-4" />
        {t('返回报价与订单')}
      </button>
      <header className="mt-6 border-b border-studio-line pb-6">
        <span className="page-kicker">{t('安全结账确认')}</span>
        <h1 className="page-title mt-2">{t('确认订单与收货信息')}</h1>
        <p className="page-description mt-3">
          {t('确认后订单才会进入待支付状态。本页面不会连接任何真实支付渠道。')}
        </p>
      </header>

      {notice && (
        <StatusNotice
          tone={notice.tone}
          compact
          title={t(notice.tone === 'success' ? '结账状态' : '结账未完成')}
          description={notice.text}
          className="mt-6"
        />
      )}

      <div className="mt-7 grid grid-cols-1 gap-8 lg:grid-cols-5">
        <aside className="rounded-[6px] border border-studio-line bg-studio-surface p-5 lg:col-span-2">
          <span className="page-kicker">{t('订单金额明细')}</span>
          <h2 className="mt-2 font-serif text-lg font-semibold text-studio-ink">{order.orderNumber}</h2>
          <p className="mt-1 text-xs text-studio-muted">{order.currency}</p>
          <dl className="mt-5 space-y-3 text-xs">
            {amounts.map(([label, amount]) => (
              <div key={label} className="flex items-center justify-between gap-3">
                <dt className="text-studio-muted">{label}</dt>
                <dd className="text-studio-ink">{formatMoney(amount, order.currency)}</dd>
              </div>
            ))}
            <div className="flex items-center justify-between gap-3 border-t border-studio-line pt-4">
              <dt className="font-semibold text-studio-ink">{t('最终应付总额')}</dt>
              <dd className="font-serif text-lg font-semibold text-studio-ink">
                {formatMoney(order.agreedAmount, order.currency)}
              </dd>
            </div>
          </dl>
        </aside>

        <form onSubmit={submit} className="space-y-5 lg:col-span-3">
          <div>
            <span className="page-kicker">{t('联系与收货信息')}</span>
            <h2 className="section-heading mt-2">{t('收件信息')}</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <CheckoutField label={t('收件人姓名')}>
              <input
                required
                maxLength={120}
                value={address.recipientName}
                onChange={(event) => setField('recipientName', event.target.value)}
              />
            </CheckoutField>
            <CheckoutField label={t('邮箱')}>
              <input
                required
                type="email"
                maxLength={254}
                value={address.email}
                onChange={(event) => setField('email', event.target.value)}
              />
            </CheckoutField>
            <CheckoutField label={t('联系电话')}>
              <input
                required
                maxLength={40}
                value={address.phone}
                onChange={(event) => setField('phone', event.target.value)}
              />
            </CheckoutField>
            <CheckoutField label={t('国家或地区代码')} hint={t('使用两个字母，例如 CN 或 US')}>
              <input
                required
                minLength={2}
                maxLength={2}
                pattern="[A-Za-z]{2}"
                value={address.countryCode}
                onChange={(event) => setField('countryCode', event.target.value)}
              />
            </CheckoutField>
            <CheckoutField label={t('州/省')}>
              <input
                maxLength={120}
                value={address.region}
                onChange={(event) => setField('region', event.target.value)}
              />
            </CheckoutField>
            <CheckoutField label={t('城市')}>
              <input
                required
                maxLength={120}
                value={address.city}
                onChange={(event) => setField('city', event.target.value)}
              />
            </CheckoutField>
            <CheckoutField label={t('详细地址')} className="sm:col-span-2">
              <textarea
                required
                maxLength={500}
                rows={3}
                value={address.addressLine}
                onChange={(event) => setField('addressLine', event.target.value)}
              />
            </CheckoutField>
            <CheckoutField label={t('邮编')}>
              <input
                required
                maxLength={32}
                value={address.postalCode}
                onChange={(event) => setField('postalCode', event.target.value)}
              />
            </CheckoutField>
          </div>
          <label className="flex items-start gap-3 text-xs leading-6 text-studio-muted">
            <input required type="checkbox" disabled={confirmed} className="mt-1" />
            <span>{t('我已核对订单金额、币种以及联系与收货信息。')}</span>
          </label>
          <button type="submit" disabled={submitting || confirmed} className="button-primary w-full">
            <CheckCircle2 className="h-4 w-4" />
            {t(confirmed ? '结账已确认' : submitting ? '正在确认结账' : '确认订单并进入待支付')}
          </button>
        </form>
      </div>
    </section>
  );
}

function CheckoutField({
  label,
  hint,
  className = '',
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="field-label">{label}</span>
      <span className="mt-2 block [&_input]:w-full [&_textarea]:w-full">{children}</span>
      {hint && <span className="mt-1 block text-[10px] text-studio-faint">{hint}</span>}
    </label>
  );
}
