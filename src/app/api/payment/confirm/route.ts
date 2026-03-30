import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { confirmPayment, TossPaymentError, toPaymentMethod, validateAmount } from '@/lib/toss'
import { z } from 'zod'

const confirmSchema = z.object({
  paymentKey: z.string().min(1, 'paymentKey가 없습니다'),
  orderId:    z.string().min(1, 'orderId가 없습니다'),   // 토스 orderId (= order_id_toss)
  amount:     z.number().int().positive(),
})

export async function POST(request: NextRequest) {
  // service_role 클라이언트 사용 (RLS 우회 — 결제 승인은 서버 전용)
  const supabase = createServiceClient()
  const userClient = await createClient()

  // body를 한 번만 읽어 try/catch 전체에서 재사용
  let orderIdTossFromBody: string | undefined
  try {
    const body   = await request.json()
    const parsed = confirmSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const { paymentKey, orderId: orderIdToss, amount } = parsed.data
    orderIdTossFromBody = orderIdToss

    // ── 1. DB에서 결제 레코드 조회 (위변조 방지) ──────────────────
    const { data: payment, error: paymentFetchError } = await supabase
      .from('payments')
      .select('*, order:orders!order_id(id, order_no, total_amount, coupon_discount, point_used)')
      .eq('order_id_toss', orderIdToss)
      .single()

    if (paymentFetchError || !payment) {
      return NextResponse.json(
        { error: '결제 정보를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // ── 2. 금액 위변조 검증 ──────────────────────────────────────
    if (!validateAmount(payment.amount, amount)) {
      console.error('[Payment] 금액 위변조 감지', { expected: payment.amount, received: amount })
      return NextResponse.json(
        { error: '결제 금액이 일치하지 않습니다' },
        { status: 422 }
      )
    }

    // ── 3. 이미 처리된 결제 중복 방지 ────────────────────────────
    if (payment.status === 'done') {
      return NextResponse.json({ message: '이미 처리된 결제입니다', payment })
    }

    // ── 4. 토스페이먼츠 결제 승인 API 호출 ───────────────────────
    const tossResponse = await confirmPayment({ paymentKey, orderId: orderIdToss, amount })

    // ── 5. DB 결제 레코드 업데이트 ───────────────────────────────
    const updateData: Record<string, unknown> = {
      payment_key:   paymentKey,
      status:        'done',
      method:        toPaymentMethod(tossResponse.method),
      approved_at:   tossResponse.approvedAt,
      toss_response: tossResponse,
    }

    // 카드 정보 (마스킹된 번호만 저장)
    if (tossResponse.card) {
      updateData.card_number  = tossResponse.card.number.slice(-4)   // 마지막 4자리
      updateData.card_company = tossResponse.card.company
    }

    // 가상계좌 정보
    if (tossResponse.virtualAccount) {
      updateData.status                  = 'waiting_for_deposit'
      updateData.virtual_account_number  = tossResponse.virtualAccount.accountNumber
      updateData.virtual_account_bank    = tossResponse.virtualAccount.bankCode
      updateData.virtual_account_due     = tossResponse.virtualAccount.dueDate
    }

    // 간편결제 (KakaoPay, NaverPay 등)
    if (tossResponse.easyPay) {
      updateData.method = tossResponse.easyPay.provider.toLowerCase().replace(' ', '')
    }

    const { data: updatedPayment, error: updateError } = await supabase
      .from('payments')
      .update(updateData)
      .eq('id', payment.id)
      .select()
      .single()

    if (updateError) throw updateError

    // ── 6. 포인트 적립 예약 (배송완료 시 실제 지급) ──────────────
    // 실제 적립은 주문 상태가 delivered 될 때 earn_order_points() RPC 호출

    return NextResponse.json({
      success: true,
      payment: updatedPayment,
      order_no: (payment.order as { order_no: string }).order_no,
      message: tossResponse.virtualAccount
        ? '가상계좌가 발급되었습니다. 기한 내에 입금해 주세요.'
        : '결제가 완료되었습니다.',
    })

  } catch (err) {
    if (err instanceof TossPaymentError) {
      console.error('[Payment Confirm] Toss Error:', err.code, err.message)

      // 결제 실패 기록 — 이미 파싱한 orderIdTossFromBody 재사용 (body 재읽기 불가)
      if (orderIdTossFromBody) {
        await supabase
          .from('payments')
          .update({ status: 'aborted', toss_response: { code: err.code, message: err.message } })
          .eq('order_id_toss', orderIdTossFromBody)
      }

      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.statusCode }
      )
    }

    console.error('[Payment Confirm] Unknown Error:', err)
    return NextResponse.json({ error: '결제 처리 중 오류가 발생했습니다' }, { status: 500 })
  }
}
