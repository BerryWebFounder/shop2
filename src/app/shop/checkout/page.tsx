'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useCart } from '@/hooks/useCart'
import { createClient } from '@/lib/supabase/client'
import { formatPrice } from '@/lib/utils'
import { DiscountApplySection } from '@/components/shop/checkout/DiscountApplySection'
import { TossPayButton }        from '@/components/shop/payment/TossPayButton'
import type { OrderDiscountForm } from '@/types/coupon'
import { v4 as uuidv4 } from 'uuid'  // npm install uuid @types/uuid

export default function CheckoutPage() {
  const router = useRouter()
  const { items, total } = useCart()
  const shippingFee = total >= 50000 || total === 0 ? 0 : 3000

  const [memberId,    setMemberId]    = useState<string | null>(null)
  const [memberEmail, setMemberEmail] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', phone: '', address: '', address_detail: '', memo: '' })
  const [discount, setDiscount] = useState<OrderDiscountForm>({ coupon_discount: 0, point_used: 0 })
  const [orderId,   setOrderId]   = useState<string | null>(null)     // DB orders.id
  const [orderIdToss, setOrderIdToss] = useState<string>(uuidv4())    // 토스 orderId
  const [orderCreated, setOrderCreated] = useState(false)
  const [orderError,   setOrderError]   = useState('')
  const [formError,    setFormError]    = useState('')
  const [step, setStep] = useState<'info' | 'pay'>('info')

  const finalTotal = Math.max(0, total + shippingFee - discount.coupon_discount - discount.point_used)
  const handleDiscountChange = useCallback((d: OrderDiscountForm) => setDiscount(d), [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setMemberEmail(user.email ?? null)
      supabase.from('members').select('id, name, phone').eq('email', user.email ?? '').single()
        .then(({ data }) => {
          if (data) {
            setMemberId(data.id)
            setForm(f => ({ ...f, name: data.name ?? '', phone: data.phone ?? '' }))
          }
        })
    })
  }, [])

  useEffect(() => {
    if (items.length === 0 && step !== 'pay') router.replace('/shop/cart')
  }, [items, step, router])

  // 주문 생성 후 결제 단계로 이동
  async function handleProceedToPayment() {
    if (!form.name.trim())    { setFormError('이름을 입력해주세요'); return }
    if (!form.phone.trim())   { setFormError('연락처를 입력해주세요'); return }
    if (!form.address.trim()) { setFormError('주소를 입력해주세요'); return }
    setFormError('')

    // 주문 생성
    const res = await fetch('/api/shop/orders', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        member_id:        memberId,
        shipping_name:    form.name,
        shipping_phone:   form.phone,
        shipping_address: `${form.address} ${form.address_detail}`.trim(),
        memo:             form.memo || null,
        coupon_id:        discount.coupon_id ?? null,
        coupon_discount:  discount.coupon_discount,
        point_used:       discount.point_used,
        items: items.map(i => ({
          product_id: i.id, product_name: i.name,
          unit_price: i.price, sale_price: i.sale_price, quantity: i.quantity,
        })),
      }),
    })
    const json = await res.json()
    if (!res.ok) { setOrderError(json.error ?? '주문 생성 실패'); return }

    setOrderId(json.data.id)
    setOrderCreated(true)
    setStep('pay')
  }

  // 주문명 생성 (최대 100자)
  const orderName = items.length === 1
    ? items[0].name
    : `${items[0].name} 외 ${items.length - 1}건`

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }} className="px-6 md:px-8 py-10">
      <h1 className="text-3xl mb-8" style={{ fontFamily: 'var(--font-display)', color: 'var(--shop-ink)' }}>
        {step === 'info' ? '주문하기' : '결제하기'}
      </h1>

      {step === 'info' ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          {/* 배송 + 할인 */}
          <div className="lg:col-span-3 space-y-6">
            <div>
              <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--shop-ink)' }}>배송 정보</h2>
              <div className="space-y-3">
                {[
                  { key: 'name',           label: '수령인 *',  placeholder: '홍길동' },
                  { key: 'phone',          label: '연락처 *',  placeholder: '010-0000-0000' },
                  { key: 'address',        label: '주소 *',    placeholder: '도로명 주소' },
                  { key: 'address_detail', label: '상세 주소', placeholder: '동/호수' },
                  { key: 'memo',           label: '배송 메모', placeholder: '문 앞에 놓아주세요' },
                ].map(field => (
                  <div key={field.key}>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--shop-ink2)' }}>{field.label}</label>
                    <input type="text"
                      value={form[field.key as keyof typeof form]}
                      onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                      style={{ background: 'var(--shop-bg2)', border: '1.5px solid var(--shop-border)', color: 'var(--shop-ink)', fontFamily: 'var(--font-body)' }}
                      onFocus={e => { e.target.style.borderColor = 'var(--shop-ink)' }}
                      onBlur={e =>  { e.target.style.borderColor = 'var(--shop-border)' }}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--shop-ink)' }}>할인 적용</h2>
              <DiscountApplySection orderTotal={total} memberId={memberId} memberEmail={memberEmail} onChange={handleDiscountChange} />
            </div>
            {(formError || orderError) && (
              <p className="text-xs py-2 px-4 rounded-lg"
                style={{ color: 'var(--shop-accent)', background: 'rgba(196,80,58,0.08)' }}>
                {formError || orderError}
              </p>
            )}
          </div>

          {/* 주문 요약 + 다음 버튼 */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl p-6 sticky top-24" style={{ background: 'var(--shop-bg2)' }}>
              <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--shop-ink)', fontFamily: 'var(--font-display)' }}>
                주문 요약 ({items.length}개)
              </h2>
              <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
                {items.map(item => (
                  <div key={item.id} className="flex gap-2 items-center">
                    <div className="relative flex-shrink-0 rounded-lg overflow-hidden" style={{ width: 40, height: 50, background: 'var(--shop-bg3)' }}>
                      {item.image_url && <Image src={item.image_url} alt={item.name} fill className="object-cover" sizes="44px" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium line-clamp-1" style={{ color: 'var(--shop-ink)' }}>{item.name}</p>
                      <p className="text-xs" style={{ color: 'var(--shop-ink3)' }}>{formatPrice(item.sale_price ?? item.price)} × {item.quantity}</p>
                    </div>
                    <p className="text-xs font-semibold flex-shrink-0" style={{ color: 'var(--shop-ink)' }}>
                      {formatPrice((item.sale_price ?? item.price) * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5 py-3 border-t" style={{ borderColor: 'var(--shop-border)' }}>
                <div className="flex justify-between text-xs" style={{ color: 'var(--shop-ink2)' }}><span>상품</span><span>{formatPrice(total)}</span></div>
                <div className="flex justify-between text-xs" style={{ color: 'var(--shop-ink2)' }}><span>배송비</span><span style={{ color: shippingFee === 0 ? '#34d399' : undefined }}>{shippingFee === 0 ? '무료' : formatPrice(shippingFee)}</span></div>
                {discount.coupon_discount > 0 && <div className="flex justify-between text-xs" style={{ color: '#34d399' }}><span>쿠폰</span><span>-{formatPrice(discount.coupon_discount)}</span></div>}
                {discount.point_used > 0 && <div className="flex justify-between text-xs" style={{ color: '#34d399' }}><span>포인트</span><span>-{discount.point_used.toLocaleString()}P</span></div>}
                <div className="flex justify-between font-semibold pt-1.5 border-t" style={{ borderColor: 'var(--shop-border)', color: 'var(--shop-ink)' }}>
                  <span>합계</span><span>{formatPrice(finalTotal)}</span>
                </div>
              </div>
              <button onClick={handleProceedToPayment}
                className="w-full py-4 rounded-xl text-sm font-semibold mt-4 transition-all hover:opacity-90"
                style={{ background: 'var(--shop-ink)', color: 'white' }}>
                결제 진행하기 →
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* 결제 단계 */
        <div className="max-w-md mx-auto">
          <div className="rounded-2xl p-6 mb-6" style={{ background: 'var(--shop-bg2)' }}>
            <div className="flex justify-between text-sm mb-1">
              <span style={{ color: 'var(--shop-ink2)' }}>최종 결제 금액</span>
              <span className="text-xl font-bold" style={{ color: 'var(--shop-ink)' }}>{formatPrice(finalTotal)}</span>
            </div>
            <p className="text-xs" style={{ color: 'var(--shop-ink3)' }}>{orderName}</p>
          </div>

          {orderId && (
            <TossPayButton
              amount={finalTotal}
              orderName={orderName}
              orderId={orderId}
              orderIdToss={orderIdToss}
              customerName={form.name}
              customerEmail={memberEmail ?? undefined}
              onError={msg => setOrderError(msg)}
            />
          )}

          <button onClick={() => setStep('info')}
            className="w-full py-3 mt-3 text-sm transition-colors"
            style={{ color: 'var(--shop-ink3)' }}>
            ← 배송 정보 수정
          </button>
        </div>
      )}
    </div>
  )
}
