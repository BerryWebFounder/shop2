import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { createServiceClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/utils'

export const metadata: Metadata = {
  title:       '상품 목록',
  description: '다양한 상품을 둘러보세요',
}

type ViewMode = 'grid' | 'grid2' | 'list'

// ── 상품 이미지 추출 ─────────────────────────────────────────────
function getMainImage(images: { public_url: string; is_primary: boolean }[]) {
  return (images.find(i => i.is_primary) ?? images[0])?.public_url ?? null
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string; sort?: string; page?: string; view?: string }>
}) {
  const { q, cat, sort = 'newest', page = '1', view = 'grid' } = await searchParams
  const supabase   = createServiceClient()
  const viewMode   = (view as ViewMode) || 'grid'
  const pageNum    = Math.max(1, parseInt(page))
  const pageSize   = 16
  const from       = (pageNum - 1) * pageSize
  const to         = from + pageSize - 1

  // 카테고리명 조회
  let catName = ''
  if (cat) {
    const { data: catRow } = await supabase
      .from('categories').select('name').eq('id', cat).single()
    catName = catRow?.name ?? ''
  }

  // 상품 조회
  let query = supabase
    .from('products')
    .select(`
      id, name, price, sale_price, stock, status, summary,
      images:product_images(public_url, sort_order, is_primary)
    `, { count: 'exact' })
    .eq('status', 'sale')
    .range(from, to)

  if (q)   query = query.ilike('name', '%' + q + '%')
  if (cat) query = query.eq('cat1_id', cat)
  if (sort === 'price_asc')   query = query.order('price', { ascending: true })
  else if (sort === 'price_desc') query = query.order('price', { ascending: false })
  else query = query.order('created_at', { ascending: false })

  const { data: products, count } = await query
  const totalPages = Math.ceil((count ?? 0) / pageSize)

  // URL 파라미터 빌더
  const buildUrl = (params: Record<string, string>) => {
    const base: Record<string, string> = {
      ...(q    ? { q }    : {}),
      ...(cat  ? { cat }  : {}),
      ...(sort !== 'newest' ? { sort } : {}),
      ...(page !== '1' ? { page } : {}),
      ...(view !== 'grid' ? { view } : {}),
    }
    return '?' + new URLSearchParams({ ...base, ...params }).toString()
  }

  // 뷰 모드별 그리드 클래스
  const gridClass = viewMode === 'grid2' ? 'grid grid-cols-2 gap-4 mb-10'
    : viewMode === 'list' ? 'flex flex-col gap-3 mb-10'
    : 'grid grid-cols-2 md:grid-cols-4 gap-4 mb-10'

  return (
    <div className="px-4 md:px-8 py-8 md:py-10" style={{ maxWidth: 'var(--shop-max-w)', margin: '0 auto' }}>

      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl" style={{ fontFamily: 'var(--font-display)', color: 'var(--shop-ink)' }}>
          {q ? `"${q}" 검색 결과` : catName || '전체 상품'}
        </h1>
        <span className="text-sm" style={{ color: 'var(--shop-ink3)' }}>
          총 {(count ?? 0).toLocaleString()}개
        </span>
      </div>

      {/* 툴바: 정렬 + 뷰 모드 */}
      <div className="flex items-center justify-between mb-6 gap-3">
        {/* 정렬 */}
        <div className="flex gap-2 overflow-x-auto pb-1 flex-1">
          {[
            { value: 'newest',     label: '최신순' },
            { value: 'price_asc',  label: '낮은 가격' },
            { value: 'price_desc', label: '높은 가격' },
          ].map(s => (
            <Link
              key={s.value}
              href={buildUrl({ sort: s.value, page: '1' })}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap"
              style={{
                background: sort === s.value ? 'var(--shop-ink)' : 'var(--shop-bg2)',
                color:      sort === s.value ? 'white' : 'var(--shop-ink3)',
              }}
            >
              {s.label}
            </Link>
          ))}
        </div>

        {/* 뷰 모드 전환 버튼 */}
        <div className="flex gap-1 flex-shrink-0">
          {([
            { mode: 'grid',  icon: (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/>
                <rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/>
              </svg>
            ), title: '4열 격자' },
            { mode: 'grid2', icon: (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <rect x="1" y="1" width="6" height="14" rx="1"/><rect x="9" y="1" width="6" height="14" rx="1"/>
              </svg>
            ), title: '2열 격자' },
            { mode: 'list',  icon: (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <rect x="1" y="1" width="14" height="3" rx="1"/><rect x="1" y="6.5" width="14" height="3" rx="1"/>
                <rect x="1" y="12" width="14" height="3" rx="1"/>
              </svg>
            ), title: '리스트' },
          ] as const).map(({ mode, icon, title }) => (
            <Link
              key={mode}
              href={buildUrl({ view: mode })}
              title={title}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
              style={{
                background: viewMode === mode ? 'var(--shop-ink)' : 'var(--shop-bg2)',
                color:      viewMode === mode ? 'white' : 'var(--shop-ink3)',
              }}
            >
              {icon}
            </Link>
          ))}
        </div>
      </div>

      {/* 상품 목록 */}
      {(products ?? []).length === 0 ? (
        <div className="text-center py-24" style={{ color: 'var(--shop-ink3)' }}>
          <p className="text-4xl mb-4">🔍</p>
          <p className="text-sm">상품이 없습니다</p>
        </div>
      ) : (
        <div className={gridClass}>
          {(products ?? []).map(product => {
            const imgs         = (product as any).images ?? []
            const mainImg      = getMainImage(imgs)
            const price        = product.sale_price ?? product.price
            const discountRate = product.sale_price
              ? Math.round((1 - product.sale_price / product.price) * 100) : 0
            const isSoldOut    = product.stock === 0

            // ── 리스트 뷰 ──────────────────────────────────────────
            if (viewMode === 'list') {
              return (
                <Link
                  key={product.id}
                  href={'/shop/products/' + product.id}
                  className="flex gap-4 p-4 rounded-2xl group transition-all"
                  style={{ background: 'var(--shop-bg2)' }}
                >
                  {/* 썸네일 */}
                  <div
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl flex-shrink-0 relative overflow-hidden flex items-center justify-center text-2xl"
                    style={{ background: 'var(--shop-bg3)' }}
                  >
                    {mainImg
                      ? <Image src={mainImg} alt={product.name} fill className="object-cover" sizes="112px" />
                      : <span>📷</span>}
                    {discountRate > 0 && (
                      <span className="absolute top-1.5 left-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                        style={{ background: 'var(--shop-accent)' }}>
                        -{discountRate}%
                      </span>
                    )}
                    {isSoldOut && (
                      <div className="absolute inset-0 flex items-center justify-center text-xs font-bold"
                        style={{ background: 'rgba(0,0,0,0.45)', color: 'white' }}>품절</div>
                    )}
                  </div>

                  {/* 정보 */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <p className="text-sm font-medium mb-1 line-clamp-2 group-hover:underline"
                      style={{ color: 'var(--shop-ink)' }}>
                      {product.name}
                    </p>
                    {(product as any).summary && (
                      <p className="text-xs mb-2 line-clamp-1" style={{ color: 'var(--shop-ink3)' }}>
                        {(product as any).summary}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold" style={{ color: 'var(--shop-ink)' }}>
                        {formatPrice(price)}
                      </span>
                      {product.sale_price && (
                        <span className="text-xs line-through" style={{ color: 'var(--shop-ink3)' }}>
                          {formatPrice(product.price)}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              )
            }

            // ── 격자 뷰 (grid / grid2) ──────────────────────────────
            return (
              <Link key={product.id} href={'/shop/products/' + product.id} className="group block">
                <div
                  className="rounded-2xl mb-3 flex items-center justify-center aspect-square text-4xl relative overflow-hidden"
                  style={{ background: 'var(--shop-bg2)' }}
                >
                  {mainImg
                    ? <Image src={mainImg} alt={product.name} fill className="object-cover"
                        sizes={viewMode === 'grid2'
                          ? '(max-width:768px) 50vw, 50vw'
                          : '(max-width:768px) 50vw, 25vw'} />
                    : <span>📷</span>}
                  {discountRate > 0 && (
                    <span className="absolute top-2 left-2 text-[11px] font-bold px-2 py-0.5 rounded-full text-white"
                      style={{ background: 'var(--shop-accent)' }}>
                      -{discountRate}%
                    </span>
                  )}
                  {isSoldOut && (
                    <div className="absolute inset-0 flex items-center justify-center text-sm font-bold"
                      style={{ background: 'rgba(0,0,0,0.4)', color: 'white' }}>품절</div>
                  )}
                </div>
                <p className="text-sm font-medium mb-1 line-clamp-2 group-hover:underline"
                  style={{ color: 'var(--shop-ink)' }}>
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
              href={buildUrl({ page: String(p) })}
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
