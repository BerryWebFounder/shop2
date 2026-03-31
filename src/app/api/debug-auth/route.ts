import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const result: Record<string, unknown> = {}

  // 1. 환경변수 확인
  result.env = {
    SUPABASE_URL_set:         !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    ANON_KEY_set:             !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SERVICE_ROLE_KEY_set:     !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    SERVICE_KEY_prefix:       process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 20) + '...',
  }

  // 2. anon key로 세션 확인
  try {
    const anonClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => request.cookies.getAll(), setAll: () => {} } }
    )
    const { data: { user }, error } = await anonClient.auth.getUser()
    result.session = {
      logged_in:  !!user,
      user_id:    user?.id ?? null,
      user_email: user?.email ?? null,
      error:      error?.message ?? null,
    }

    // 3. anon key로 profiles 조회
    if (user) {
      const { data, error: pe } = await anonClient
        .from('profiles').select('*').eq('id', user.id).single()
      result.profiles_via_anon = { data, error: pe?.message ?? null }
    }
  } catch (e) { result.anon_error = String(e) }

  // 4. service role key로 profiles 전체
  try {
    const svc = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { data: profiles, error: se } = await svc
      .from('profiles').select('id, email, role, seller_status')
    result.profiles_via_service = {
      count: profiles?.length ?? 0,
      rows:  profiles,
      error: se?.message ?? null,
    }

    // 5. auth.users
    const { data: { users }, error: ue } = await svc.auth.admin.listUsers()
    result.auth_users = {
      count: users?.length ?? 0,
      rows:  users?.map(u => ({ id: u.id, email: u.email, confirmed: u.email_confirmed_at })),
      error: ue?.message ?? null,
    }
  } catch (e) { result.service_error = String(e) }

  return NextResponse.json(result, { status: 200 })
}
