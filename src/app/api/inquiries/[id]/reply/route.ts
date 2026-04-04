import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient as createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const replySchema = z.object({
  body:        z.string().min(1, '답변 내용을 입력하세요').max(3000),
  is_admin:    z.boolean().default(false),
  author_name: z.string().min(1).max(50),
  attachments: z.array(z.string().url()).max(5).default([]),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createClient()
    const body   = await request.json()
    const parsed = replySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    // 문의 존재 확인
    const { data: inquiry } = await supabase
      .from('inquiries').select('id, status').eq('id', id).single()

    if (!inquiry) {
      return NextResponse.json({ error: '문의를 찾을 수 없습니다' }, { status: 404 })
    }

    // 종결된 문의에는 답변 불가
    if (inquiry.status === 'closed' && !parsed.data.is_admin) {
      return NextResponse.json({ error: '종결된 문의에는 답변할 수 없습니다' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('inquiry_replies')
      .insert({ ...parsed.data, inquiry_id: id })
      .select()
      .single()

    if (error) throw error

    // 관리자 답변인 경우 status → in_progress로 변경 (트리거가 answered로 변경)
    if (parsed.data.is_admin && inquiry.status === 'pending') {
      await supabase.from('inquiries')
        .update({ status: 'in_progress' })
        .eq('id', id)
    }

    return NextResponse.json({ data, message: '답변이 등록되었습니다' }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/inquiries/:id/reply]', err)
    return NextResponse.json({ error: '답변 등록에 실패했습니다' }, { status: 500 })
  }
}
