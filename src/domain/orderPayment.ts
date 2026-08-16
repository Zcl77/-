import { CustomerOrder } from '../types';

export function formatCnyAmount(value: string | null | undefined) {
  if (!value) return '待报价';
  const [whole, fraction = '00'] = value.split('.');
  return `¥ ${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${fraction.padEnd(2, '0').slice(0, 2)}`;
}

export function paymentPartStatus(value: CustomerOrder['depositStatus']) {
  if (value === 'recorded') return '已确认';
  if (value === 'waived') return '无需收取';
  if (value === 'pending') return '待支付';
  return '未记录';
}

export function getOrderUiActions(order: CustomerOrder) {
  const canDecide =
    order.availableActions.includes('accept_quote') && order.availableActions.includes('reject_quote');
  const mockPaymentType = order.availableActions.includes('mock_pay_deposit')
    ? 'deposit'
    : order.availableActions.includes('mock_pay_final')
      ? 'final'
      : null;
  return { canDecide, mockPaymentType } as const;
}

export function replaceOrder(orders: CustomerOrder[], updated: CustomerOrder) {
  return orders.map((order) => (order.id === updated.id ? updated : order));
}
