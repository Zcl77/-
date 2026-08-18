import { useI18n } from '../../i18n';

export default function LanguageSwitcher() {
  const { locale, setLocale, t, isChangingLocale } = useI18n();
  return (
    <div
      className="grid w-[5.5rem] shrink-0 grid-cols-2 rounded-full border border-studio-line bg-studio-raised/80 p-1 backdrop-blur-sm"
      role="group"
      aria-label={t('语言切换')}
      aria-busy={isChangingLocale}
    >
      {(['zh-CN', 'en'] as const).map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => setLocale(value)}
          aria-pressed={locale === value}
          aria-disabled={isChangingLocale}
          aria-label={t(value === 'zh-CN' ? '切换到简体中文' : '切换到英文')}
          className={`locale-switch-option min-w-0 rounded-full px-1 py-1 text-center text-[10px] font-semibold ${locale === value ? 'bg-studio-brass text-studio-canvas shadow-[0_1px_4px_rgba(196,165,114,0.3)]' : 'text-studio-muted hover:text-studio-ink'} ${isChangingLocale ? 'cursor-wait' : ''}`}
        >
          {t(value === 'zh-CN' ? '中文' : 'EN')}
        </button>
      ))}
    </div>
  );
}
