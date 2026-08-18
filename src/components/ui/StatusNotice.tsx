import { AlertCircle, CheckCircle2, CircleDashed, Info, TriangleAlert } from 'lucide-react';

type NoticeTone = 'info' | 'success' | 'warning' | 'error' | 'empty' | 'loading';

interface StatusNoticeProps {
  title: string;
  description?: string;
  tone?: NoticeTone;
  compact?: boolean;
  action?: React.ReactNode;
  className?: string;
}

const ICONS = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  error: AlertCircle,
  empty: CircleDashed,
  loading: CircleDashed,
};

const TONES: Record<NoticeTone, { border: string; text: string; iconBg: string }> = {
  info: { border: 'border-studio-line', text: 'text-studio-muted', iconBg: 'bg-studio-raised' },
  success: {
    border: 'border-studio-success/40',
    text: 'text-studio-success',
    iconBg: 'bg-studio-success/10',
  },
  warning: {
    border: 'border-studio-warning/40',
    text: 'text-studio-warning',
    iconBg: 'bg-studio-warning/10',
  },
  error: { border: 'border-studio-danger/40', text: 'text-studio-danger', iconBg: 'bg-studio-danger/10' },
  empty: { border: 'border-studio-line', text: 'text-studio-muted', iconBg: 'bg-studio-raised' },
  loading: { border: 'border-studio-line', text: 'text-studio-brass', iconBg: 'bg-studio-brass/10' },
};

export default function StatusNotice({
  title,
  description,
  tone = 'info',
  compact = false,
  action,
  className = '',
}: StatusNoticeProps) {
  const Icon = ICONS[tone];
  const role = tone === 'error' ? 'alert' : 'status';
  const toneStyles = TONES[tone];

  return (
    <div
      role={role}
      aria-live={tone === 'error' ? 'assertive' : 'polite'}
      className={`border bg-studio-surface-solid ${toneStyles.border} ${compact ? 'p-3' : 'p-5 md:p-6'} rounded-[10px] shadow-[0_2px_12px_rgba(0,0,0,0.1)] ${className}`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] ${toneStyles.iconBg}`}
        >
          <Icon
            className={`h-4 w-4 ${tone === 'loading' ? 'animate-spin' : ''} ${toneStyles.text}`}
            aria-hidden="true"
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-studio-ink">{title}</p>
          {description && <p className="mt-1 max-w-2xl text-xs leading-6 text-studio-muted">{description}</p>}
          {action && <div className="mt-4">{action}</div>}
        </div>
      </div>
    </div>
  );
}
