'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useSidebar } from '@/components/layout/AdminProviders'

const NAV = [
  {
    section: '대시보드',
    items: [
      { href: '/admin/dashboard', icon: '📊', label: '대시보드' },
      { href: '/admin/analytics', icon: '📈', label: '분석',    sub: true },
    ],
  },
  {
    section: '주문',
    items: [
      { href: '/admin/orders', icon: '🛒', label: '주문 관리' },
    ],
  },
  {
    section: '회원',
    items: [
      { href: '/admin/members', icon: '👥', label: '회원 관리' },
    ],
  },
  {
    section: '상품',
    items: [
      { href: '/admin/products',   icon: '📦', label: '상품 관리' },
      { href: '/admin/categories', icon: '🗂️', label: '상품 분류 관리', sub: true },
    ],
  },
  {
    section: '전시',
    items: [
      { href: '/admin/display', icon: '🎠', label: '전시 관리' },
      { href: '/admin/events',  icon: '🎉', label: '이벤트 관리', sub: true },
    ],
  },
  {
    section: '마케팅',
    items: [
      { href: '/admin/coupons', icon: '🎫', label: '쿠폰 관리' },
      { href: '/admin/points',  icon: '💎', label: '포인트 관리' },
    ],
  },
  {
    section: '상점',
    items: [
      { href: '/admin/sellers', icon: '🏪', label: '판매자 신청 관리' },
    ],
  },
  {
    section: '리뷰',
    items: [
      { href: '/admin/reviews', icon: '⭐', label: '리뷰 관리' },
    ],
  },
  {
    section: '고객센터',
    items: [
      { href: '/admin/inquiries', icon: '💬', label: '1:1 문의' },
      { href: '/admin/faqs',      icon: '❓', label: 'FAQ 관리' },
    ],
  },
  {
    section: '설정',
    items: [
      { href: '/admin/settings', icon: '⚙️', label: '설정 관리' },
    ],
  },
]

interface SidebarProps {
  storeName?: string
}

export function Sidebar({ storeName = '내 쇼핑몰' }: SidebarProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const { open, close } = useSidebar()

  // 경로 변경 시 모바일 메뉴 닫기
  useEffect(() => { close() }, [pathname])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const sidebarContent = (
    <aside className="w-60 min-w-60 h-full bg-bg-2 border-r border-border flex flex-col overflow-y-auto overflow-x-hidden">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-base flex-shrink-0">
            🛍️
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-ink truncate">{storeName}</div>
            <div className="text-[10px] text-ink-3">관리자 시스템</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2.5 py-3 space-y-0.5">
        {NAV.map((section) => (
          <div key={section.section}>
            <div className="px-2.5 pt-3 pb-1 text-[10px] font-semibold text-ink-3 uppercase tracking-widest">
              {section.section}
            </div>
            {section.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors',
                    item.sub && 'ml-3 text-xs',
                    active
                      ? 'bg-accent/15 text-accent'
                      : 'text-ink-2 hover:bg-bg-3 hover:text-ink'
                  )}
                >
                  <span className="text-[14px] flex-shrink-0">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* 하단 액션 */}
      <div className="px-2.5 py-3 border-t border-border flex-shrink-0 space-y-1">
        <Link
          href="/shop"
          target="_blank"
          rel="noreferrer"
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-ink-2 hover:bg-bg-3 hover:text-ink transition-colors"
        >
          <span className="text-[14px]">🛍️</span>
          <span>쇼핑몰 보기</span>
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-ink-2 hover:bg-bg-3 hover:text-ink transition-colors"
        >
          <span className="text-[14px]">🚪</span>
          <span>로그아웃</span>
        </button>
      </div>
    </aside>
  )

  return (
    <>
      {/* 데스크탑: 항상 표시 */}
      <div className="hidden md:flex h-screen">
        {sidebarContent}
      </div>

      {/* 모바일: 오버레이 드로어 */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* 배경 dimmer */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={close}
          />
          {/* 드로어 */}
          <div className="relative z-10 h-full">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  )
}
