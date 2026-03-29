import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CouponValidateResult } from '@/types/coupon'

export async function POST(request: NextRequest) {
  try {
    const supabase = await request.json().then(async body => {
      const s = await createClient()
      return { supabase: s, body }
    })

    const { code, order_amount, member_id } = supabase.body
    const db = supabase.supabase

    if (!code?.trim()) {
      return NextResponse.json<CouponValidateResult>(
        { valid: false, discount_amount: 0, error: '쿠폰 코드를 입력하세요' },
        { status: 400 }
      )
    }

    // 쿠폰 조회
    const { data: coupon } = await db
      .from('coupons')
      .select('*')
      .eq('code', code.trim().toUpperCase())
      .eq('is_active', true)
      .single()

    if (!coupon) {
      return NextResponse.json<CouponValidateResult>(
        { valid: false, discount_amount: 0, error: '유효하지 않은 쿠폰 코드입니다' }
      )
    }

    // 유효기간 확인
    if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
      return NextResponse.json<CouponValidateResult>(
        { valid: false, discount_amount: 0, error: '만료된 쿠폰입니다' }
      )
    }

    if (coupon.valid_from && new Date(coupon.valid_from) > new Date()) {
      return NextResponse.json<CouponValidateResult>(
        { valid: false, discount_amount: 0, error: '아직 사용할 수 없는 쿠폰입니다' }
      )
    }

    // 최소 주문금액 확인
    if (order_amount < coupon.min_order_amount) {
      return NextResponse.json<CouponValidateResult>({
        valid: false,
        discount_amount: 0,
        error: `최소 주문 금액 ${coupon.min_order_amount.toLocaleString()}원 이상일 때 사용 가능합니다`,
      })
    }

    // 사용 횟수 확인
    if (coupon.usage_limit !== null && coupon.usage_count >= coupon.usage_limit) {
      return NextResponse.json<CouponValidateResult>(
        { valid: false, discount_amount: 0, error: '쿠폰 사용 가능 횟수가 초과되었습니다' }
      )
    }

    // 1인당 사용 횟수 확인 (로그인 회원)
    if (member_id && coupon.per_user_limit > 0) {
      const { count } = await db
        .from('coupon_usages')
        .select('*', { count: 'exact', head: true })
        .eq('coupon_id', coupon.id)
        .eq('member_id', member_id)

      if ((count ?? 0) >= coupon.per_user_limit) {
        return NextResponse.json<CouponValidateResult>(
          { valid: false, discount_amount: 0, error: '이미 사용한 쿠폰입니다' }
        )
      }
    }

    // 할인액 계산
    let discountAmount = 0
    if (coupon.discount_type === 'percent') {
      discountAmount = Math.floor(order_amount * (coupon.discount_value / 100))
      if (coupon.max_discount_amt) {
        discountAmount = Math.min(discountAmount, coupon.max_discount_amt)
      }
    } else {
      discountAmount = Math.min(coupon.discount_value, order_amount)
    }

    return NextResponse.json<CouponValidateResult>({
      valid:           true,
      coupon,
      discount_amount: discountAmount,
    })
  } catch (err) {
    console.error('[POST /api/coupons/validate]', err)
    return NextResponse.json<CouponValidateResult>(
      { valid: false, discount_amount: 0, error: '쿠폰 확인 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
