'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

interface Category { id: string; name: string }

interface ProductFiltersProps {
  categories:   Category[]
  currentCat?:  string
  currentSort?: string
  currentSale?: boolean
  currentQ?:    string
  mobile?:      boolean
}

const SORT_OPTIONS = [
  { value: 'newest',     label: '최신순' },
  { value: 'price_asc',  label: '가격 낮은순' },
  { value: 'price_desc', label: '가격 높은순' },
  { value: 'sale',       label: '할인율순' },
]

export function ProductFilters({
  categories, currentCat, currentSort, currentSale, currentQ, mobile,
}: ProductFiltersProps) {
  const router     = useRouter()
  const sp         = useSearchParams()
  const [open, setOpen] = useState(false)

  function buildHref(patch: Record<string, string | undefined>) {
    const params = new URLSearchParams()
    if (currentQ && patch.q === undefined)     params.set('q', currentQ)
    if (currentCat && patch.cat === undefined) params.set('cat', currentCat)
    if (currentSort && patch.sort === undefined) params.set('sort', currentSort)
    if (currentSale && patch.sale === undefined) params.set('sale', 'true')
    Object.entries(patch).forEach(([k, v]) => { if (v) params.set(k, v) })
    return `/shop/products?${params.toString()}`
  }

  function goFilter(patch: Record<string, string | undefined>) {
    router.push(buildHref(patch))
    setOpen(false)
  }

  const content = (
    <div className="space-y-6">
      {/* 검색 */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: 'var(--shop-ink3)' }}>검색</h3>
        <form onSubmit={e => { e.preventDefault(); const q = (e.currentTarget.querySelector('input') as HTMLInputElement).value; goFilter({ q, page: undefined }) }}>
          <input
            type="text"
            defaultValue={currentQ}
            placeholder="상품명 검색..."
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{
              background: 'var(--shop-bg2)',
              border: '1px solid var(--shop-border)',
              color: 'var(--shop-ink)',
              fontFamily: 'var(--font-body)',
            }}
          />
        </form>
      </div>

      {/* 정렬 */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: 'var(--shop-ink3)' }}>정렬</h3>
        <div className="space-y-1">
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => goFilter({ sort: opt.value, page: undefined })}
              className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors"
              style={{
                background:  (currentSort ?? 'newest') === opt.value ? 'var(--shop-bg3)' : 'transparent',
                color:       (currentSort ?? 'newest') === opt.value ? 'var(--shop-ink)' : 'var(--shop-ink2)',
                fontWeight:  (currentSort ?? 'newest') === opt.value ? 500 : 400,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 카테고리 */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: 'var(--shop-ink3)' }}>카테고리</h3>
        <div className="space-y-1">
          <button
            onClick={() => goFilter({ cat: undefined, page: undefined })}
            className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors"
            style={{
              background: !currentCat ? 'var(--shop-bg3)' : 'transparent',
              color:      !currentCat ? 'var(--shop-ink)' : 'var(--shop-ink2)',
              fontWeight: !currentCat ? 500 : 400,
            }}
          >
            전체
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => goFilter({ cat: cat.name, page: undefined })}
              className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors"
              style={{
                background: currentCat === cat.name ? 'var(--shop-bg3)' : 'transparent',
                color:      currentCat === cat.name ? 'var(--shop-ink)'  : 'var(--shop-ink2)',
                fontWeight: currentCat === cat.name ? 500 : 400,
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* 할인 */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: 'var(--shop-ink3)' }}>필터</h3>
        <button
          onClick={() => goFilter({ sale: currentSale ? undefined : 'true', page: undefined })}
          className="flex items-center gap-2 text-sm transition-colors"
          style={{ color: currentSale ? 'var(--shop-accent)' : 'var(--shop-ink2)' }}
        >
          <span
            className="w-4 h-4 rounded border flex items-center justify-center transition-colors"
            style={{
              background:  currentSale ? 'var(--shop-accent)' : 'transparent',
              borderColor: currentSale ? 'var(--shop-accent)' : 'var(--shop-border)',
            }}
          >
            {currentSale && <span className="text-white text-[10px]">✓</span>}
          </span>
          세일 상품만
        </button>
      </div>

      {/* 초기화 */}
      {(currentCat || currentSort || currentSale || currentQ) && (
        <button
          onClick={() => router.push('/shop/products')}
          className="text-xs underline transition-colors"
          style={{ color: 'var(--shop-ink3)' }}
        >
          필터 초기화
        </button>
      )}
    </div>
  )

  if (mobile) {
    return (
      <div>
        {/* 모바일: 정렬 드롭다운만 노출, 필터는 시트로 */}
        <div className="flex items-center gap-2">
          <select
            value={currentSort ?? 'newest'}
            onChange={e => goFilter({ sort: e.target.value, page: undefined })}
            className="flex-1 px-3 py-2 rounded-lg text-sm outline-none appearance-none"
            style={{
              background: 'var(--shop-bg2)', border: '1px solid var(--shop-border)',
              color: 'var(--shop-ink)', fontFamily: 'var(--font-body)',
            }}
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button
            onClick={() => setOpen(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: 'var(--shop-bg2)', border: '1px solid var(--shop-border)', color: 'var(--shop-ink)' }}
          >
            필터 {(currentCat || currentSale || currentQ) ? '●' : ''}
          </button>
        </div>

        {/* 바텀 시트 */}
        {open && (
          <div className="fixed inset-0 z-50" onClick={() => setOpen(false)}>
            <div
              className="absolute bottom-0 left-0 right-0 rounded-t-2xl p-6 shop-animate-slide"
              style={{ background: 'var(--shop-bg)', maxHeight: '80vh', overflowY: 'auto' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-semibold" style={{ color: 'var(--shop-ink)', fontFamily: 'var(--font-display)' }}>필터</h2>
                <button onClick={() => setOpen(false)} style={{ color: 'var(--shop-ink3)' }}>✕</button>
              </div>
              {content}
            </div>
          </div>
        )}
      </div>
    )
  }

  return content
}
