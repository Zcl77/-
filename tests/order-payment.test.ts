import { describe, expect, it } from 'vitest';
import {
  formatCnyAmount,
  getOrderUiActions,
  paymentPartStatus,
  replaceOrder,
} from '../src/domain/orderPayment';
import { CustomerOrder } from '../src/types';

function orderFixture(overrides: Partial<CustomerOrder> = {}): CustomerOrder {
  return {
    id: 'order-1',
    orderNumber: 'ZX-TEST-001',
    orderType: '建筑模型',
    confirmationStatus: 'confirmed',
    agreedAmount: '1000.00',
    currency: 'CNY',
    depositAmount: '300.00',
    finalAmount: '700.00',
    quotedAt: '2026-08-16T00:00:00Z',
    quoteValidUntil: '2026-08-30T00:00:00Z',
    quoteDecision: 'accepted',
    quoteDecisionAt: '2026-08-16T01:00:00Z',
    paymentStatus: 'deposit_pending',
    depositStatus: 'pending',
    finalPaymentStatus: 'pending',
    deliveryStatus: 'not_ready',
    paymentRecords: [],
    availableActions: [],
    createdAt: '2026-08-16T00:00:00Z',
    updatedAt: '2026-08-16T00:00:00Z',
    ...overrides,
  };
}

describe('order payment presentation', () => {
  it('formats CNY amounts without floating point arithmetic', () => {
    expect(formatCnyAmount('1234567.80')).toBe('¥ 1,234,567.80');
    expect(formatCnyAmount('300')).toBe('¥ 300.00');
    expect(formatCnyAmount(null)).toBe('待报价');
  });

  it('uses backend capabilities for quote and mock payment buttons', () => {
    expect(getOrderUiActions(orderFixture({ availableActions: ['accept_quote', 'reject_quote'] }))).toEqual({
      canDecide: true,
      mockPaymentType: null,
    });
    expect(getOrderUiActions(orderFixture({ availableActions: ['mock_pay_deposit'] }))).toEqual({
      canDecide: false,
      mockPaymentType: 'deposit',
    });
    expect(getOrderUiActions(orderFixture({ availableActions: ['mock_pay_final'] }))).toEqual({
      canDecide: false,
      mockPaymentType: 'final',
    });
    expect(getOrderUiActions(orderFixture({ paymentStatus: 'deposit_pending' }))).toEqual({
      canDecide: false,
      mockPaymentType: null,
    });
  });

  it('updates the matching order immediately after each API response', () => {
    const first = orderFixture();
    const second = orderFixture({ id: 'order-2', orderNumber: 'ZX-TEST-002' });
    const afterDeposit = orderFixture({
      paymentStatus: 'final_pending',
      depositStatus: 'recorded',
      availableActions: ['mock_pay_final'],
    });

    const updated = replaceOrder([first, second], afterDeposit);
    expect(updated[0]).toBe(afterDeposit);
    expect(updated[1]).toBe(second);
  });

  it('shows consistent Chinese deposit and final status labels', () => {
    expect(paymentPartStatus('not_recorded')).toBe('未记录');
    expect(paymentPartStatus('pending')).toBe('待支付');
    expect(paymentPartStatus('recorded')).toBe('已确认');
    expect(paymentPartStatus('waived')).toBe('无需收取');
  });
});
