import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const schema = z.object({
  token:           z.string(),
  email:           z.string().email(),
  user_id:         z.string().uuid(),
  business_name:   z.string().min(1),
  business_type:   z.enum(['individual', 'corporation']),
  business_number: z.string().optional(),
  representative:  z.string().min(1),
  phone:           z.string().min(1),
  address:         z.string().min(1),
  store_name:      z.string().min(1),
  store_slug:      z.string().min(2).regex(/^[a-z0-9-]+$/),
  store_category:  z.string().min(1),
  store_intro:     z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const { token, ...data } = parsed.data
    const svc = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 1. 토큰 재검증 + 원자적 소비
    const { data: tokenRow } = await svc
      .from('seller_apply_tokens')
      .select('id, email, expires_at, used_at')
      .eq('token', token)
      .single()

    if (!tokenRow)                              return NextResponse.json({ error: '유효하지 않은 링크입니다.' }, { status: 400 })
    if (tokenRow.used_at)                       return NextResponse.json({ error: '이미 사용된 링크입니다.' }, { status: 400 })
    if (new Date(tokenRow.expires_at) < new Date()) return NextResponse.json({ error: '만료된 링크입니다.' }, { status: 400 })

    // 2. slug 중복 체크
    const [{ data: slugA }, { data: slugB }] = await Promise.all([
      svc.from('seller_applications').select('id').eq('store_slug', data.store_slug).maybeSingle(),
      svc.from('seller_stores').select('id').eq('slug', data.store_slug).maybeSingle(),
    ])
    if (slugA || slugB) return NextResponse.json({ error: '이미 사용 중인 URL입니다.' }, { status: 400 })

    // 3. 신청서 저장
    const { error: appErr } = await svc.from('seller_applications').insert({
      user_id:         data.user_id,
      business_name:   data.business_name,
      business_type:   data.business_type,
      business_number: data.business_number ?? null,
      representative:  data.representative,
      phone:           data.phone,
      email:           data.email,
      address:         data.address,
      store_name:      data.store_name,
      store_slug:      data.store_slug,
      store_category:  data.store_category,
      store_intro:     data.store_intro ?? null,
      status:          'pending',
    })
    if (appErr) throw appErr

    // 4. profiles.seller_status = pending
    await svc.from('profiles')
      .update({ seller_status: 'pending' })
      .eq('id', data.user_id)

    // 5. 토큰 사용 처리 (재사용 방지)
    await svc.from('seller_apply_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token)

    return NextResponse.json({ message: '신청이 완료되었습니다.' })

  } catch (err) {
    console.error('[apply-submit]', err)
    return NextResponse.json({ error: '제출 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
