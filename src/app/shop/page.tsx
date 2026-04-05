import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { HeroSlider }  from '@/components/shop/display/HeroSlider'
import { BannerGrid }  from '@/components/shop/display/BannerGrid'
import { PopupModal }  from '@/components/shop/display/PopupModal'
import { formatPrice } from '@/lib/utils'

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient()
  const { data: settings } = await supabase
    .from('admin_settings').select('store_name').single()
  const storeName = settings?.store_name ?? '쇼핑몰'
  return {
    title:       storeName,
    description: storeName + ' — 엄선된 상품과 합리적인 가격',
  }
}

function filterLive<T extends { is_active: boolean; starts_at: string | null; ends_at: string | null }>(items: T[]): T[] {
  const now = new Date()
  return items.filter(item => {
    if (!item.is_active) return false
    if (item.starts_at && new Date(item.starts_at) > now) return false
    if (item.ends_at   && new Date(item.ends_at)   < now) return false
    return true
  })
}

export default async function ShopHomePage() {
  const supabase = await createClient()

  const [
    { data: slidesRaw },
    { data: bannersRaw },
    { data: popupsRaw },
    { data: displayItemsRaw },
  ] = await Promise.all([
    supabase.from('display_slides').select('*').order('sort_order'),
    supabase.from('display_banners').select('*').eq('zone', 'main').order('sort_order'),
    supabase.from('display_popups').select('*').order('sort_order'),
    supabase.from('display_items')
      .select(`
        sort_order,
        product:products(id, name, price, sale_price,
          images:product_images(public_url, is_primary))
      `)
      .eq('is_active', true)
      .eq('display_type', 'default')
      .lte('start_date', new Date().toISOString().slice(0,10))
      .gte('end_date',   new Date().toISOString().slice(0,10))
      .order('sort_order')
      .limit(8),
  ])

  const slides  = filterLive(slidesRaw  ?? [])
  const banners = filterLive(bannersRaw ?? [])
  const popups  = filterLive(popupsRaw  ?? [])
  const featuredProducts = (displayItemsRaw ?? [])
    .map((d: any) => d.product)
    .filter(Boolean)

  return (
    <div style={{ background: 'var(--shop-bg)' }}>

      {slides.length > 0 ? (
        <HeroSlider slides={slides} autoPlayMs={5000} height="85vh" />
      ) : (
        <div
          className="flex flex-col items-center justify-center text-center px-6"
          style={{ height: '60vh', background: 'var(--shop-bg2)' }}
        >
          <h1
            className="text-4xl sm:text-5xl md:text-7xl mb-4"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--shop-ink)' }}
          >
            Welcome
          </h1>
          <p className="text-sm mb-8" style={{ color: 'var(--shop-ink3)' }}>
            엄선된 상품을 만나보세요
          </p>
          <Link
            href="/shop/products"
            className="px-8 py-3.5 rounded-full text-sm font-semibold transition-all hover:opacity-90"
            style={{ background: 'var(--shop-ink)', color: 'white' }}
          >
            쇼핑 시작하기
          </Link>
        </div>
      )}

      {banners.length > 0 && (
        <section className="px-4 md:px-8 py-10" style={{ maxWidth: 'var(--shop-max-w)', margin: '0 auto' }}>
          <BannerGrid banners={banners} />
        </section>
      )}

      {(featuredProducts ?? []).length > 0 && (
        <section className="px-4 md:px-8 py-12" style={{ maxWidth: 'var(--shop-max-w)', margin: '0 auto' }}>
          <div className="flex items-end justify-between mb-8">
            <h2 className="text-2xl sm:text-3xl" style={{ fontFamily: 'var(--font-display)', color: 'var(--shop-ink)' }}>
              전시 상품
            </h2>
            <Link href="/shop/products" className="text-sm underline underline-offset-4" style={{ color: 'var(--shop-ink3)' }}>
              전체 보기
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(featuredProducts ?? []).map((product: any) => {
              const price    = product.sale_price ?? product.price
              const imgArr   = product.images as { public_url: string; is_primary: boolean }[] | undefined
              const imgUrl   = imgArr?.find(i => i.is_primary)?.public_url ?? imgArr?.[0]?.public_url
              return (
                <Link key={product.id} href={'/shop/products/' + product.id} className="group block">
                  <div
                    className="rounded-2xl mb-3 overflow-hidden aspect-square flex items-center justify-center text-4xl"
                    style={{ background: 'var(--shop-bg2)', color: 'var(--shop-border)' }}
                  >
                    {imgUrl ? (
                      <img
                        src={imgUrl}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      '📷'
                    )}
                  </div>
                  <p className="text-sm font-medium mb-1 line-clamp-2" style={{ color: 'var(--shop-ink)' }}>
                    {product.name}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold" style={{ color: 'var(--shop-ink)' }}>
                      {formatPrice(price)}
                    </span>
                    {product.sale_price && (
                      <span className="text-xs line-through" style={{ color: 'var(--shop-ink3)' }}>
                        {formatPrice(product.price)}
                      </span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {popups.length > 0 && <PopupModal popups={popups} />}

    </div>
  )
}
