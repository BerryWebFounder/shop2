import { ImageResponse } from 'next/og'
import { createClient }  from '@supabase/supabase-js'

export const runtime     = 'edge'
export const alt         = '상품 이미지'
export const size        = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function ProductOGImage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // edge runtime에서는 cookies() 사용 불가 — anon key로 직접 조회
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const [{ data: product }, { data: images }, { data: settings }] = await Promise.all([
    supabase.from('products').select('name, price, sale_price').eq('id', id).single(),
    supabase.from('product_images').select('public_url').eq('product_id', id).eq('is_primary', true).single(),
    supabase.from('admin_settings').select('store_name').single(),
  ])

  const storeName   = settings?.store_name ?? '쇼핑몰'
  const productName = product?.name ?? '상품'
  const price       = product?.sale_price ?? product?.price ?? 0
  const priceStr    = new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(price)
  const imageUrl    = images?.public_url ?? null

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%',
        background: '#FAFAF8',
        display: 'flex',
        fontFamily: 'serif',
      }}>
        <div style={{
          width: '42%', height: '100%',
          background: '#F2F1EE',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}>
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={productName}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ fontSize: 80, color: '#E2E1DC' }}>📷</div>
          )}
        </div>
        <div style={{
          flex: 1, padding: '48px 56px',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 14, color: '#9C9B96', letterSpacing: '3px', marginBottom: 16 }}>
              {storeName.toUpperCase()}
            </div>
            <div style={{
              fontSize: productName.length > 20 ? 42 : 52,
              fontWeight: 700, color: '#1A1A18',
              lineHeight: 1.2, letterSpacing: '-1px',
            }}>
              {productName}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 36, fontWeight: 700, color: '#1A1A18', marginBottom: 8 }}>
              {priceStr}
            </div>
            {product?.sale_price && product.price > product.sale_price && (
              <div style={{ fontSize: 20, color: '#C4503A' }}>
                {Math.round((1 - product.sale_price / product.price) * 100)}% 할인
              </div>
            )}
            <div style={{ width: 48, height: 3, background: '#C4503A', marginTop: 24, borderRadius: 2 }} />
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
