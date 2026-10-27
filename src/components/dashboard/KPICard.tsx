import { LucideIcon } from "lucide-react";

interface KPICardDetail {
  label: string;
  value: string;
  valueClassName?: string;
  labelClassName?: string;
}

interface KPICardProps {
  label: string;
  value?: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'accent';
  compact?: boolean;
  valueClassName?: string;
  labelClassName?: string;
  details?: KPICardDetail[];
}

const iconBgMap = {
  default: 'bg-secondary',
  primary: 'bg-primary/10',
  success: 'bg-success/10',
  warning: 'bg-warning/10',
  accent: 'bg-accent/20',
};

const iconColorMap = {
  default: 'text-muted-foreground',
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  accent: 'text-accent-foreground',
};

export function KPICard({
  label,
  value,
  icon: Icon,
  trend,
  trendUp,
  variant = 'default',
  compact = false,
  valueClassName,
  labelClassName,
  details,
}: KPICardProps) {
  return (
    <div className={`kpi-card flex min-w-0 flex-col overflow-hidden ${compact ? 'gap-2 p-4' : 'gap-3'}`}>
      <div className="flex items-start justify-between gap-3">
        <span
          className={`${compact ? 'text-xs' : 'text-[11px] sm:text-xs md:text-[13px]'} min-w-0 flex-1 whitespace-normal break-words font-medium uppercase leading-tight tracking-wider text-muted-foreground ${labelClassName ?? ''}`}
        >
          {label}
        </span>
        <div className={`${compact ? 'p-1.5' : 'p-2'} shrink-0 rounded-lg ${iconBgMap[variant]}`}>
          <Icon className={`${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} ${iconColorMap[variant]}`} />
        </div>
      </div>

      {details?.length ? (
        <div className="space-y-2.5">
          {details.map((detail) => (
            <div key={detail.label} className="min-w-0 space-y-0.5">
              <div className={`text-[10px] sm:text-[11px] font-medium uppercase tracking-wider text-muted-foreground ${detail.labelClassName ?? ''}`}>
                {detail.label}
              </div>
              <div
                className={`min-w-0 whitespace-normal break-words [overflow-wrap:anywhere] text-[clamp(0.95rem,0.7vw+0.85rem,1.2rem)] font-bold leading-tight tracking-tight ${detail.valueClassName ?? 'text-foreground'}`}
              >
                {detail.value}
              </div>
            </div>
          ))}
        </div>
      ) : value ? (
        <div
          className={`min-w-0 whitespace-normal break-words [overflow-wrap:anywhere] ${compact ? 'text-[clamp(1.15rem,1vw+0.95rem,1.65rem)]' : 'text-[clamp(1.05rem,1vw+0.95rem,1.9rem)]'} font-bold leading-tight tracking-tight ${valueClassName ?? 'text-foreground'}`}
        >
          {value}
        </div>
      ) : null}

      {trend && (
        <span className={`text-xs font-medium ${trendUp ? 'text-success' : 'text-destructive'}`}>
          {trend}
        </span>
      )}
    </div>
  );
}
