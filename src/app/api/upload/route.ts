import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient as createClient } from '@/lib/supabase/server'

const BUCKET       = 'product-images'
const MAX_SIZE_MB  = 5
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // 인증 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const formData  = await request.formData()
    const file      = formData.get('file') as File | null
    const productId = (formData.get('productId') as string) || 'temp'

    if (!file) {
      return NextResponse.json({ error: '파일이 없습니다' }, { status: 400 })
    }

    // 타입 검증
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: '지원하지 않는 파일 형식입니다. (JPG, PNG, WEBP, GIF)' },
        { status: 400 }
      )
    }

    // 크기 검증
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json(
        { error: `파일 크기는 ${MAX_SIZE_MB}MB 이하여야 합니다` },
        { status: 400 }
      )
    }

    // 파일명 생성: products/{productId}/{timestamp}-{random}.{ext}
    const ext       = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const timestamp = Date.now()
    const random    = Math.random().toString(36).slice(2, 8)
    const path      = `products/${productId}/${timestamp}-${random}.${ext}`

    // ArrayBuffer → Uint8Array 변환
    const arrayBuffer = await file.arrayBuffer()
    const uint8Array  = new Uint8Array(arrayBuffer)

    // Supabase Storage 업로드
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, uint8Array, {
        contentType:  file.type,
        cacheControl: '3600',
        upsert:       false,
      })

    if (uploadError) {
      console.error('[Upload] Storage error:', uploadError)
      throw uploadError
    }

    // 공개 URL 조회
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(path)

    return NextResponse.json(
      { path, publicUrl, message: '업로드 완료' },
      { status: 201 }
    )
  } catch (err) {
    console.error('[POST /api/upload]', err)
    return NextResponse.json(
      { error: '이미지 업로드에 실패했습니다' },
      { status: 500 }
    )
  }
}

// ── 이미지 삭제 ───────────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { path } = await request.json()
    if (!path || typeof path !== 'string') {
      return NextResponse.json({ error: '삭제할 경로가 없습니다' }, { status: 400 })
    }

    // products/ 경로만 삭제 허용 (보안)
    if (!path.startsWith('products/')) {
      return NextResponse.json({ error: '허용되지 않는 경로입니다' }, { status: 403 })
    }

    const { error } = await supabase.storage
      .from(BUCKET)
      .remove([path])

    if (error) throw error

    return NextResponse.json({ message: '삭제 완료' })
  } catch (err) {
    console.error('[DELETE /api/upload]', err)
    return NextResponse.json(
      { error: '이미지 삭제에 실패했습니다' },
      { status: 500 }
    )
  }
}
