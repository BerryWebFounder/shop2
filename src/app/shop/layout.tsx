import type { Metadata } from 'next'
import { CartProvider }    from '@/hooks/useCart'
import { ShopHeader }      from '@/components/shop/layout/ShopHeader'
import { ShopFooter }      from '@/components/shop/layout/ShopFooter'
import { PWAProvider }     from '@/components/shop/pwa/PWAProvider'
import { PushPrompt }      from '@/components/shop/pwa/PushPrompt'
import { RotatingPromoBar } from '@/components/shop/display/PromoBar'
import { createClient }    from '@/lib/supabase/server'

export const metadata: Metadata = {
  title:       { template: '%s | 쇼핑몰', default: '쇼핑몰' },
  description: '엄선된 상품을 만나보세요',
  manifest:    '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: '쇼핑몰' },
}

function isLive<T extends { is_active: boolean; starts_at: string | null; ends_at: string | null }>(items: T[]): T[] {
  const now = new Date()
  return items.filter(item => {
    if (!item.is_active) return false
    if (item.starts_at && new Date(item.starts_at) > now) return false
    if (item.ends_at   && new Date(item.ends_at)   < now) return false
    return true
  })
}

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const [
    { data: { user } },
    { data: settingsData },
    { data: promosData },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('admin_settings').select('store_name').single(),
    supabase.from('display_promo_bars').select('*').eq('is_active', true).order('sort_order'),
  ])

  const storeName = settingsData?.store_name ?? '쇼핑몰'
  const promos    = isLive(promosData ?? [])

  return (
    <CartProvider>
      <PWAProvider>
        <div className="shop-root min-h-screen flex flex-col" style={{ fontFamily: 'var(--font-body)' }}>
          {/* 프로모 바 */}
          {promos.length > 0 && <RotatingPromoBar bars={promos} />}

          <ShopHeader storeName={storeName} isLoggedIn={!!user} userEmail={user?.email} />

          <main className="flex-1">
            {children}
          </main>

          <ShopFooter storeName={storeName} />

          {/* 푸시 알림 권한 요청 (3초 후 표시) */}
          <PushPrompt />
        </div>
      </PWAProvider>
    </CartProvider>
  )
}
