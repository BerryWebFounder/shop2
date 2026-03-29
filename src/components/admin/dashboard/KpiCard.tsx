'use client'
import { cn } from '@/lib/utils'

interface KpiCardProps {
  label:       string
  value:       string | number
  subValue?:   string
  icon:        string
  changeValue?: number    // 전일 대비 변화율
  suffix?:     string
  alert?:      boolean    // 경고 표시
  onClick?:    () => void
  loading?:    boolean
}

function ChangeIndicator({ value }: { value: number }) {
  const isUp     = value > 0
  const isDown   = value < 0
  const abs      = Math.abs(value)
  const display  = abs < 0.1 ? '0%' : `${abs.toFixed(1)}%`

  return (
    <div className={cn(
      'flex items-center gap-0.5 text-[11px] font-medium',
      isUp   ? 'text-green-400' :
      isDown ? 'text-red-400'   :
               'text-ink-3'
    )}>
      <span>{isUp ? '▲' : isDown ? '▼' : '─'}</span>
      <span>{display}</span>
      <span className="text-ink-3 font-normal">전일 대비</span>
    </div>
  )
}

export function KpiCard({
  label, value, subValue, icon, changeValue,
  suffix = '', alert = false, onClick, loading = false,
}: KpiCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-xl border p-4 transition-all',
        alert  ? 'border-red-500/40 bg-red-500/5' : 'border-border bg-bg-2',
        onClick ? 'cursor-pointer hover:border-accent/50 hover:bg-bg-3' : ''
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className={cn(
            'w-9 h-9 rounded-lg flex items-center justify-center text-base',
            alert ? 'bg-red-500/15' : 'bg-bg-3'
          )}
        >
          {icon}
        </div>
        {alert && (
          <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-full animate-pulse">
            처리 필요
          </span>
        )}
      </div>

      <div>
        {loading ? (
          <div className="h-7 w-24 bg-bg-3 rounded animate-pulse mb-1" />
        ) : (
          <div className="text-2xl font-bold font-mono text-ink leading-none mb-0.5">
            {typeof value === 'number' ? value.toLocaleString() : value}{suffix}
          </div>
        )}
        <div className="text-xs text-ink-3 mb-1.5">{label}</div>
        {subValue && !loading && (
          <div className="text-[11px] text-ink-3">{subValue}</div>
        )}
        {changeValue !== undefined && !loading && (
          <ChangeIndicator value={changeValue} />
        )}
      </div>
    </div>
  )
}

// 스켈레톤 버전
export function KpiCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-bg-2 p-4">
      <div className="w-9 h-9 rounded-lg bg-bg-3 animate-pulse mb-3" />
      <div className="h-7 w-24 bg-bg-3 rounded animate-pulse mb-2" />
      <div className="h-3 w-16 bg-bg-3 rounded animate-pulse" />
    </div>
  )
}
