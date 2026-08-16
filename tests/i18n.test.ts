import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../src/services/api/client';
import {
  formatLocalizedMoney,
  getStoredLocale,
  localizedErrorMessage,
  resolveInitialLocale,
  translate,
} from '../src/i18n';

afterEach(() => vi.unstubAllGlobals());

describe('internationalization foundation', () => {
  it('uses saved language first, then browser language, then Chinese', () => {
    expect(resolveInitialLocale('zh-CN', 'en-US')).toBe('zh-CN');
    expect(resolveInitialLocale('en', 'zh-CN')).toBe('en');
    expect(resolveInitialLocale(null, 'en-GB')).toBe('en');
    expect(resolveInitialLocale(null, 'fr-FR')).toBe('zh-CN');
  });

  it('reads the persisted language after reopening the app', () => {
    vi.stubGlobal('window', {
      localStorage: { getItem: () => 'en' },
      navigator: { language: 'zh-CN' },
    });
    expect(getStoredLocale()).toBe('en');
  });

  it('translates key public, account, quote, and payment interface text', () => {
    expect(translate('en', '作品展厅')).toBe('Portfolio');
    expect(translate('en', '客户项目登录')).toBe('Client project sign-in');
    expect(translate('en', '我的项目')).toBe('My Projects');
    expect(translate('en', '定金待支付')).toBe('Deposit pending');
    expect(translate('zh-CN', '定金待支付')).toBe('定金待支付');
  });

  it('falls back to the source string when a translation is missing', () => {
    expect(translate('en', '尚未进入翻译资源的安全回退文本')).toBe('尚未进入翻译资源的安全回退文本');
  });

  it('formats CNY and USD without floating point arithmetic', () => {
    expect(formatLocalizedMoney('zh-CN', '1000.00', 'CNY')).toBe('¥1,000.00');
    expect(formatLocalizedMoney('en', '700.50', 'USD')).toBe('$700.50');
    expect(formatLocalizedMoney('en', '9007199254740993.25', 'USD')).toBe('$9,007,199,254,740,993.25');
  });

  it('maps stable API error codes instead of parsing backend Chinese messages', () => {
    const error = new ApiError('任意后端文本', 400, null, 'quote_expired');
    expect(localizedErrorMessage('en', error, '请求失败')).toBe(
      'The quote has expired. Contact the studio for a new quote.',
    );
    expect(localizedErrorMessage('zh-CN', error, '请求失败')).toBe('报价已过期，请联系工作室重新报价。');
  });
});
