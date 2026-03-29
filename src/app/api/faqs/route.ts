import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const faqSchema = z.object({
  category:   z.enum(['order','shipping','return','product','account','coupon','other']),
  question:   z.string().min(1, '질문을 입력하세요').max(300),
  answer:     z.string().min(1, '답변을 입력하세요').max(5000),
  sort_order: z.number().int().min(0).default(0),
  is_active:  z.boolean().default(true),
})

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || ''
    const isAdmin  = searchParams.get('admin') === 'true'

    let query = supabase
      .from('faqs')
      .select('*')
      .order('category').order('sort_order')

    if (!isAdmin) query = query.eq('is_active', true)
    if (category) query = query.eq('category', category)

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    console.error('[GET /api/faqs]', err)
    return NextResponse.json({ error: 'FAQ 조회에 실패했습니다' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body   = await request.json()
    const parsed = faqSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('faqs')
      .insert(parsed.data)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data, message: 'FAQ가 등록되었습니다' }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/faqs]', err)
    return NextResponse.json({ error: 'FAQ 등록에 실패했습니다' }, { status: 500 })
  }
}
