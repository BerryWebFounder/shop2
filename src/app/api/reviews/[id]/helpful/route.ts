import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    const { data: member } = await supabase
      .from('members')
      .select('id')
      .eq('email', user.email ?? '')
      .single()

    if (!member) {
      return NextResponse.json({ error: '회원 정보를 찾을 수 없습니다' }, { status: 404 })
    }

    // 이미 투표했으면 취소 (토글)
    const { data: existing } = await supabase
      .from('review_helpful_votes')
      .select('review_id')
      .eq('review_id', id)
      .eq('member_id', member.id)
      .single()

    if (existing) {
      // 투표 취소
      await supabase
        .from('review_helpful_votes')
        .delete()
        .eq('review_id', id)
        .eq('member_id', member.id)

      await supabase.rpc('decrement_helpful', { p_review_id: id })
      return NextResponse.json({ voted: false, message: '투표가 취소되었습니다' })
    }

    // 투표 추가
    await supabase
      .from('review_helpful_votes')
      .insert({ review_id: id, member_id: member.id })

    // helpful_count 증가 (SQL 함수로 처리)
    await supabase.rpc('increment_helpful', { p_review_id: id })

    return NextResponse.json({ voted: true, message: '도움이 됐어요!' })
  } catch (err) {
    console.error('[POST /api/reviews/:id/helpful]', err)
    return NextResponse.json({ error: '처리에 실패했습니다' }, { status: 500 })
  }
}
