import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendPushToMany, buildOrderStatusPayload, type PushPayload } from '@/lib/webpush'
import { z } from 'zod'

const sendSchema = z.object({
  type:      z.enum(['order', 'marketing', 'system']),
  // 주문 알림
  order_id:  z.string().uuid().optional(),
  status:    z.string().optional(),
  // 마케팅/시스템 알림
  title:     z.string().min(1).max(100).optional(),
  body:      z.string().min(1).max(300).optional(),
  url:       z.string().optional(),
  image:     z.string().url().optional(),
  // 대상
  target:    z.enum(['all', 'member', 'grade']).default('all'),
  member_id: z.string().uuid().optional(),
  grade:     z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    const body     = await request.json()
    const parsed   = sendSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const data = parsed.data
    let payload: PushPayload | null = null

    // ── 주문 상태 알림 ────────────────────────────────────────────
    if (data.type === 'order') {
      if (!data.order_id || !data.status) {
        return NextResponse.json({ error: 'order_id와 status가 필요합니다' }, { status: 400 })
      }

      const { data: order } = await supabase
        .from('orders').select('order_no, member_id').eq('id', data.order_id).single()

      if (!order) return NextResponse.json({ error: '주문을 찾을 수 없습니다' }, { status: 404 })

      payload = buildOrderStatusPayload(data.status, order.order_no, data.order_id)
      if (!payload) return NextResponse.json({ message: '알림 없는 상태입니다' })

      // 해당 회원의 구독만 조회
      if (order.member_id) {
        const { data: subs } = await supabase
          .from('push_subscriptions')
          .select('id, endpoint, p256dh, auth')
          .eq('member_id', order.member_id)
          .eq('is_active', true)
          .eq('notify_order', true)

        if (!subs || subs.length === 0) {
          return NextResponse.json({ message: '구독 없음', sent: 0 })
        }

        const result = await sendPushToMany(subs, payload)
        await logPushSend(supabase, subs, order.member_id, data.type, payload, result.expired)
        return NextResponse.json({ ...result, message: '주문 알림 발송 완료' })
      }
    }

    // ── 마케팅/시스템 알림 ────────────────────────────────────────
    if (!data.title || !data.body) {
      return NextResponse.json({ error: 'title과 body가 필요합니다' }, { status: 400 })
    }

    payload = {
      title: data.title,
      body:  data.body,
      url:   data.url  ?? '/shop',
      image: data.image,
      tag:   `marketing-${Date.now()}`,
    }

    // 대상 구독 조회
    let subsQuery = supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth, member_id')
      .eq('is_active', true)
      .eq('notify_marketing', true)

    if (data.target === 'member' && data.member_id) {
      subsQuery = subsQuery.eq('member_id', data.member_id)
    } else if (data.target === 'grade' && data.grade) {
      // 특정 등급 회원들에게만
      const { data: gradeMembers } = await supabase
        .from('members').select('id').eq('grade', data.grade).eq('status', 'active')
      const memberIds = (gradeMembers ?? []).map(m => m.id)
      if (memberIds.length === 0) return NextResponse.json({ sent: 0, message: '대상 없음' })
      subsQuery = subsQuery.in('member_id', memberIds)
    }

    const { data: subs } = await subsQuery
    if (!subs || subs.length === 0) {
      return NextResponse.json({ sent: 0, message: '구독 없음' })
    }

    const result = await sendPushToMany(subs, payload)
    await logPushSend(supabase, subs, null, data.type, payload, result.expired)

    return NextResponse.json({ ...result, message: `${result.sent}명에게 발송 완료` })

  } catch (err) {
    console.error('[POST /api/push/send]', err)
    return NextResponse.json({ error: '푸시 발송에 실패했습니다' }, { status: 500 })
  }
}

// 발송 로그 기록 + 만료 구독 비활성화
async function logPushSend(
  supabase: ReturnType<typeof createServiceClient>,
  subs:    Array<{ id: string; endpoint: string; member_id?: string | null }>,
  memberId: string | null,
  type:    string,
  payload: PushPayload,
  expired: string[]
) {
  // 만료 구독 비활성화
  if (expired.length > 0) {
    await supabase.from('push_subscriptions')
      .update({ is_active: false })
      .in('id', expired)
  }

  // 로그 기록 (최대 10개만)
  const logs = subs.slice(0, 10).map(sub => ({
    subscription_id: sub.id,
    member_id:       memberId ?? sub.member_id ?? null,
    type,
    title:   payload.title,
    body:    payload.body,
    success: !expired.includes(sub.id),
  }))

  await supabase.from('push_logs').insert(logs)
}
