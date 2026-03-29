import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const page  = parseInt(searchParams.get('page')  || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const q      = searchParams.get('q')      || ''
    const status = searchParams.get('status') || ''
    const sort   = searchParams.get('sort')   || 'join_date'

    const offset = (page - 1) * limit

    // member_safe_view: 휴면/탈퇴 회원은 DB 뷰에서 마스킹 처리됨
    let query = supabase
      .from('member_safe_view')
      .select('*', { count: 'exact' })

    if (q)      query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%`)
    if (status) query = query.eq('status', status)

    const validSorts: Record<string, string> = {
      join_date:  'join_date',
      last_login: 'last_login',
    }
    query = query
      .order(validSorts[sort] || 'join_date', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, count, error } = await query
    if (error) throw error

    return NextResponse.json({ data: data ?? [], total: count ?? 0, page, limit })
  } catch (err) {
    console.error('[GET /api/members]', err)
    return NextResponse.json({ error: '회원 목록 조회에 실패했습니다' }, { status: 500 })
  }
}
