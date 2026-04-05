// ================================================================
// src/app/stores/[slug]/page.tsx
// 상점 공개 스토어프론트 (Server Component)
// Next.js 15.3+ — params는 Promise<...>
// ================================================================

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { SellerStore, SellerProduct } from '@/lib/types/v2'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function StorePage({ params }: Props) {
  const { slug }  = await params
  const supabase  = await createClient()

  // 상점 정보
  const { data: store } = await supabase
    .from('seller_stores')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'active')
    .single<SellerStore>()

  if (!store) notFound()

  // 판매 중·품절 상품
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('store_id', store.id)
    .in('status', ['active', 'sold_out'])
    .order('created_at', { ascending: false })
    .returns<SellerProduct[]>()

  const themeColor = store.theme_color || '#6366f1'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 배너 */}
      <div
        className="relative h-48 sm:h-64 w-full overflow-hidden"
        style={{ backgroundColor: `${themeColor}20` }}>
        {store.banner_url && (
          <img src={store.banner_url} alt="banner" className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
      </div>

      <div className="max-w-5xl mx-auto px-4">
        {/* 상점 헤더 */}
        <div className="relative -mt-10 mb-8 flex items-end gap-5">
          <div className="w-20 h-20 rounded-2xl border-4 border-white shadow-lg bg-white overflow-hidden shrink-0">
            {store.logo_url ? (
              <img src={store.logo_url} alt="logo" className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-3xl"
                style={{ backgroundColor: `${themeColor}20` }}>
                🏪
              </div>
            )}
          </div>
          <div className="pb-2">
            <h1 className="text-2xl font-bold text-gray-900">{store.store_name}</h1>
            {store.tagline && (
              <p className="text-gray-500 text-sm mt-0.5">{store.tagline}</p>
            )}
            <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
              <span>상품 {store.total_products}개</span>
              {store.contact_email && <span>· {store.contact_email}</span>}
            </div>
          </div>
        </div>

        {/* 소개 */}
        {store.intro && (
          <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
            <p className="text-sm text-gray-600 leading-relaxed">{store.intro}</p>
          </div>
        )}

        {/* 상품 그리드 */}
        <div className="mb-10">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">상품</h2>
          {!products?.length ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-2xl mb-2">📭</p>
              <p className="text-sm">등록된 상품이 없습니다</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {products.map(p => (
                <ProductCard key={p.id} product={p} storeSlug={slug} />
              ))}
            </div>
          )}
        </div>

        {/* 정책 */}
        {(store.shipping_policy || store.return_policy) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            {store.shipping_policy && (
              <PolicyCard icon="📦" title="배송 정책" text={store.shipping_policy} />
            )}
            {store.return_policy && (
              <PolicyCard icon="🔄" title="반품/교환 정책" text={store.return_policy} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── 서브 컴포넌트 ─────────────────────────────────────────────────

function ProductCard({ product: p, storeSlug }: { product: SellerProduct; storeSlug: string }) {
  return (
    <Link
      href={`/stores/${storeSlug}/products/${p.id}`}
      className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group">
      <div className="aspect-square bg-gray-100 overflow-hidden">
        {p.images[0] ? (
          <img
            src={p.images[0]} alt={p.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl text-gray-300">
            📦
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="text-sm font-medium text-gray-900 line-clamp-2">{p.name}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-sm font-bold text-gray-900">{p.price.toLocaleString()}원</span>
          {p.compare_price && (
            <span className="text-xs text-gray-400 line-through">
              {p.compare_price.toLocaleString()}원
            </span>
          )}
        </div>
        {p.status === 'sold_out' && (
          <span className="inline-block mt-1.5 text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
            품절
          </span>
        )}
      </div>
    </Link>
  )
}

function PolicyCard({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-2">{icon} {title}</h3>
      <p className="text-xs text-gray-500 leading-relaxed">{text}</p>
    </div>
  )
}
