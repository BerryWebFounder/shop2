import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  noPadding?: boolean
}

export function Card({ children, className, noPadding }: CardProps) {
  return (
    <div className={cn(
      'bg-bg-2 border border-border rounded-xl',
      !noPadding && 'p-5',
      className
    )}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('text-xs font-semibold text-ink-2 uppercase tracking-wide mb-4 flex items-center gap-2', className)}>
      {children}
    </div>
  )
}

export function StatCard({
  label,
  value,
  change,
  changeType = 'neutral',
  icon,
}: {
  label: string
  value: string | number
  change?: string
  changeType?: 'up' | 'down' | 'neutral'
  icon?: string
}) {
  return (
    <Card>
      <div className="flex items-start justify-between mb-2">
        <div className="text-[11px] font-medium text-ink-3 uppercase tracking-wide">{label}</div>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
      <div className="text-2xl font-bold font-mono text-ink mb-1">{value}</div>
      {change && (
        <div className={cn('text-xs', {
          'text-green-400': changeType === 'up',
          'text-red-400': changeType === 'down',
          'text-ink-3': changeType === 'neutral',
        })}>
          {changeType === 'up' && '▲ '}{changeType === 'down' && '▼ '}{change}
        </div>
      )}
    </Card>
  )
}

export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between mb-5 gap-3 flex-wrap">
      <div>
        <h1 className="text-lg font-bold text-ink">{title}</h1>
        {subtitle && <p className="text-sm text-ink-3 mt-0.5">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2 flex-wrap">{children}</div>}
    </div>
  )
}

export function Notice({
  children,
  variant = 'warning',
}: {
  children: React.ReactNode
  variant?: 'warning' | 'info' | 'danger'
}) {
  const styles = {
    warning: 'bg-yellow-500/8 border-yellow-500/30 text-yellow-400',
    info: 'bg-blue-500/8 border-blue-500/30 text-blue-400',
    danger: 'bg-red-500/8 border-red-500/30 text-red-400',
  }
  return (
    <div className={cn('flex items-start gap-2.5 border rounded-lg px-4 py-3 text-xs mb-4', styles[variant])}>
      <span className="shrink-0 mt-0.5">{variant === 'warning' ? '⚠️' : variant === 'danger' ? '⛔' : 'ℹ️'}</span>
      <div>{children}</div>
    </div>
  )
}
