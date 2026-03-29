'use client'
import Link from 'next/link'
import { useEffect } from 'react'

export default function ProductError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <p className="text-4xl mb-4">😕</p>
      <h2 className="text-xl mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--shop-ink)' }}>
        상품을 불러올 수 없습니다
      </h2>
      <p className="text-sm mb-6" style={{ color: 'var(--shop-ink3)' }}>
        일시적인 오류가 발생했습니다
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-6 py-2.5 rounded-full text-sm font-medium transition-all"
          style={{ background: 'var(--shop-ink)', color: 'white' }}
        >
          다시 시도
        </button>
        <Link
          href="/shop/products"
          className="px-6 py-2.5 rounded-full text-sm font-medium transition-all"
          style={{ border: '1.5px solid var(--shop-border)', color: 'var(--shop-ink)' }}
        >
          상품 목록으로
        </Link>
      </div>
    </div>
  )
}
