import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const subscribeSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string(),
      auth:   z.string(),
    }),
  }),
  action: z.enum(['subscribe', 'unsubscribe', 'renew']).default('subscribe'),
  notify_order:     z.boolean().optional().default(true),
  notify_marketing: z.boolean().optional().default(true),
})

export async function POST(request: NextRequest) {
  try {
    const supabase  = await createClient()
    const body      = await request.json()
    const parsed    = subscribeSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const { subscription, action, notify_order, notify_marketing } = parsed.data
    const { endpoint, keys: { p256dh, auth } } = subscription

    // 로그인 회원이면 member_id 연결
    const { data: { user } } = await supabase.auth.getUser()
    let memberId: string | null = null
    if (user) {
      const { data: member } = await supabase
        .from('members').select('id').eq('email', user.email ?? '').single()
      memberId = member?.id ?? null
    }

    const userAgent = request.headers.get('user-agent') ?? ''

    if (action === 'unsubscribe') {
      await supabase.from('push_subscriptions')
        .update({ is_active: false })
        .eq('endpoint', endpoint)
      return NextResponse.json({ message: '구독이 해제되었습니다' })
    }

    // upsert: 이미 있으면 갱신, 없으면 생성
    const { error } = await supabase.from('push_subscriptions').upsert({
      endpoint,
      p256dh,
      auth,
      member_id:        memberId,
      user_agent:       userAgent,
      is_active:        true,
      notify_order,
      notify_marketing,
    }, { onConflict: 'endpoint' })

    if (error) throw error

    return NextResponse.json({ message: '푸시 알림이 활성화되었습니다' }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/push/subscribe]', err)
    return NextResponse.json({ error: '구독 처리에 실패했습니다' }, { status: 500 })
  }
}
