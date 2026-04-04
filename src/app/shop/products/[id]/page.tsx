// src/app/shop/products/[id]/page.tsx 전체 교체용
// — generateMetadata + JSON-LD 구조화 데이터 완전 통합

import { notFound }       from 'next/navigation'
import type { Metadata }  from 'next'
import { createClient }   from '@/lib/supabase/server'
import { ProductDetail }  from '@/components/shop/product/ProductDetail'
import { ProductCard }    from '@/components/shop/product/ProductCard'
import { ReviewSection }  from '@/components/shop/review/ReviewSection'
import {
  buildProductMetadata,
  productJsonLd,
  breadcrumbJsonLd,
  siteConfig,
} from '@/lib/seo'

interface PageProps { params: Promise<{ id: string }> }

// ── 데이터 조회 ──────────────────────────────────────────────────
async function getProduct(id: string) {
  const supabase = await createClient()
  const [{ data: product }, { data: images }, { data: ratingSummary }] = await Promise.all([
    supabase.from('products').select(`
      *, cat1:categories!cat1_id(name), cat2:categories!cat2_id(name), cat3:categories!cat3_id(name)
    `).eq('id', id).single(),
    supabase.from('product_images').select('*').eq('product_id', id).order('sort_order'),
    supabase.from('product_rating_summary').select('*').eq('product_id', id).single(),
  ])
  return { product, images: images ?? [], ratingSummary }
}

async function getRelated(catId: string | null, currentId: string) {
  if (!catId) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('product_list_view').select('*')
    .eq('cat1_id', catId).eq('status', 'sale').neq('id', currentId).limit(4)
  return data ?? []
}

// ── 동적 메타데이터 ──────────────────────────────────────────────
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const { product, images } = await getProduct(id)
  if (!product) return { title: '상품 없음' }

  return buildProductMetadata({
    id,
    name:         product.name,
    description:  product.description ?? product.summary,
    price:        product.price,
    salePrice:    product.sale_price,
    imageUrl:     images[0]?.public_url ?? null,
    categoryName: (product.cat1 as { name?: string } | null)?.name ?? null,
  })
}

// ── 정적 경로 사전 생성 (ISR) ────────────────────────────────────
// 동적 렌더링 — 상품이 없을 때 빌드 오류 방지
export const dynamic = 'force-dynamic'

// ── 페이지 컴포넌트 ──────────────────────────────────────────────
export default async function ProductDetailPage({ params }: PageProps) {
  const { id } = await params
  const { product, images, ratingSummary } = await getProduct(id)

  if (!product || product.status === 'stop') notFound()

  const cat1 = (product.cat1 as { name?: string } | null)?.name
  const cat2 = (product.cat2 as { name?: string } | null)?.name

  const related = await getRelated(product.cat1_id, id)

  // 브레드크럼 구조
  const breadcrumbs = [
    { name: '홈',      url: '/shop' },
    { name: '전체 상품', url: '/shop/products' },
    ...(cat1 ? [{ name: cat1, url: `/shop/products?cat=${encodeURIComponent(cat1)}` }] : []),
    { name: product.name, url: `/shop/products/${id}` },
  ]

  return (
    <div>
      {/* ── 상품 JSON-LD ─────────────────────────────────────── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productJsonLd({
            id,
            name:        product.name,
            description: product.description ?? product.summary,
            price:       product.price,
            salePrice:   product.sale_price,
            imageUrl:    images[0]?.public_url ?? null,
            rating:      ratingSummary?.avg_rating ?? null,
            reviewCount: ratingSummary?.review_count ?? 0,
          })),
        }}
      />

      {/* ── 브레드크럼 JSON-LD ───────────────────────────────── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(breadcrumbs)) }}
      />

      {/* ── 상품 상세 컴포넌트 ───────────────────────────────── */}
      <ProductDetail product={product} images={images} />

      {/* ── 리뷰 섹션 ───────────────────────────────────────── */}
      <div style={{ maxWidth: 'var(--shop-max-w)', margin: '0 auto' }} className="px-6 md:px-8">
        <ReviewSection productId={id} />
      </div>

      {/* ── 연관 상품 ───────────────────────────────────────── */}
      {related.length > 0 && (
        <section className="px-4 sm:px-6 md:px-8 pb-16" style={{ maxWidth: 'var(--shop-max-w)', margin: '0 auto' }}>
          <h2 className="text-xl sm:text-2xl mb-6" style={{ fontFamily: 'var(--font-display)', color: 'var(--shop-ink)' }}>
            연관 상품
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {related.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        </section>
      )}
    </div>
  )
}
