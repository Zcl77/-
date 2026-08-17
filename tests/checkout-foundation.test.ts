import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseRoute } from '../src/domain/routes';

describe('international checkout presentation', () => {
  it('keeps checkout on a stable order route', () => {
    expect(parseRoute('/my-projects/orders/550e8400-e29b-41d4-a716-446655440000/checkout')).toMatchObject({
      tab: 'account',
      orderId: '550e8400-e29b-41d4-a716-446655440000',
      found: true,
    });
  });

  it('uses controlled address fields so locale changes do not clear entered values', () => {
    const source = readFileSync(
      join(process.cwd(), 'src', 'components', 'account', 'CheckoutPanel.tsx'),
      'utf8',
    );
    expect(source).toContain('useState<OrderContactAddress>');
    expect(source).toContain('value={address.recipientName}');
    expect(source).toContain("setField('addressLine'");
    expect(source).not.toMatch(/key=\{(?:locale|language)\}/);
    expect(source).not.toContain('window.location');
  });

  it('does not expose amount inputs in the checkout form', () => {
    const source = readFileSync(
      join(process.cwd(), 'src', 'components', 'account', 'CheckoutPanel.tsx'),
      'utf8',
    );
    expect(source).not.toMatch(
      /setField\('(agreedAmount|serviceSubtotal|shippingAmount|taxAmount|discountAmount)'/,
    );
  });
});
