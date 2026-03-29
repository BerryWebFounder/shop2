import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// ── 문의 상세 조회 ────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const [{ data: inquiry, error }, { data: replies }] = await Promise.all([
      supabase.from('inquiries').select(`
        *,
        order:orders!order_id(id, order_no, total_amount, status),
        member:members!member_id(id, name, email)
      `).eq('id', id).single(),

      supabase.from('inquiry_replies')
        .select('*')
        .eq('inquiry_id', id)
        .order('created_at', { ascending: true }),
    ])

    if (error) throw error
    if (!inquiry) return NextResponse.json({ error: '문의를 찾을 수 없습니다' }, { status: 404 })

    // FAQ 조회수 증가 처리는 별도
    return NextResponse.json({ data: { ...inquiry, replies: replies ?? [] } })
  } catch (err) {
    console.error('[GET /api/inquiries/:id]', err)
    return NextResponse.json({ error: '문의 조회에 실패했습니다' }, { status: 500 })
  }
}

const statusSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'answered', 'closed']),
})

// ── 상태 변경 (관리자) ────────────────────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body   = await request.json()
    const parsed = statusSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('inquiries')
      .update({ status: parsed.data.status })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data, message: '상태가 변경되었습니다' })
  } catch (err) {
    console.error('[PATCH /api/inquiries/:id]', err)
    return NextResponse.json({ error: '상태 변경에 실패했습니다' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { error } = await supabase.from('inquiries').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ message: '문의가 삭제되었습니다' })
  } catch (err) {
    console.error('[DELETE /api/inquiries/:id]', err)
    return NextResponse.json({ error: '삭제에 실패했습니다' }, { status: 500 })
  }
}
