import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient as createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { ReviewStatus } from '@/types/review'

const adminActionSchema = z.object({
  action:        z.enum(['approve', 'reject', 'reply']),
  reject_reason: z.string().max(500).optional(),
  admin_reply:   z.string().max(1000).optional(),
})

// ── 관리자 액션 (승인 / 거부 / 답변) ─────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createClient()
    const body     = await request.json()
    const parsed   = adminActionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const { action, reject_reason, admin_reply } = parsed.data
    let updates: Record<string, unknown> = {}

    switch (action) {
      case 'approve':
        updates = { status: 'approved' as ReviewStatus }
        break
      case 'reject':
        if (!reject_reason?.trim()) {
          return NextResponse.json(
            { error: '거부 사유를 입력하세요' },
            { status: 400 }
          )
        }
        updates = { status: 'rejected' as ReviewStatus, reject_reason }
        break
      case 'reply':
        if (!admin_reply?.trim()) {
          return NextResponse.json(
            { error: '답변 내용을 입력하세요' },
            { status: 400 }
          )
        }
        updates = {
          admin_reply,
          admin_replied_at: new Date().toISOString(),
        }
        break
    }

    const { data, error } = await supabase
      .from('product_reviews')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    const messages: Record<string, string> = {
      approve: '리뷰가 승인되었습니다',
      reject:  '리뷰가 거부되었습니다',
      reply:   '답변이 등록되었습니다',
    }

    return NextResponse.json({ data, message: messages[action] })
  } catch (err) {
    console.error('[PATCH /api/reviews/:id]', err)
    return NextResponse.json({ error: '처리에 실패했습니다' }, { status: 500 })
  }
}

// ── 리뷰 삭제 (관리자) ────────────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createClient()
    const { error } = await supabase
      .from('product_reviews')
      .delete()
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ message: '리뷰가 삭제되었습니다' })
  } catch (err) {
    console.error('[DELETE /api/reviews/:id]', err)
    return NextResponse.json({ error: '삭제에 실패했습니다' }, { status: 500 })
  }
}
