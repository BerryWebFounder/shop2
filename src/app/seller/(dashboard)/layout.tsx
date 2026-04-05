import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import Link from 'next/link'

const NAV_ITEMS = [
  { href: '/seller',          label: '대시보드' },
  { href: '/seller/products', label: '상품 관리' },
  { href: '/seller/display',  label: '전시 관리' },
  { href: '/seller/orders',   label: '주문 / 정산' },
  { href: '/seller/store',    label: '상점 설정' },
]

export default async function SellerDashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  // 1. 로그인 확인
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/seller')

  // 2. role 확인 — service role key로 RLS 우회
  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { data: profile } = await svc
    .from('profiles')
    .select('role, seller_status')
    .eq('id', user.id)
    .single()

  const role         = profile?.role         ?? 'customer'
  const sellerStatus = profile?.seller_status ?? null

  // 3. 접근 제어
  if (role !== 'seller' && role !== 'admin') {
    if (sellerStatus === 'pending') redirect('/seller/apply/pending')
    redirect('/seller/apply')
  }
  if (role === 'seller' && sellerStatus !== 'approved') {
    redirect('/seller/apply/pending')
  }

  // 4. 상점 정보
  const { data: store } = await svc
    .from('seller_stores')
    .select('store_name, slug')
    .eq('owner_id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/seller" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-sm">🏪</div>
            <span className="text-sm font-semibold text-gray-900 hidden sm:block">
              {store?.store_name ?? '상점 관리'}
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map(item => (
              <Link key={item.href} href={item.href}
                className="px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm text-gray-600
                  hover:text-gray-900 hover:bg-gray-100 transition-colors whitespace-nowrap">
                {item.label}
              </Link>
            ))}
          </nav>

          {store && (
            <a href={`/stores/${store.slug}`} target="_blank" rel="noreferrer"
              className="text-xs text-indigo-600 hover:text-indigo-800 hidden sm:block">
              내 상점 →
            </a>
          )}
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
