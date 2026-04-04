import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { memberStatusSchema } from '@/lib/validations'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('member_safe_view')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    if (!data) return NextResponse.json({ error: '회원을 찾을 수 없습니다' }, { status: 404 })

    // 최근 주문 조회
    const { data: orders } = await supabase
      .from('orders')
      .select('order_no, total_amount, status, created_at')
      .eq('member_id', id)
      .order('created_at', { ascending: false })
      .limit(5)

    return NextResponse.json({ data: { ...data, recent_orders: orders ?? [] } })
  } catch (err) {
    console.error('[GET /api/members/:id]', err)
    return NextResponse.json({ error: '회원 조회에 실패했습니다' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const parsed = memberStatusSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const { status } = parsed.data

    // service_role로 RLS 우회하여 실제 members 테이블 수정
    const supabase = createServiceClient()
    const updates: Record<string, unknown> = { status }

    if (status === 'dormant')   updates.dormant_date  = new Date().toISOString()
    if (status === 'withdrawn') updates.withdraw_date = new Date().toISOString()
    if (status === 'active') {
      updates.dormant_date  = null
      updates.withdraw_date = null
    }
    // 탈퇴 시 개인정보 파기 (전자상거래법: 주문 정보는 별도 보관)
    if (status === 'withdrawn') {
      updates.phone   = null
      updates.address = null
    }

    const { error } = await supabase
      .from('members')
      .update(updates)
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ message: '회원 상태가 변경되었습니다' })
  } catch (err) {
    console.error('[PATCH /api/members/:id]', err)
    return NextResponse.json({ error: '회원 상태 변경에 실패했습니다' }, { status: 500 })
  }
}
