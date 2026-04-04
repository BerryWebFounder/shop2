import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/utils'

export const metadata: Metadata = {
  title:       '상품 목록',
  description: '다양한 상품을 둘러보세요',
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string; sort?: string; page?: string }>
}) {
  const { q, cat, sort = 'newest', page = '1' } = await searchParams
  const supabase  = await createClient()
  const pageNum   = Math.max(1, parseInt(page))
  const pageSize  = 16
  const from      = (pageNum - 1) * pageSize
  const to        = from + pageSize - 1

  // cat이 UUID 형식이면 ID로, 아니면 카테고리명으로 조회
  let cat1Id: string | null = null
  if (cat) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cat)
    if (isUuid) {
      cat1Id = cat
    } else {
      const { data: catRow } = await supabase
        .from('categories')
        .select('id')
        .eq('name', cat)
        .eq('level', 1)
        .single()
      cat1Id = catRow?.id ?? null
    }
  }

  let query = supabase
    .from('products')
    .select('id, name, price, sale_price, stock, status', { count: 'exact' })
    .eq('status', 'sale')
    .range(from, to)

  if (q)      query = query.ilike('name', '%' + q + '%')
  if (cat1Id) query = query.eq('cat1_id', cat1Id)
  if (sort === 'price_asc')  query = query.order('price', { ascending: true })
  else if (sort === 'price_desc') query = query.order('price', { ascending: false })
  else query = query.order('created_at', { ascending: false })

  const { data: products, count } = await query
  const totalPages = Math.ceil((count ?? 0) / pageSize)

  return (
    <div className="px-4 md:px-8 py-10" style={{ maxWidth: 'var(--shop-max-w)', margin: '0 auto' }}>

      {/* 헤더 */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl sm:text-3xl" style={{ fontFamily: 'var(--font-display)', color: 'var(--shop-ink)' }}>
          {q ? '"' + q + '" 검색 결과' : cat ? cat : '전체 상품'}
        </h1>
        <span className="text-sm" style={{ color: 'var(--shop-ink3)' }}>
          총 {(count ?? 0).toLocaleString()}개
        </span>
      </div>

      {/* 정렬 */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
        {[
          { value: 'newest',     label: '최신순' },
          { value: 'price_asc',  label: '낮은 가격' },
          { value: 'price_desc', label: '높은 가격' },
        ].map(s => (
          <Link
            key={s.value}
            href={'?' + new URLSearchParams({ ...(q ? { q } : {}), ...(cat ? { cat } : {}), sort: s.value }).toString()}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={{
              background: sort === s.value ? 'var(--shop-ink)' : 'var(--shop-bg2)',
              color:      sort === s.value ? 'white' : 'var(--shop-ink3)',
            }}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {/* 상품 그리드 */}
      {(products ?? []).length === 0 ? (
        <div className="text-center py-24" style={{ color: 'var(--shop-ink3)' }}>
          <p className="text-4xl mb-4">🔍</p>
          <p className="text-sm">상품이 없습니다</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {(products ?? []).map(product => {
            const price = product.sale_price ?? product.price
            const discountRate = product.sale_price
              ? Math.round((1 - product.sale_price / product.price) * 100)
              : 0
            return (
              <Link key={product.id} href={'/shop/products/' + product.id} className="group block">
                <div
                  className="rounded-2xl mb-3 flex items-center justify-center aspect-square text-4xl relative overflow-hidden"
                  style={{ background: 'var(--shop-bg2)' }}
                >
                  📷
                  {discountRate > 0 && (
                    <span
                      className="absolute top-2 left-2 text-[11px] font-bold px-2 py-0.5 rounded-full text-white"
                      style={{ background: 'var(--shop-accent)' }}
                    >
                      -{discountRate}%
                    </span>
                  )}
                  {product.stock === 0 && (
                    <div
                      className="absolute inset-0 flex items-center justify-center text-sm font-bold"
                      style={{ background: 'rgba(0,0,0,0.4)', color: 'white' }}
                    >
                      품절
                    </div>
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
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <Link
              key={p}
              href={'?' + new URLSearchParams({ ...(q ? { q } : {}), sort, page: String(p) }).toString()}
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium transition-all"
              style={{
                background: p === pageNum ? 'var(--shop-ink)' : 'var(--shop-bg2)',
                color:      p === pageNum ? 'white' : 'var(--shop-ink3)',
              }}
            >
              {p}
            </Link>
          ))}
        </div>
      )}

    </div>
  )
}
