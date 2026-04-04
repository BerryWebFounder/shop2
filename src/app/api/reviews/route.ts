import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient as createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const reviewSchema = z.object({
  product_id:     z.string().uuid('상품 ID가 올바르지 않습니다'),
  order_id:       z.string().uuid().nullable().optional(),
  reviewer_name:  z.string().min(1, '이름을 입력하세요').max(50),
  reviewer_email: z.string().email('올바른 이메일 형식이 아닙니다').or(z.literal('')).optional(),
  rating:         z.number().int().min(1).max(5),
  title:          z.string().min(1, '제목을 입력하세요').max(100),
  body:           z.string().min(5, '내용을 5자 이상 입력하세요').max(2000),
})

// ── 리뷰 목록 조회 ────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const supabase      = createClient()
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('product_id')
    const status    = searchParams.get('status') || 'approved'
    const page      = parseInt(searchParams.get('page') || '1')
    const limit     = parseInt(searchParams.get('limit') || '10')
    const sort      = searchParams.get('sort') || 'newest'  // newest | rating_high | helpful
    const offset    = (page - 1) * limit

    // 관리자용: 전체 조회 (admin=true 파라미터)
    const isAdmin = searchParams.get('admin') === 'true'

    let query = isAdmin
      ? supabase.from('review_admin_view').select('*', { count: 'exact' })
      : supabase.from('product_reviews').select('*', { count: 'exact' })
                .eq('status', status)

    if (productId) query = query.eq('product_id', productId)
    if (isAdmin && status) query = query.eq('status', status)

    // 정렬
    switch (sort) {
      case 'rating_high': query = query.order('rating', { ascending: false }); break
      case 'rating_low':  query = query.order('rating', { ascending: true });  break
      case 'helpful':     query = query.order('helpful_count', { ascending: false }); break
      default:            query = query.order('created_at', { ascending: false })
    }

    query = query.range(offset, offset + limit - 1)

    const { data, count, error } = await query
    if (error) throw error

    // 평점 요약도 함께 반환 (상품 ID가 있을 때)
    let ratingSummary = null
    if (productId) {
      const { data: summary } = await supabase
        .from('product_rating_summary')
        .select('*')
        .eq('product_id', productId)
        .single()
      ratingSummary = summary
    }

    return NextResponse.json({ data: data ?? [], total: count ?? 0, page, limit, ratingSummary })
  } catch (err) {
    console.error('[GET /api/reviews]', err)
    return NextResponse.json({ error: '리뷰 조회에 실패했습니다' }, { status: 500 })
  }
}

// ── 리뷰 작성 ────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body     = await request.json()
    const parsed   = reviewSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const data = parsed.data

    // 로그인 사용자면 member_id 연결
    const { data: { user } } = await supabase.auth.getUser()
    let memberId: string | null = null
    if (user) {
      const { data: member } = await supabase
        .from('members')
        .select('id')
        .eq('email', user.email ?? '')
        .single()
      memberId = member?.id ?? null
    }

    // 중복 리뷰 방지 (회원의 경우)
    if (memberId) {
      const { count } = await supabase
        .from('product_reviews')
        .select('*', { count: 'exact', head: true })
        .eq('member_id', memberId)
        .eq('product_id', data.product_id)

      if (count && count > 0) {
        return NextResponse.json(
          { error: '이미 이 상품에 리뷰를 작성하셨습니다' },
          { status: 409 }
        )
      }
    }

    // 상품 존재 및 판매 여부 확인
    const { data: product } = await supabase
      .from('products')
      .select('id, status')
      .eq('id', data.product_id)
      .single()

    if (!product) {
      return NextResponse.json({ error: '상품을 찾을 수 없습니다' }, { status: 404 })
    }

    const { data: review, error } = await supabase
      .from('product_reviews')
      .insert({
        ...data,
        member_id:      memberId,
        reviewer_email: data.reviewer_email || null,
        status:         'pending',   // 관리자 승인 후 공개
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(
      { data: review, message: '리뷰가 등록되었습니다. 관리자 검토 후 공개됩니다.' },
      { status: 201 }
    )
  } catch (err) {
    console.error('[POST /api/reviews]', err)
    return NextResponse.json({ error: '리뷰 등록에 실패했습니다' }, { status: 500 })
  }
}
