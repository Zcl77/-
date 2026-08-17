import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('inquiry cart foundation', () => {
  it('persists only public work identifiers and removes stale entries', () => {
    const source = readFileSync(join(process.cwd(), 'src', 'hooks', 'useInquiryCart.ts'), 'utf8');
    expect(source).toContain('localStorage.setItem(STORAGE_KEY, JSON.stringify(next))');
    expect(source).toContain('projects.some((project) => project.id === id)');
    expect(source).not.toContain('price');
  });

  it('routes cart items into a single inquiry and clears after success', () => {
    const app = readFileSync(join(process.cwd(), 'src', 'App.tsx'), 'utf8');
    const form = readFileSync(join(process.cwd(), 'src', 'components', 'CommissionForm.tsx'), 'utf8');
    expect(app).toContain('selectedProjectNames={cart.items.map((item) => item.title)}');
    expect(app).toContain('onInquirySubmitted={cart.clear}');
    expect(form).toContain('购物车作品：');
  });
});
