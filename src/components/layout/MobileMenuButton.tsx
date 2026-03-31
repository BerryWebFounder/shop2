'use client'
// 모바일 전용 상단 바 — Sidebar 토글 + 쇼핑몰명
import { useSidebar } from '@/components/layout/AdminProviders'

export function MobileMenuButton({ storeName }: { storeName: string }) {
  const { toggle } = useSidebar()

  return (
    <div className="md:hidden flex items-center gap-3 h-14 px-4 bg-bg-2 border-b border-border flex-shrink-0">
      <button
        onClick={toggle}
        className="w-8 h-8 flex flex-col items-center justify-center gap-1.5"
        aria-label="메뉴 열기"
      >
        <span className="w-5 h-0.5 bg-ink-2 rounded-full" />
        <span className="w-5 h-0.5 bg-ink-2 rounded-full" />
        <span className="w-5 h-0.5 bg-ink-2 rounded-full" />
      </button>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-accent rounded-md flex items-center justify-center text-sm">🛍️</div>
        <span className="text-sm font-semibold text-ink">{storeName}</span>
      </div>
    </div>
  )
}
