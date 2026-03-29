'use client'
import { useState, useEffect, useCallback } from 'react'
import { formatPrice } from '@/lib/utils'
import type { CouponValidateResult, OrderDiscountForm } from '@/types/coupon'

interface DiscountApplySectionProps {
  orderTotal:    number   // 쿠폰 적용 전 상품 합계
  memberId?:     string | null
  memberEmail?:  string | null
  onChange:      (discount: OrderDiscountForm) => void
}

export function DiscountApplySection({
  orderTotal, memberId, memberEmail, onChange,
}: DiscountApplySectionProps) {
  const [couponCode, setCouponCode]       = useState('')
  const [couponResult, setCouponResult]   = useState<CouponValidateResult | null>(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError]     = useState('')

  const [pointBalance, setPointBalance]   = useState(0)
  const [pointToUse, setPointToUse]       = useState(0)
  const [pointError, setPointError]       = useState('')

  // 포인트 잔액 조회 (로그인 회원만)
  useEffect(() => {
    if (!memberId) return
    fetch(`/api/points/${memberId}`)
      .then(r => r.json())
      .then(j => setPointBalance(j.balance?.balance ?? 0))
      .catch(() => {})
  }, [memberId])

  // 부모에게 할인 정보 전달
  useEffect(() => {
    onChange({
      coupon_id:       couponResult?.coupon?.id,
      coupon_code:     couponResult?.coupon?.code,
      coupon_discount: couponResult?.discount_amount ?? 0,
      point_used:      pointToUse,
    })
  }, [couponResult, pointToUse, onChange])

  // 쿠폰 적용
  async function applyCoupon() {
    if (!couponCode.trim()) { setCouponError('쿠폰 코드를 입력하세요'); return }
    setCouponLoading(true); setCouponError('')

    const res  = await fetch('/api/coupons/validate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        code:         couponCode.trim().toUpperCase(),
        order_amount: orderTotal,
        member_id:    memberId ?? undefined,
      }),
    })
    const json: CouponValidateResult = await res.json()

    if (!json.valid) {
      setCouponError(json.error ?? '유효하지 않은 쿠폰입니다')
      setCouponResult(null)
    } else {
      setCouponResult(json)
      setCouponError('')
    }
    setCouponLoading(false)
  }

  function removeCoupon() {
    setCouponResult(null); setCouponCode(''); setCouponError('')
  }

  function handlePointChange(value: number) {
    const v = Math.min(Math.max(0, value), pointBalance)
    // 포인트 + 쿠폰 할인이 주문금액을 초과하면 조정
    const maxUsable = orderTotal - (couponResult?.discount_amount ?? 0)
    setPointToUse(Math.min(v, Math.max(0, maxUsable)))
    setPointError(v > pointBalance ? `최대 ${pointBalance.toLocaleString()}P 사용 가능` : '')
  }

  const couponDiscount = couponResult?.discount_amount ?? 0
  const totalDiscount  = couponDiscount + pointToUse

  return (
    <div className="space-y-4">
      {/* ── 쿠폰 ── */}
      <div
        className="rounded-xl p-4"
        style={{ border: '1.5px solid var(--shop-border)', background: 'var(--shop-bg)' }}
      >
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--shop-ink)' }}>
          🎫 쿠폰 할인
        </h3>

        {couponResult?.valid ? (
          <div
            className="flex items-center justify-between p-3 rounded-lg"
            style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.3)' }}
          >
            <div>
              <div className="text-sm font-semibold" style={{ color: '#34d399' }}>
                {couponResult.coupon?.name}
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--shop-ink3)' }}>
                코드: <span className="font-mono">{couponResult.coupon?.code}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-base font-bold" style={{ color: '#34d399' }}>
                -{formatPrice(couponResult.discount_amount)}
              </span>
              <button
                onClick={removeCoupon}
                className="text-xs px-2 py-1 rounded"
                style={{ color: 'var(--shop-ink3)', background: 'var(--shop-bg3)' }}
              >
                제거
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={couponCode}
              onChange={e => setCouponCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && applyCoupon()}
              placeholder="쿠폰 코드 입력"
              className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none transition-all"
              style={{
                background: 'var(--shop-bg2)', border: '1.5px solid var(--shop-border)',
                color: 'var(--shop-ink)', fontFamily: 'var(--font-body), monospace',
                letterSpacing: '0.05em',
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--shop-ink)' }}
              onBlur={e =>  { e.target.style.borderColor = 'var(--shop-border)' }}
            />
            <button
              onClick={applyCoupon}
              disabled={couponLoading}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-60 flex items-center gap-1.5"
              style={{ background: 'var(--shop-ink)', color: 'white' }}
            >
              {couponLoading && (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              적용
            </button>
          </div>
        )}

        {couponError && (
          <p className="text-xs mt-2" style={{ color: 'var(--shop-accent)' }}>{couponError}</p>
        )}
      </div>

      {/* ── 포인트 ── */}
      {memberId && (
        <div
          className="rounded-xl p-4"
          style={{ border: '1.5px solid var(--shop-border)', background: 'var(--shop-bg)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--shop-ink)' }}>
              💎 포인트 사용
            </h3>
            <span className="text-xs font-mono" style={{ color: 'var(--shop-ink3)' }}>
              보유 <strong style={{ color: 'var(--shop-ink)' }}>{pointBalance.toLocaleString()}</strong>P
            </span>
          </div>

          <div className="flex gap-2 mb-2">
            <input
              type="number"
              value={pointToUse || ''}
              onChange={e => handlePointChange(parseInt(e.target.value) || 0)}
              placeholder="0"
              min="0"
              max={pointBalance}
              className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none transition-all"
              style={{
                background: 'var(--shop-bg2)', border: '1.5px solid var(--shop-border)',
                color: 'var(--shop-ink)', fontFamily: 'var(--font-body)',
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--shop-ink)' }}
              onBlur={e =>  { e.target.style.borderColor = 'var(--shop-border)' }}
            />
            <button
              onClick={() => handlePointChange(pointBalance)}
              className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{ background: 'var(--shop-bg2)', border: '1.5px solid var(--shop-border)', color: 'var(--shop-ink)' }}
            >
              전액 사용
            </button>
            {pointToUse > 0 && (
              <button
                onClick={() => { setPointToUse(0); setPointError('') }}
                className="px-3 py-2.5 rounded-xl text-sm transition-all"
                style={{ color: 'var(--shop-ink3)', background: 'var(--shop-bg3)' }}
              >
                취소
              </button>
            )}
          </div>

          {pointToUse > 0 && (
            <p className="text-xs" style={{ color: '#34d399' }}>
              -{pointToUse.toLocaleString()}P 적용됨
            </p>
          )}
          {pointError && (
            <p className="text-xs" style={{ color: 'var(--shop-accent)' }}>{pointError}</p>
          )}
          {pointBalance === 0 && (
            <p className="text-xs" style={{ color: 'var(--shop-ink3)' }}>사용 가능한 포인트가 없습니다</p>
          )}
        </div>
      )}

      {/* ── 할인 요약 ── */}
      {totalDiscount > 0 && (
        <div
          className="rounded-xl p-4"
          style={{ background: 'rgba(79,142,247,0.05)', border: '1px solid rgba(79,142,247,0.2)' }}
        >
          <div className="space-y-1.5 text-sm">
            {couponDiscount > 0 && (
              <div className="flex justify-between">
                <span style={{ color: 'var(--shop-ink3)' }}>쿠폰 할인</span>
                <span style={{ color: '#34d399' }}>-{formatPrice(couponDiscount)}</span>
              </div>
            )}
            {pointToUse > 0 && (
              <div className="flex justify-between">
                <span style={{ color: 'var(--shop-ink3)' }}>포인트 사용</span>
                <span style={{ color: '#34d399' }}>-{pointToUse.toLocaleString()}P</span>
              </div>
            )}
            <div className="flex justify-between font-semibold pt-1.5"
              style={{ borderTop: '1px solid rgba(79,142,247,0.2)', color: 'var(--shop-ink)' }}>
              <span>총 할인</span>
              <span style={{ color: '#34d399' }}>-{formatPrice(totalDiscount)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
