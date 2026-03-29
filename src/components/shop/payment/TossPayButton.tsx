'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { formatPrice } from '@/lib/utils'

// 토스페이먼츠 SDK 타입 (실제 SDK 설치 후 @types/tosspayments 활용)
declare global {
  interface Window {
    TossPayments?: (clientKey: string) => TossPaymentsInstance
  }
}

interface TossPaymentsInstance {
  requestPayment: (method: string, options: TossRequestOptions) => Promise<TossSuccessResponse>
}

interface TossRequestOptions {
  amount:          number
  orderId:         string
  orderName:       string
  customerName:    string
  customerEmail?:  string
  successUrl:      string
  failUrl:         string
  // 가상계좌 전용
  validHours?:     number    // 가상계좌 유효시간 (기본 168시간)
  // 카드 전용
  useEscrow?:      boolean
}

interface TossSuccessResponse {
  paymentKey: string
  orderId:    string
  amount:     number
}

// ── 결제 수단 옵션 ─────────────────────────────────────────────────
const PAYMENT_METHODS = [
  { id: '카드',     label: '신용카드',     icon: '💳', desc: 'VISA · Master · 국내카드' },
  { id: '가상계좌', label: '가상계좌',     icon: '🏦', desc: '무통장 입금 (168시간 유효)' },
  { id: '계좌이체', label: '계좌이체',     icon: '🔄', desc: '실시간 계좌이체' },
  { id: '휴대폰',   label: '휴대폰 결제',  icon: '📱', desc: '소액결제 (월 50만원 한도)' },
  { id: '카카오페이', label: 'KakaoPay',  icon: '💛', desc: '카카오페이 간편결제' },
  { id: '네이버페이', label: 'NaverPay',  icon: '💚', desc: '네이버페이 간편결제' },
]

interface TossPayButtonProps {
  amount:        number
  orderName:     string
  orderId:       string        // DB orders.id
  orderIdToss:   string        // 토스에 전달할 UUID (payments.order_id_toss)
  customerName:  string
  customerEmail?: string
  disabled?:     boolean
  onError?:      (msg: string) => void
}

export function TossPayButton({
  amount, orderName, orderId, orderIdToss,
  customerName, customerEmail, disabled, onError,
}: TossPayButtonProps) {
  const router       = useRouter()
  const [method, setMethod]   = useState('카드')
  const [loading, setLoading] = useState(false)
  const [sdkLoaded, setSdkLoaded] = useState(false)
  const sdkRef = useRef<TossPaymentsInstance | null>(null)

  // SDK 스크립트 동적 로드
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.TossPayments) { initSdk(); return }

    const script = document.createElement('script')
    script.src   = 'https://js.tosspayments.com/v1/payment'
    script.async = true
    script.onload = () => { initSdk() }
    document.head.appendChild(script)

    return () => {
      document.head.removeChild(script)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function initSdk() {
    const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY
    if (!clientKey) {
      console.error('NEXT_PUBLIC_TOSS_CLIENT_KEY가 설정되지 않았습니다')
      return
    }
    sdkRef.current = window.TossPayments!(clientKey)
    setSdkLoaded(true)
  }

  // 결제 요청 전 DB에 payments 레코드 생성
  async function createPaymentRecord(): Promise<boolean> {
    const res = await fetch('/api/payment/prepare', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        order_id:     orderId,
        order_id_toss: orderIdToss,
        amount,
      }),
    })
    if (!res.ok) {
      const json = await res.json()
      onError?.(json.error ?? '결제 준비에 실패했습니다')
      return false
    }
    return true
  }

  const handlePay = useCallback(async () => {
    if (!sdkRef.current || loading || disabled) return
    setLoading(true)

    // DB에 결제 레코드 생성 (금액 위변조 방지용)
    const prepared = await createPaymentRecord()
    if (!prepared) { setLoading(false); return }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin

    try {
      await sdkRef.current.requestPayment(method, {
        amount,
        orderId:      orderIdToss,
        orderName:    orderName.slice(0, 100),  // 최대 100자
        customerName,
        customerEmail,
        successUrl:   `${siteUrl}/shop/payment/success`,
        failUrl:      `${siteUrl}/shop/payment/fail`,
        // 가상계좌 설정
        ...(method === '가상계좌' && { validHours: 168 }),
      })
      // requestPayment가 resolve되면 successUrl로 리다이렉트됨
    } catch (err: unknown) {
      // 사용자가 결제 취소 시
      if (err instanceof Error && err.message?.includes('사용자가 결제를 취소')) {
        setLoading(false)
        return
      }
      const message = err instanceof Error ? err.message : '결제 요청에 실패했습니다'
      onError?.(message)
      setLoading(false)
    }
  }, [sdkRef, loading, disabled, method, amount, orderIdToss, orderName, customerName, customerEmail, orderId])

  return (
    <div>
      {/* 결제 수단 선택 */}
      <div className="mb-5">
        <p className="text-xs font-medium mb-3" style={{ color: 'var(--shop-ink2)' }}>결제 수단 선택</p>
        <div className="grid grid-cols-2 gap-2">
          {PAYMENT_METHODS.map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMethod(m.id)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all"
              style={{
                border:      `1.5px solid ${method === m.id ? 'var(--shop-ink)' : 'var(--shop-border)'}`,
                background:  method === m.id ? 'rgba(26,26,24,0.05)' : 'var(--shop-bg)',
              }}
            >
              <span className="text-lg">{m.icon}</span>
              <div>
                <div className="text-xs font-semibold" style={{ color: 'var(--shop-ink)' }}>{m.label}</div>
                <div className="text-[10px]" style={{ color: 'var(--shop-ink3)' }}>{m.desc}</div>
              </div>
              {method === m.id && (
                <span className="ml-auto text-xs" style={{ color: 'var(--shop-ink)' }}>✓</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 가상계좌 안내 */}
      {method === '가상계좌' && (
        <div className="mb-4 p-3 rounded-xl text-xs"
          style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)', color: '#92400e' }}>
          ⚠️ 가상계좌 발급 후 <strong>168시간(7일)</strong> 이내에 입금하지 않으면 자동 취소됩니다.
        </div>
      )}

      {/* 결제 버튼 */}
      <button
        onClick={handlePay}
        disabled={!sdkLoaded || loading || disabled}
        className="w-full py-4 rounded-2xl font-semibold text-sm transition-all
          hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed
          flex items-center justify-center gap-2"
        style={{ background: 'var(--shop-ink)', color: 'white' }}
      >
        {loading
          ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />처리 중...</>
          : !sdkLoaded
          ? '결제 모듈 로딩 중...'
          : `${formatPrice(amount)} 결제하기`
        }
      </button>

      <p className="text-[11px] text-center mt-2" style={{ color: 'var(--shop-ink3)' }}>
        토스페이먼츠로 안전하게 결제됩니다 🔒
      </p>
    </div>
  )
}
