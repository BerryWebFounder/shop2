// POST /api/products/upload-image
// multipart/form-data: file, product_id, sort_order, is_primary
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const form        = await req.formData()
    const file        = form.get('file') as File | null
    const product_id  = form.get('product_id') as string
    const sort_order  = parseInt(form.get('sort_order') as string ?? '0')
    const is_primary     = form.get('is_primary') === 'true'

    if (!file || !product_id) {
      return NextResponse.json({ error: '파일 또는 product_id 누락' }, { status: 400 })
    }

    const svc  = createServiceClient()
    const ext  = file.name.split('.').pop()
    const path = `products/${product_id}/${Date.now()}_${sort_order}.${ext}`

    const bytes  = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const { error: upErr } = await svc.storage
      .from('product-images')
      .upload(path, buffer, { contentType: file.type, upsert: true })

    if (upErr) throw upErr

    const { data: pub } = svc.storage.from('product-images').getPublicUrl(path)

    const { data: img, error: dbErr } = await svc.from('product_images').insert({
      product_id,
      storage_path: path,
      public_url:   pub.publicUrl,
      sort_order,
      is_primary,
    }).select().single()

    if (dbErr) throw dbErr

    return NextResponse.json({ data: img })
  } catch (err) {
    console.error('[upload-image]', err)
    return NextResponse.json({ error: '이미지 업로드 실패' }, { status: 500 })
  }
}
