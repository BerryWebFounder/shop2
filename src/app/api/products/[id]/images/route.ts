import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const imagesSchema = z.object({
  // Storage 경로 배열 (순서 = 전시 순서, 첫 번째가 대표 이미지)
  images: z.array(
    z.object({
      storage_path: z.string().min(1),
      public_url:   z.string().url(),
      sort_order:   z.number().int().min(0),
    })
  ),
})

// ── 상품 이미지 목록 조회 ─────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('product_images')
      .select('*')
      .eq('product_id', id)
      .order('sort_order')

    if (error) throw error
    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    console.error('[GET /api/products/:id/images]', err)
    return NextResponse.json(
      { error: '이미지 조회에 실패했습니다' },
      { status: 500 }
    )
  }
}

// ── 상품 이미지 목록 저장 (전체 교체) ─────────────────────────────
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body   = await request.json()
    const parsed = imagesSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    // 기존 이미지 전체 삭제 후 재삽입 (순서 반영)
    const { error: delError } = await supabase
      .from('product_images')
      .delete()
      .eq('product_id', id)

    if (delError) throw delError

    if (parsed.data.images.length > 0) {
      const rows = parsed.data.images.map((img, i) => ({
        product_id:   id,
        storage_path: img.storage_path,
        public_url:   img.public_url,
        sort_order:   i,             // 클라이언트 순서를 그대로 반영
        is_primary:   i === 0,       // 첫 번째 = 대표 이미지
      }))

      const { error: insError } = await supabase
        .from('product_images')
        .insert(rows)

      if (insError) throw insError
    }

    return NextResponse.json({ message: '이미지가 저장되었습니다' })
  } catch (err) {
    console.error('[PUT /api/products/:id/images]', err)
    return NextResponse.json(
      { error: '이미지 저장에 실패했습니다' },
      { status: 500 }
    )
  }
}
