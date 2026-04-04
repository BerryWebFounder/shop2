import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient as createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const inquirySchema = z.object({
  category:     z.enum(['order','shipping','return','product','account','coupon','other']),
  title:        z.string().min(1, '제목을 입력하세요').max(200),
  body:         z.string().min(5, '내용을 5자 이상 입력하세요').max(5000),
  order_id:     z.string().uuid().nullable().optional(),
  author_name:  z.string().min(1, '이름을 입력하세요').max(50),
  author_email: z.string().email('올바른 이메일을 입력하세요'),
  attachments:  z.array(z.string().url()).max(5).default([]),
})

// ── 문의 목록 ─────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const isAdmin    = searchParams.get('admin')    === 'true'
    const memberId   = searchParams.get('member_id') || ''
    const status     = searchParams.get('status')   || ''
    const category   = searchParams.get('category') || ''
    const q          = searchParams.get('q')        || ''
    const page       = parseInt(searchParams.get('page') || '1')
    const limit      = 20
    const offset     = (page - 1) * limit

    let query = supabase
      .from('inquiries')
      .select(`
        id, category, title, status, is_private, author_name, author_email,
        created_at, updated_at, admin_replied_at,
        order:orders!order_id(order_no),
        member:members!member_id(name, email)
      `, { count: 'exact' })

    if (!isAdmin && memberId) query = query.eq('member_id', memberId)
    if (status)   query = query.eq('status', status)
    if (category) query = query.eq('category', category)
    if (q)        query = query.or(`title.ilike.%${q}%,author_name.ilike.%${q}%`)

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)

    const { data, count, error } = await query
    if (error) throw error

    return NextResponse.json({ data: data ?? [], total: count ?? 0, page, limit })
  } catch (err) {
    console.error('[GET /api/inquiries]', err)
    return NextResponse.json({ error: '문의 목록 조회에 실패했습니다' }, { status: 500 })
  }
}

// ── 문의 등록 ─────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body     = await request.json()
    const parsed   = inquirySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    // 로그인 회원이면 member_id 연결
    const { data: { user } } = await supabase.auth.getUser()
    let memberId: string | null = null
    if (user) {
      const { data: member } = await supabase
        .from('members').select('id').eq('email', user.email ?? '').single()
      memberId = member?.id ?? null
    }

    const { data, error } = await supabase
      .from('inquiries')
      .insert({ ...parsed.data, member_id: memberId })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(
      { data, message: '문의가 접수되었습니다. 빠른 시간 내에 답변 드리겠습니다.' },
      { status: 201 }
    )
  } catch (err) {
    console.error('[POST /api/inquiries]', err)
    return NextResponse.json({ error: '문의 등록에 실패했습니다' }, { status: 500 })
  }
}
