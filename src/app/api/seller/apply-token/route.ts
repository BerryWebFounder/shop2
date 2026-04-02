// ================================================================
// GET /api/seller/apply-token?token=xxx
// 토큰 유효성 검증
// ================================================================
import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ valid: false, error: '토큰이 없습니다.' }, { status: 400 })

  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data } = await svc
    .from('seller_apply_tokens')
    .select('email, expires_at, used_at')
    .eq('token', token)
    .single()

  if (!data)               return NextResponse.json({ valid: false, error: '유효하지 않은 링크입니다.' })
  if (data.used_at)        return NextResponse.json({ valid: false, error: '이미 사용된 링크입니다.' })
  if (new Date(data.expires_at) < new Date())
                           return NextResponse.json({ valid: false, error: '만료된 링크입니다. (48시간 초과)' })

  return NextResponse.json({ valid: true, email: data.email })
}
