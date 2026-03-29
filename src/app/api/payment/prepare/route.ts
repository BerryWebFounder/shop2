import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

const prepareSchema = z.object({
  order_id:      z.string().uuid(),
  order_id_toss: z.string().uuid(),
  amount:        z.number().int().positive(),
})

// 결제 요청 전 DB에 결제 레코드를 미리 생성 (금액 위변조 방지)
export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    const body     = await request.json()
    const parsed   = prepareSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const { order_id, order_id_toss, amount } = parsed.data

    // 주문 존재 + 금액 확인
    const { data: order } = await supabase
      .from('orders')
      .select('id, total_amount, coupon_discount, point_used, status')
      .eq('id', order_id)
      .single()

    if (!order) {
      return NextResponse.json({ error: '주문을 찾을 수 없습니다' }, { status: 404 })
    }

    if (order.status !== 'pending') {
      return NextResponse.json({ error: '결제 가능한 주문 상태가 아닙니다' }, { status: 400 })
    }

    // 실제 결제금액 계산 (서버에서 재계산)
    const expectedAmount = order.total_amount - (order.coupon_discount ?? 0) - (order.point_used ?? 0)

    if (expectedAmount !== amount) {
      return NextResponse.json(
        { error: '결제 금액이 일치하지 않습니다' },
        { status: 422 }
      )
    }

    // 기존 결제 레코드가 있으면 재사용
    const { data: existing } = await supabase
      .from('payments')
      .select('id')
      .eq('order_id', order_id)
      .eq('status', 'ready')
      .single()

    if (existing) {
      return NextResponse.json({ ok: true, message: '기존 결제 레코드 재사용' })
    }

    // 새 결제 레코드 생성
    const { error } = await supabase.from('payments').insert({
      order_id,
      order_id_toss,
      amount:          expectedAmount,
      status:          'ready',
      coupon_discount: order.coupon_discount ?? 0,
      point_used:      order.point_used      ?? 0,
    })

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[POST /api/payment/prepare]', err)
    return NextResponse.json({ error: '결제 준비에 실패했습니다' }, { status: 500 })
  }
}
