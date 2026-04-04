import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient as createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// ── 포인트 내역 + 잔액 조회 ───────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const page  = parseInt(searchParams.get('page') || '1')
    const limit = 20
    const offset = (page - 1) * limit

    const [{ data: history, count }, { data: balance }] = await Promise.all([
      supabase
        .from('member_points')
        .select('*', { count: 'exact' })
        .eq('member_id', memberId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1),
      supabase
        .from('member_point_balance')
        .select('*')
        .eq('member_id', memberId)
        .single(),
    ])

    return NextResponse.json({
      history: history ?? [],
      total:   count ?? 0,
      balance: balance ?? { balance: 0, total_earned: 0, total_used: 0 },
      page,
      limit,
    })
  } catch (err) {
    console.error('[GET /api/points/:memberId]', err)
    return NextResponse.json({ error: '포인트 조회에 실패했습니다' }, { status: 500 })
  }
}

const adminGrantSchema = z.object({
  amount: z.number().int().min(1, '1포인트 이상 지급해야 합니다'),
  reason: z.string().min(1, '사유를 입력하세요').max(200),
})

// ── 관리자 포인트 수동 지급/차감 ─────────────────────────────────
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params
    const supabase = createClient()
    const body   = await request.json()
    const parsed = adminGrantSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    // 차감 시 잔액 확인
    if (parsed.data.amount < 0) {
      const { data: balance } = await supabase
        .from('member_point_balance')
        .select('balance')
        .eq('member_id', memberId)
        .single()

      if (!balance || balance.balance < Math.abs(parsed.data.amount)) {
        return NextResponse.json(
          { error: '잔액이 부족합니다' },
          { status: 400 }
        )
      }
    }

    const { data, error } = await supabase
      .from('member_points')
      .insert({
        member_id: memberId,
        amount:    parsed.data.amount,
        type:      'admin',
        reason:    `[관리자] ${parsed.data.reason}`,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({
      data,
      message: parsed.data.amount > 0
        ? `${parsed.data.amount}포인트가 지급되었습니다`
        : `${Math.abs(parsed.data.amount)}포인트가 차감되었습니다`,
    })
  } catch (err) {
    console.error('[POST /api/points/:memberId]', err)
    return NextResponse.json({ error: '포인트 처리에 실패했습니다' }, { status: 500 })
  }
}
