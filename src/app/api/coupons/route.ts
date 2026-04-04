import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient as createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const couponSchema = z.object({
  code:             z.string().min(2).max(30).transform(v => v.trim().toUpperCase()),
  name:             z.string().min(1, '쿠폰 이름을 입력하세요').max(100),
  description:      z.string().max(500).optional().default(''),
  discount_type:    z.enum(['percent', 'fixed']),
  discount_value:   z.number().int().min(1),
  min_order_amount: z.number().int().min(0).default(0),
  max_discount_amt: z.number().int().min(0).nullable().optional(),
  usage_limit:      z.number().int().min(1).nullable().optional(),
  per_user_limit:   z.number().int().min(1).default(1),
  valid_from:       z.string().default(() => new Date().toISOString()),
  valid_until:      z.string().nullable().optional(),
  applicable_cat:   z.string().nullable().optional(),
  is_active:        z.boolean().default(true),
})

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || ''
    const q      = searchParams.get('q')      || ''
    const page   = parseInt(searchParams.get('page') || '1')
    const limit  = 20
    const offset = (page - 1) * limit

    let query = supabase
      .from('coupon_stats_view')
      .select('*', { count: 'exact' })

    if (q) query = query.ilike('name', `%${q}%`)
    if (status === 'active')   query = query.eq('is_active', true)
    if (status === 'inactive') query = query.eq('is_active', false)
    if (status === 'expired')  query = query.lt('valid_until', new Date().toISOString())

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)

    const { data, count, error } = await query
    if (error) throw error

    return NextResponse.json({ data: data ?? [], total: count ?? 0, page, limit })
  } catch (err) {
    console.error('[GET /api/coupons]', err)
    return NextResponse.json({ error: '쿠폰 조회에 실패했습니다' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body   = await request.json()
    const parsed = couponSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    // 코드 중복 확인
    const { count } = await supabase
      .from('coupons')
      .select('*', { count: 'exact', head: true })
      .eq('code', parsed.data.code)

    if (count && count > 0) {
      return NextResponse.json(
        { error: '이미 사용 중인 쿠폰 코드입니다' },
        { status: 409 }
      )
    }

    // 할인율 유효성 (percent는 1–100)
    if (parsed.data.discount_type === 'percent' && parsed.data.discount_value > 100) {
      return NextResponse.json(
        { error: '할인율은 1–100% 사이여야 합니다' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('coupons')
      .insert(parsed.data)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data, message: '쿠폰이 등록되었습니다' }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/coupons]', err)
    return NextResponse.json({ error: '쿠폰 등록에 실패했습니다' }, { status: 500 })
  }
}
