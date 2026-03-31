'use client'
import { NotificationBell } from '@/components/admin/realtime/NotificationBell'

interface TopbarProps {
  title:       string
  adminEmail?: string
  subtitle?:   string
  onMenuToggle?: () => void  // 모바일 메뉴 토글
}

export function Topbar({ title, adminEmail, subtitle, onMenuToggle }: TopbarProps) {
  const initial = adminEmail ? adminEmail[0].toUpperCase() : 'A'

  return (
    <header className="h-14 bg-bg-2 border-b border-border flex items-center px-4 md:px-6 gap-3 flex-shrink-0 z-10">
      {/* 모바일 햄버거 버튼 */}
      <button
        onClick={onMenuToggle}
        className="md:hidden w-8 h-8 flex flex-col items-center justify-center gap-1.5 flex-shrink-0"
        aria-label="메뉴"
      >
        <span className="w-5 h-0.5 bg-ink-2 rounded-full" />
        <span className="w-5 h-0.5 bg-ink-2 rounded-full" />
        <span className="w-5 h-0.5 bg-ink-2 rounded-full" />
      </button>

      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-ink leading-none">{title}</div>
        {subtitle && <div className="text-xs text-ink-3 mt-0.5">{subtitle}</div>}
      </div>
      <div className="flex items-center gap-3">
        <NotificationBell />
        <div className="text-xs text-ink-3 font-mono hidden md:block">{adminEmail}</div>
        <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center text-sm font-bold text-white select-none">
          {initial}
        </div>
      </div>
    </header>
  )
}
