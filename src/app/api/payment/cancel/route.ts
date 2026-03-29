import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { cancelPayment, TossPaymentError } from '@/lib/toss'
import { z } from 'zod'

const cancelSchema = z.object({
  payment_id:   z.string().uuid(),
  cancel_reason: z.string().min(1, '취소 사유를 입력하세요').max(200),
  cancel_amount: z.number().int().positive().optional(),  // 부분 취소용
})

export async function POST(request: NextRequest) {
  try {
    const supabase      = createServiceClient()
    const body          = await request.json()
    const parsed        = cancelSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const { payment_id, cancel_reason, cancel_amount } = parsed.data

    // 결제 정보 조회
    const { data: payment } = await supabase
      .from('payments')
      .select('*, order:orders!order_id(id, order_no, member_id)')
      .eq('id', payment_id)
      .single()

    if (!payment || !payment.payment_key) {
      return NextResponse.json({ error: '결제 정보를 찾을 수 없습니다' }, { status: 404 })
    }

    if (payment.status === 'canceled') {
      return NextResponse.json({ error: '이미 취소된 결제입니다' }, { status: 400 })
    }

    // 가상계좌 입금 대기 중인 경우 바로 취소 처리 (토스 API 불필요)
    if (payment.status === 'waiting_for_deposit') {
      await supabase.from('payments').update({
        status:        'canceled',
        cancel_reason,
        canceled_at:   new Date().toISOString(),
        cancel_amount: payment.amount,
      }).eq('id', payment_id)

      return NextResponse.json({ success: true, message: '가상계좌 발급이 취소되었습니다' })
    }

    // 토스페이먼츠 취소 API 호출
    const tossResponse = await cancelPayment({
      paymentKey:   payment.payment_key,
      cancelReason: cancel_reason,
      cancelAmount: cancel_amount,
    })

    const actualCancelAmount = cancel_amount ?? payment.amount
    const isPartial          = cancel_amount !== undefined && cancel_amount < payment.amount

    // DB 업데이트
    await supabase.from('payments').update({
      status:        isPartial ? 'partial_canceled' : 'canceled',
      cancel_amount: actualCancelAmount,
      cancel_reason,
      canceled_at:   new Date().toISOString(),
      toss_response: tossResponse,
    }).eq('id', payment_id)

    // 포인트 사용분 복구 (orders에서 point_used 조회)
    const order = payment.order as { id: string; member_id?: string; order_no: string } | null
    if (order?.id && !isPartial) {
      try { await supabase.rpc('refund_points_on_cancel', { p_order_id: order.id }) } catch {}
    }

    return NextResponse.json({
      success:  true,
      message:  isPartial ? `${actualCancelAmount.toLocaleString()}원이 부분 취소되었습니다` : '결제가 취소되었습니다',
      payment_key: payment.payment_key,
    })

  } catch (err) {
    if (err instanceof TossPaymentError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.statusCode }
      )
    }
    console.error('[Payment Cancel]', err)
    return NextResponse.json({ error: '결제 취소 중 오류가 발생했습니다' }, { status: 500 })
  }
}
