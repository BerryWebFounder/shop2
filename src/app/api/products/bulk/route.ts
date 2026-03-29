import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// ── CSV 다운로드 (템플릿) ─────────────────────────────────────────
export async function GET() {
  const headers = [
    'name', 'summary', 'price', 'sale_price', 'stock',
    'cat1_name', 'cat2_name', 'status', 'description',
  ]

  const example = [
    '봄 기본 티셔츠', '가볍고 편안한 데일리 티셔츠', '29000', '23000', '100',
    '상의', '반팔티', 'sale', '상품 상세 내용',
  ]

  const csv = [headers.join(','), example.join(',')].join('\n')
  const bom = '\uFEFF'  // UTF-8 BOM (Excel 한글 깨짐 방지)

  return new NextResponse(bom + csv, {
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="product_upload_template.csv"',
    },
  })
}

// ── CSV 일괄 등록 ─────────────────────────────────────────────────
const productRowSchema = z.object({
  name:        z.string().min(1),
  summary:     z.string().optional().default(''),
  price:       z.coerce.number().int().min(0),
  sale_price:  z.coerce.number().int().min(0).nullable().optional(),
  stock:       z.coerce.number().int().min(0).default(0),
  cat1_name:   z.string().optional().default(''),
  cat2_name:   z.string().optional().default(''),
  status:      z.enum(['sale','stop','soldout']).default('sale'),
  description: z.string().optional().default(''),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body     = await request.json()

    if (!Array.isArray(body.rows) || body.rows.length === 0) {
      return NextResponse.json({ error: '데이터가 없습니다' }, { status: 400 })
    }

    if (body.rows.length > 500) {
      return NextResponse.json({ error: '한 번에 최대 500개까지 등록 가능합니다' }, { status: 400 })
    }

    // 카테고리 조회 (이름 → ID 변환)
    const { data: categories } = await supabase
      .from('categories').select('id, name, parent_id, level')
    const catMap = new Map(categories?.map(c => [c.name, c]) ?? [])

    const results = { success: 0, failed: 0, errors: [] as string[] }
    const batchSize = 50

    for (let i = 0; i < body.rows.length; i += batchSize) {
      const batch = body.rows.slice(i, i + batchSize)
      const toInsert: Record<string, unknown>[] = []

      for (const [rowIdx, row] of batch.entries()) {
        const parsed = productRowSchema.safeParse(row)
        if (!parsed.success) {
          results.failed++
          results.errors.push(`Row ${i + rowIdx + 2}: ${parsed.error.errors[0].message}`)
          continue
        }

        const d = parsed.data
        let cat1Id: string | null = null
        let cat2Id: string | null = null

        if (d.cat1_name) {
          const cat1 = catMap.get(d.cat1_name)
          if (cat1) {
            cat1Id = cat1.id
            if (d.cat2_name) {
              const cat2 = catMap.get(d.cat2_name)
              if (cat2 && cat2.parent_id === cat1Id) cat2Id = cat2.id
            }
          }
        }

        toInsert.push({
          name:        d.name,
          summary:     d.summary || null,
          price:       d.price,
          sale_price:  d.sale_price || null,
          stock:       d.stock,
          cat1_id:     cat1Id,
          cat2_id:     cat2Id,
          status:      d.status,
          description: d.description || null,
        })
      }

      if (toInsert.length > 0) {
        const { error } = await supabase.from('products').insert(toInsert)
        if (error) {
          results.failed += toInsert.length
          results.errors.push(`배치 오류: ${error.message}`)
        } else {
          results.success += toInsert.length
        }
      }
    }

    return NextResponse.json({
      ...results,
      message: `${results.success}개 등록 완료, ${results.failed}개 실패`,
    }, { status: results.failed === 0 ? 201 : 207 })

  } catch (err) {
    console.error('[POST /api/products/bulk]', err)
    return NextResponse.json({ error: '대량 업로드에 실패했습니다' }, { status: 500 })
  }
}
