'use client'
import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

// 토스 에러 코드 한글 메시지 매핑
const TOSS_ERROR_MESSAGES: Record<string, string> = {
  PAY_PROCESS_CANCELED:    '사용자가 결제를 취소했습니다.',
  PAY_PROCESS_ABORTED:     '결제 진행 중 오류가 발생했습니다. 다시 시도해 주세요.',
  REJECT_CARD_COMPANY:     '카드사에서 결제를 거절했습니다. 카드사에 문의해 주세요.',
  INVALID_CARD_EXPIRATION: '카드 유효기간이 올바르지 않습니다.',
  INVALID_STOPPED_CARD:    '사용 정지된 카드입니다.',
  EXCEED_MAX_DAILY_PAYMENT_COUNT: '일일 결제 한도를 초과했습니다.',
  NOT_ENOUGH_MONEY:        '잔액이 부족합니다.',
  INVALID_CARD_NUMBER:     '카드번호가 올바르지 않습니다.',
  BELOW_MINIMUM_AMOUNT:    '결제 최소 금액 조건을 충족하지 못했습니다.',
  EXCEED_MAX_PAYMENT_AMOUNT: '결제 최대 금액을 초과했습니다.',
  PROVIDER_ERROR:          '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
}

function PaymentFailContent() {
  const searchParams = useSearchParams()
  const router       = useRouter()

  const code    = searchParams.get('code')    ?? 'UNKNOWN'
  const message = searchParams.get('message') ?? '알 수 없는 오류가 발생했습니다'
  const orderId = searchParams.get('orderId') ?? ''

  const friendlyMessage = TOSS_ERROR_MESSAGES[code] ?? message

  const isCanceled = code === 'PAY_PROCESS_CANCELED'

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <div className="text-center max-w-sm w-full">
        <div className="text-5xl mb-5">{isCanceled ? '🔙' : '❌'}</div>

        <h2 className="text-3xl mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--shop-ink)' }}>
          {isCanceled ? '결제가 취소되었습니다' : '결제에 실패했습니다'}
        </h2>

        <p className="text-sm mb-3" style={{ color: 'var(--shop-ink2)' }}>
          {friendlyMessage}
        </p>

        {!isCanceled && (
          <p className="text-xs mb-8 font-mono px-3 py-2 rounded-lg inline-block"
            style={{ background: 'var(--shop-bg2)', color: 'var(--shop-ink3)' }}>
            오류 코드: {code}
          </p>
        )}

        <div className="flex flex-col gap-3 mt-6">
          <button
            onClick={() => router.back()}
            className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
            style={{ background: 'var(--shop-ink)', color: 'white' }}
          >
            다시 결제하기
          </button>
          <Link
            href="/shop/cart"
            className="block w-full py-3.5 rounded-xl text-sm text-center transition-all"
            style={{ border: '1.5px solid var(--shop-border)', color: 'var(--shop-ink)' }}
          >
            장바구니로 돌아가기
          </Link>
          <Link
            href="/shop/support"
            className="text-xs transition-colors"
            style={{ color: 'var(--shop-ink3)' }}
          >
            문제가 반복되나요? 고객센터에 문의하기
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function PaymentFailPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" />}>
      <PaymentFailContent />
    </Suspense>
  )
}
