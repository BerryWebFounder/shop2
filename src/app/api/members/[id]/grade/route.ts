import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const gradeSchema = z.object({
  grade:  z.enum(['bronze', 'silver', 'gold', 'vip']),
  reason: z.string().max(200).optional().default('admin'),
})

// ── 등급 수동 변경 (관리자) ───────────────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body   = await request.json()
    const parsed = gradeSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    // 현재 등급 조회
    const { data: current } = await supabase
      .from('members').select('grade, name').eq('id', id).single()

    if (!current) {
      return NextResponse.json({ error: '회원을 찾을 수 없습니다' }, { status: 404 })
    }

    if (current.grade === parsed.data.grade) {
      return NextResponse.json({ error: '현재와 동일한 등급입니다' }, { status: 400 })
    }

    // 등급 변경
    const { data, error } = await supabase
      .from('members')
      .update({ grade: parsed.data.grade, grade_updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // 이력 기록
    await supabase.from('member_grade_history').insert({
      member_id:  id,
      from_grade: current.grade,
      to_grade:   parsed.data.grade,
      reason:     `admin: ${parsed.data.reason}`,
    })

    return NextResponse.json({ data, message: `${current.name} 회원의 등급이 ${parsed.data.grade}로 변경되었습니다` })
  } catch (err) {
    console.error('[PATCH /api/members/:id/grade]', err)
    return NextResponse.json({ error: '등급 변경에 실패했습니다' }, { status: 500 })
  }
}

// ── 등급 자동 재계산 (관리자 수동 트리거) ────────────────────────
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('update_member_grade', { p_member_id: id })
    if (error) throw error

    return NextResponse.json({ new_grade: data, message: '등급이 재계산되었습니다' })
  } catch (err) {
    console.error('[POST /api/members/:id/grade]', err)
    return NextResponse.json({ error: '등급 재계산에 실패했습니다' }, { status: 500 })
  }
}
