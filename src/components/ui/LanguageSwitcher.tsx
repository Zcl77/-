import { useI18n } from '../../i18n';

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  return (
    <div
      className="inline-flex rounded-full border border-studio-line bg-white/80 p-1"
      aria-label="Language / 语言"
    >
      {(['zh-CN', 'en'] as const).map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => setLocale(value)}
          aria-pressed={locale === value}
          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${locale === value ? 'bg-studio-ink text-white' : 'text-studio-muted'}`}
        >
          {t(value === 'zh-CN' ? '中文' : 'EN')}
        </button>
      ))}
    </div>
  );
}
