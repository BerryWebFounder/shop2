'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatPrice, formatDateTime } from '@/lib/utils'
import { useCart } from '@/hooks/useCart'

interface PaymentResult {
  order_no:    string
  method:      string
  amount:      number
  approved_at: string | null
  // 가상계좌
  virtual_account_number?: string
  virtual_account_bank?:   string
  virtual_account_due?:    string
  is_virtual_account:      boolean
  message:     string
}

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const { clearCart } = useCart()
  const [result, setResult]   = useState<PaymentResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    const paymentKey = searchParams.get('paymentKey') ?? ''
    const orderId    = searchParams.get('orderId')    ?? ''  // 토스의 orderId
    const amount     = parseInt(searchParams.get('amount') ?? '0')

    if (!paymentKey || !orderId) {
      setError('결제 정보가 올바르지 않습니다')
      setLoading(false)
      return
    }

    // 서버에 결제 승인 요청
    fetch('/api/payment/confirm', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ paymentKey, orderId, amount }),
    })
      .then(r => r.json())
      .then(json => {
        if (!json.success) {
          setError(json.error ?? '결제 처리에 실패했습니다')
          setLoading(false)
          return
        }

        clearCart()

        const p = json.payment
        setResult({
          order_no:    json.order_no,
          method:      p.method,
          amount:      p.amount,
          approved_at: p.approved_at,
          is_virtual_account: p.status === 'waiting_for_deposit',
          virtual_account_number: p.virtual_account_number,
          virtual_account_bank:   p.virtual_account_bank,
          virtual_account_due:    p.virtual_account_due,
          message:     json.message,
        })
        setLoading(false)
      })
      .catch(() => {
        setError('결제 처리 중 오류가 발생했습니다')
        setLoading(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <span className="w-10 h-10 border-3 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'var(--shop-border)', borderTopColor: 'var(--shop-ink)' }} />
        <p className="text-sm" style={{ color: 'var(--shop-ink3)' }}>결제를 확인하고 있습니다...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
        <div className="text-5xl mb-4">❌</div>
        <h2 className="text-2xl mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--shop-ink)' }}>
          결제 처리 실패
        </h2>
        <p className="text-sm mb-8" style={{ color: 'var(--shop-ink3)' }}>{error}</p>
        <div className="flex gap-3">
          <button onClick={() => router.back()}
            className="px-6 py-3 rounded-full text-sm font-semibold"
            style={{ background: 'var(--shop-ink)', color: 'white' }}>
            다시 시도
          </button>
          <Link href="/shop/cart"
            className="px-6 py-3 rounded-full text-sm"
            style={{ border: '1.5px solid var(--shop-border)', color: 'var(--shop-ink)' }}>
            장바구니로
          </Link>
        </div>
      </div>
    )
  }

  if (!result) return null

  // ── 가상계좌 입금 대기 화면 ──────────────────────────────────────
  if (result.is_virtual_account) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-6">
        <div className="text-center max-w-md w-full">
          <div className="text-5xl mb-5">🏦</div>
          <h2 className="text-3xl mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--shop-ink)' }}>
            가상계좌가 발급되었습니다
          </h2>
          <p className="text-sm mb-8" style={{ color: 'var(--shop-ink3)' }}>
            아래 계좌로 입금하시면 주문이 확정됩니다
          </p>

          <div className="rounded-2xl p-6 mb-6 text-left space-y-3"
            style={{ background: 'var(--shop-bg2)' }}>
            <div className="flex justify-between">
              <span className="text-xs" style={{ color: 'var(--shop-ink3)' }}>은행</span>
              <span className="text-sm font-semibold" style={{ color: 'var(--shop-ink)' }}>
                {result.virtual_account_bank}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs" style={{ color: 'var(--shop-ink3)' }}>계좌번호</span>
              <span className="text-sm font-mono font-bold" style={{ color: 'var(--shop-accent)' }}>
                {result.virtual_account_number}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs" style={{ color: 'var(--shop-ink3)' }}>입금 금액</span>
              <span className="text-sm font-semibold" style={{ color: 'var(--shop-ink)' }}>
                {formatPrice(result.amount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs" style={{ color: 'var(--shop-ink3)' }}>입금 기한</span>
              <span className="text-sm font-semibold" style={{ color: 'var(--shop-accent)' }}>
                {result.virtual_account_due ? formatDateTime(result.virtual_account_due) : '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs" style={{ color: 'var(--shop-ink3)' }}>주문번호</span>
              <span className="text-xs font-mono" style={{ color: 'var(--shop-ink3)' }}>
                {result.order_no}
              </span>
            </div>
          </div>

          <p className="text-xs mb-6" style={{ color: 'var(--shop-ink3)' }}>
            ⚠️ 기한 내 미입금 시 주문이 자동 취소됩니다
          </p>

          <div className="flex flex-col gap-3">
            <Link href="/shop/orders"
              className="block py-3.5 rounded-xl text-sm font-semibold text-center"
              style={{ background: 'var(--shop-ink)', color: 'white' }}>
              주문 내역 확인
            </Link>
            <Link href="/shop"
              className="block py-3.5 rounded-xl text-sm text-center"
              style={{ border: '1.5px solid var(--shop-border)', color: 'var(--shop-ink)' }}>
              쇼핑 계속하기
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── 결제 완료 화면 ────────────────────────────────────────────────
  const METHOD_LABEL: Record<string, string> = {
    card: '신용카드', account_transfer: '계좌이체',
    mobile: '휴대폰', kakaopay: 'KakaoPay',
    naverpay: 'NaverPay', tosspay: '토스페이',
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <div className="text-center max-w-sm w-full">
        {/* 성공 애니메이션 */}
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shop-animate-up"
          style={{ background: 'rgba(52,211,153,0.12)', border: '2px solid rgba(52,211,153,0.3)' }}
        >
          ✓
        </div>

        <h2 className="text-3xl mb-2 shop-animate-up" style={{ fontFamily: 'var(--font-display)', color: 'var(--shop-ink)', animationDelay: '60ms' }}>
          결제 완료!
        </h2>
        <p className="text-sm mb-8 shop-animate-up" style={{ color: 'var(--shop-ink3)', animationDelay: '120ms' }}>
          {result.message}
        </p>

        {/* 결제 요약 */}
        <div className="rounded-2xl p-5 mb-6 text-left space-y-2.5 shop-animate-up"
          style={{ background: 'var(--shop-bg2)', animationDelay: '180ms' }}>
          {[
            ['주문번호', result.order_no],
            ['결제금액', formatPrice(result.amount)],
            ['결제수단', METHOD_LABEL[result.method] ?? result.method],
            ['결제일시', result.approved_at ? formatDateTime(result.approved_at) : '-'],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between">
              <span className="text-xs" style={{ color: 'var(--shop-ink3)' }}>{label}</span>
              <span className="text-sm font-medium font-mono" style={{ color: 'var(--shop-ink)' }}>{value}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 shop-animate-up" style={{ animationDelay: '240ms' }}>
          <Link href="/shop/orders"
            className="block py-3.5 rounded-xl text-sm font-semibold text-center transition-all hover:opacity-90"
            style={{ background: 'var(--shop-ink)', color: 'white' }}>
            주문 내역 확인
          </Link>
          <Link href="/shop/products"
            className="block py-3.5 rounded-xl text-sm text-center transition-all"
            style={{ border: '1.5px solid var(--shop-border)', color: 'var(--shop-ink)' }}>
            쇼핑 계속하기
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'var(--shop-border)', borderTopColor: 'var(--shop-ink)' }} />
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  )
}
