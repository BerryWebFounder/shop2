'use client'
import { useState, useEffect, useCallback } from 'react'
import { StarDisplay, StarPicker } from './StarRating'
import { formatDate } from '@/lib/utils'
import type { ProductReview, ProductRatingSummary } from '@/types/review'

// ── 평점 분포 바 ──────────────────────────────────────────────────
function RatingBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs w-6 text-right flex-shrink-0" style={{ color: 'var(--shop-ink3)' }}>{label}</span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--shop-bg3)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: '#f59e0b' }}
        />
      </div>
      <span className="text-xs w-6 flex-shrink-0 text-right font-mono" style={{ color: 'var(--shop-ink3)' }}>{count}</span>
    </div>
  )
}

// ── 개별 리뷰 카드 ────────────────────────────────────────────────
function ReviewCard({ review }: { review: ProductReview }) {
  return (
    <div className="py-6" style={{ borderBottom: '1px solid var(--shop-border)' }}>
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <StarDisplay rating={review.rating} size="sm" />
          <h4 className="text-sm font-semibold mt-1.5" style={{ color: 'var(--shop-ink)' }}>
            {review.title}
          </h4>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-medium" style={{ color: 'var(--shop-ink2)' }}>
            {review.reviewer_name}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--shop-ink3)' }}>
            {formatDate(review.created_at)}
          </p>
        </div>
      </div>

      <p className="text-sm leading-relaxed" style={{ color: 'var(--shop-ink2)' }}>
        {review.body}
      </p>

      {/* 관리자 답변 */}
      {review.admin_reply && (
        <div
          className="mt-4 p-4 rounded-xl text-sm leading-relaxed"
          style={{ background: 'var(--shop-bg2)', borderLeft: '3px solid var(--shop-accent)' }}
        >
          <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--shop-accent)' }}>
            판매자 답변
          </p>
          <p style={{ color: 'var(--shop-ink2)' }}>{review.admin_reply}</p>
        </div>
      )}

      {/* 도움이 됐어요 */}
      <div className="flex items-center gap-2 mt-3">
        <span className="text-xs" style={{ color: 'var(--shop-ink3)' }}>
          {review.helpful_count > 0 ? `${review.helpful_count}명에게 도움이 됐어요` : ''}
        </span>
      </div>
    </div>
  )
}

// ── 리뷰 작성 폼 ──────────────────────────────────────────────────
function ReviewForm({ productId, onSuccess }: { productId: string; onSuccess: () => void }) {
  const [form, setForm]   = useState({ reviewer_name: '', reviewer_email: '', rating: 0, title: '', body: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.rating)             { setError('별점을 선택해주세요'); return }
    if (!form.reviewer_name.trim()) { setError('이름을 입력하세요'); return }
    setLoading(true); setError('')

    const res  = await fetch('/api/reviews', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ...form, product_id: productId }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? '등록 실패'); setLoading(false); return }

    setSuccess(true)
    onSuccess()
  }

  if (success) {
    return (
      <div className="text-center py-8">
        <p className="text-4xl mb-3">✅</p>
        <p className="font-semibold mb-1" style={{ color: 'var(--shop-ink)' }}>리뷰가 등록되었습니다</p>
        <p className="text-sm" style={{ color: 'var(--shop-ink3)' }}>
          관리자 검토 후 공개됩니다 (보통 1–2 영업일 소요)
        </p>
      </div>
    )
  }

  const inputStyle = {
    width: '100%', background: 'var(--shop-bg2)',
    border: '1.5px solid var(--shop-border)', borderRadius: 12,
    padding: '10px 14px', outline: 'none', fontFamily: 'var(--font-body)',
    color: 'var(--shop-ink)', fontSize: 14, transition: 'border-color 0.2s',
  }

  return (
    <form onSubmit={handleSubmit}>
      <h3 className="text-lg font-semibold mb-5" style={{ fontFamily: 'var(--font-display)', color: 'var(--shop-ink)' }}>
        리뷰 작성
      </h3>

      {/* 별점 */}
      <div className="mb-5">
        <label className="block text-xs font-medium mb-2" style={{ color: 'var(--shop-ink2)' }}>
          별점 *
        </label>
        <StarPicker value={form.rating} onChange={r => setForm(f => ({ ...f, rating: r }))} />
      </div>

      {/* 이름 / 이메일 */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--shop-ink2)' }}>
            이름 *
          </label>
          <input
            type="text" value={form.reviewer_name}
            onChange={e => setForm(f => ({ ...f, reviewer_name: e.target.value }))}
            placeholder="홍길동" required style={inputStyle}
            onFocus={e => { e.target.style.borderColor = 'var(--shop-ink)' }}
            onBlur={e =>  { e.target.style.borderColor = 'var(--shop-border)' }}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--shop-ink2)' }}>
            이메일 (선택)
          </label>
          <input
            type="email" value={form.reviewer_email}
            onChange={e => setForm(f => ({ ...f, reviewer_email: e.target.value }))}
            placeholder="email@example.com" style={inputStyle}
            onFocus={e => { e.target.style.borderColor = 'var(--shop-ink)' }}
            onBlur={e =>  { e.target.style.borderColor = 'var(--shop-border)' }}
          />
        </div>
      </div>

      {/* 제목 */}
      <div className="mb-3">
        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--shop-ink2)' }}>제목 *</label>
        <input
          type="text" value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          placeholder="한 줄 요약" required style={inputStyle}
          onFocus={e => { e.target.style.borderColor = 'var(--shop-ink)' }}
          onBlur={e =>  { e.target.style.borderColor = 'var(--shop-border)' }}
        />
      </div>

      {/* 내용 */}
      <div className="mb-4">
        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--shop-ink2)' }}>내용 * (5자 이상)</label>
        <textarea
          value={form.body}
          onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
          placeholder="상품에 대한 솔직한 리뷰를 남겨주세요" required
          rows={4} style={{ ...inputStyle, resize: 'vertical' }}
          onFocus={e => { e.target.style.borderColor = 'var(--shop-ink)' }}
          onBlur={e =>  { e.target.style.borderColor = 'var(--shop-border)' }}
        />
        <p className="text-[11px] text-right mt-1" style={{ color: 'var(--shop-ink3)' }}>
          {form.body.length} / 2000
        </p>
      </div>

      {error && (
        <p className="text-xs mb-3 py-2 px-3 rounded-lg"
          style={{ color: 'var(--shop-accent)', background: 'rgba(196,80,58,0.08)' }}>
          {error}
        </p>
      )}

      <button
        type="submit" disabled={loading}
        className="w-full py-3.5 rounded-2xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
        style={{ background: 'var(--shop-ink)', color: 'white' }}
      >
        {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
        리뷰 등록
      </button>
    </form>
  )
}

// ── 메인 리뷰 섹션 ────────────────────────────────────────────────
export function ReviewSection({ productId }: { productId: string }) {
  const [reviews, setReviews]       = useState<ProductReview[]>([])
  const [summary, setSummary]       = useState<ProductRatingSummary | null>(null)
  const [total, setTotal]           = useState(0)
  const [page, setPage]             = useState(1)
  const [sort, setSort]             = useState('newest')
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)

  const fetchReviews = useCallback(async () => {
    setLoading(true)
    const p = new URLSearchParams({ product_id: productId, page: String(page), sort, limit: '10' })
    const res  = await fetch(`/api/reviews?${p}`)
    const json = await res.json()
    setReviews(json.data ?? [])
    setTotal(json.total ?? 0)
    if (json.ratingSummary) setSummary(json.ratingSummary)
    setLoading(false)
  }, [productId, page, sort])

  useEffect(() => { fetchReviews() }, [fetchReviews])

  const totalPages = Math.ceil(total / 10)

  return (
    <section className="mt-16 pt-12" style={{ borderTop: '1px solid var(--shop-border)' }}>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl" style={{ fontFamily: 'var(--font-display)', color: 'var(--shop-ink)' }}>
          상품 리뷰
        </h2>
        <button
          onClick={() => setShowForm(v => !v)}
          className="px-5 py-2.5 rounded-full text-sm font-semibold transition-all hover:opacity-90"
          style={{ background: showForm ? 'var(--shop-bg3)' : 'var(--shop-ink)', color: showForm ? 'var(--shop-ink)' : 'white' }}
        >
          {showForm ? '취소' : '리뷰 작성'}
        </button>
      </div>

      {/* 평점 요약 */}
      {summary && summary.review_count > 0 && (
        <div
          className="flex flex-col md:flex-row gap-6 p-6 rounded-2xl mb-8"
          style={{ background: 'var(--shop-bg2)' }}
        >
          {/* 평균 별점 */}
          <div className="flex flex-col items-center justify-center md:w-32 flex-shrink-0">
            <div className="text-5xl font-bold mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--shop-ink)' }}>
              {(summary.avg_rating ?? 0).toFixed(1)}
            </div>
            <StarDisplay rating={summary.avg_rating ?? 0} size="sm" />
            <p className="text-xs mt-1.5" style={{ color: 'var(--shop-ink3)' }}>
              {summary.review_count}개 리뷰
            </p>
          </div>

          {/* 분포 바 */}
          <div className="flex-1 flex flex-col justify-center gap-1.5">
            {[5, 4, 3, 2, 1].map(star => (
              <RatingBar
                key={star}
                label={`${star}★`}
                count={summary[`star${star}` as keyof ProductRatingSummary] as number}
                total={summary.review_count}
              />
            ))}
          </div>
        </div>
      )}

      {/* 리뷰 작성 폼 */}
      {showForm && (
        <div
          className="p-6 rounded-2xl mb-8"
          style={{ border: '1.5px solid var(--shop-border)', background: 'var(--shop-bg)' }}
        >
          <ReviewForm productId={productId} onSuccess={() => { setShowForm(false); fetchReviews() }} />
        </div>
      )}

      {/* 정렬 */}
      {total > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm" style={{ color: 'var(--shop-ink3)' }}>정렬</span>
          {[
            { value: 'newest',      label: '최신순' },
            { value: 'rating_high', label: '평점 높은순' },
            { value: 'helpful',     label: '도움순' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => { setSort(opt.value); setPage(1) }}
              className="text-xs px-3 py-1.5 rounded-full transition-colors"
              style={{
                background:  sort === opt.value ? 'var(--shop-ink)' : 'var(--shop-bg2)',
                color:       sort === opt.value ? 'white' : 'var(--shop-ink2)',
                border:      sort === opt.value ? 'none' : '1px solid var(--shop-border)',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* 리뷰 목록 */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="py-6 animate-pulse" style={{ borderBottom: '1px solid var(--shop-border)' }}>
              <div className="h-3 w-24 rounded mb-2" style={{ background: 'var(--shop-bg2)' }} />
              <div className="h-4 w-48 rounded mb-3" style={{ background: 'var(--shop-bg2)' }} />
              <div className="h-3 w-full rounded mb-1" style={{ background: 'var(--shop-bg2)' }} />
              <div className="h-3 w-3/4 rounded" style={{ background: 'var(--shop-bg2)' }} />
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--shop-ink3)' }}>
          <p className="text-4xl mb-3">✍️</p>
          <p className="text-sm">첫 번째 리뷰를 남겨주세요!</p>
        </div>
      ) : (
        <>
          <div>
            {reviews.map(r => <ReviewCard key={r.id} review={r} />)}
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-1.5 mt-8">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-sm transition-all"
                  style={{
                    background: p === page ? 'var(--shop-ink)' : 'var(--shop-bg2)',
                    color:      p === page ? 'white' : 'var(--shop-ink2)',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}
