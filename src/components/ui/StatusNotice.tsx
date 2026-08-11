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

const TONES: Record<NoticeTone, string> = {
  info: 'border-studio-line text-studio-muted',
  success: 'border-studio-success/50 text-studio-success',
  warning: 'border-studio-warning/50 text-studio-warning',
  error: 'border-studio-danger/50 text-studio-danger',
  empty: 'border-studio-line text-studio-muted',
  loading: 'border-studio-line text-studio-brass',
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

  return (
    <div
      role={role}
      aria-live={tone === 'error' ? 'assertive' : 'polite'}
      className={`border bg-studio-surface ${TONES[tone]} ${compact ? 'p-3' : 'p-5 md:p-6'} rounded-[6px] ${className}`}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-studio-ink">{title}</p>
          {description && <p className="mt-1 max-w-2xl text-xs leading-6 text-studio-muted">{description}</p>}
          {action && <div className="mt-4">{action}</div>}
        </div>
      </div>
    </div>
  );
}
