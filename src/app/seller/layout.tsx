// ================================================================
// src/app/seller/layout.tsx
// 판매자 대시보드 공통 레이아웃
// — 상단 네비게이션 바 + 인증 검증
// ================================================================
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

const NAV_ITEMS = [
  { href: '/seller',          label: '대시보드', exact: true },
  { href: '/seller/products', label: '상품 관리' },
  { href: '/seller/orders',   label: '주문 / 정산' },
  { href: '/seller/store',    label: '소호몰 설정' },
]

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?next=/seller')

  // 소호몰명 조회 (없으면 빈 문자열)
  const { data: store } = await supabase
    .from('seller_stores')
    .select('store_name, slug')
    .eq('owner_id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 상단 네비게이션 */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          {/* 로고 */}
          <div className="flex items-center gap-3">
            <Link href="/seller" className="flex items-center gap-2">
              <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-sm">
                🏪
              </div>
              <span className="text-sm font-semibold text-gray-900 hidden sm:block">
                {store?.store_name ?? '소호몰 관리'}
              </span>
            </Link>
          </div>

          {/* 네비 */}
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map(item => (
              <SellerNavLink key={item.href} href={item.href} label={item.label} />
            ))}
          </nav>

          {/* 내 소호몰 링크 */}
          {store && (
            <a
              href={`/stores/${store.slug}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-indigo-600 hover:text-indigo-800 hidden sm:block"
            >
              내 소호몰 →
            </a>
          )}
        </div>
      </header>

      <main>{children}</main>
    </div>
  )
}

// 클라이언트에서 active 처리하려면 'use client' 분리 필요 — 여기서는 서버에서 단순 렌더
function SellerNavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
    >
      {label}
    </Link>
  )
}
