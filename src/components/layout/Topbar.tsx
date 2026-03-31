'use client'
import { NotificationBell } from '@/components/admin/realtime/NotificationBell'

interface TopbarProps {
  title:       string
  adminEmail?: string
  subtitle?:   string
}

export function Topbar({ title, adminEmail, subtitle }: TopbarProps) {
  const initial = adminEmail ? adminEmail[0].toUpperCase() : 'A'

  return (
    <header className="h-14 bg-bg-2 border-b border-border flex items-center px-4 md:px-6 gap-3 flex-shrink-0 z-10">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-ink leading-none">{title}</div>
        {subtitle && <div className="text-xs text-ink-3 mt-0.5">{subtitle}</div>}
      </div>
      <div className="flex items-center gap-3">
        {/* 실시간 알림 벨 */}
        <NotificationBell />
        <div className="text-xs text-ink-3 font-mono hidden md:block">{adminEmail}</div>
        <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center text-sm font-bold text-white select-none">
          {initial}
        </div>
      </div>
    </header>
  )
}
