import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import crypto from 'crypto'

// 토스페이먼츠 웹훅 시크릿으로 서명 검증
function verifyWebhookSignature(
  rawBody:   string,
  signature: string,
  secret:    string
): boolean {
  const hmac = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('base64')
  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature))
}

export async function POST(request: NextRequest) {
  try {
    const rawBody   = await request.text()
    const signature = request.headers.get('toss-signature') ?? ''
    const secret    = process.env.TOSS_WEBHOOK_SECRET ?? ''

    // ── 서명 검증 (운영 환경에서 필수) ───────────────────────────
    if (secret && !verifyWebhookSignature(rawBody, signature, secret)) {
      console.error('[Webhook] 서명 검증 실패')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const event = JSON.parse(rawBody)
    const { eventType, data } = event

    console.log('[Webhook]', eventType, data?.paymentKey)

    const supabase = createServiceClient()

    switch (eventType) {
      // ── 가상계좌 입금 완료 ────────────────────────────────────
      case 'VIRTUAL_ACCOUNT_COMPONENTS_CHANGED': {
        if (data.status !== 'DONE') break

        const { error } = await supabase
          .from('payments')
          .update({
            status:       'done',
            approved_at:  new Date().toISOString(),
            toss_response: data,
          })
          .eq('payment_key', data.paymentKey)

        if (error) throw error

        // 주문 상태도 paid로 변경 (트리거가 처리하지만 명시적으로도)
        const { data: payment } = await supabase
          .from('payments').select('order_id').eq('payment_key', data.paymentKey).single()

        if (payment?.order_id) {
          await supabase.from('orders')
            .update({ status: 'paid', paid_at: new Date().toISOString() })
            .eq('id', payment.order_id)
        }
        break
      }

      // ── 결제 취소 ────────────────────────────────────────────
      case 'PAYMENT_STATUS_CHANGED': {
        if (data.status === 'CANCELED') {
          await supabase.from('payments').update({
            status:     'canceled',
            canceled_at: new Date().toISOString(),
          }).eq('payment_key', data.paymentKey)
        }
        break
      }

      default:
        console.log('[Webhook] 미처리 이벤트:', eventType)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Webhook Error]', err)
    // 웹훅은 200을 반환해야 재시도를 방지할 수 있음
    return NextResponse.json({ ok: false, error: String(err) })
  }
}
