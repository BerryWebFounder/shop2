'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { formatPrice } from '@/lib/utils'

interface RelatedProduct {
  id:        string
  name:      string
  price:     number
  sale_price: number | null
  primary_image_url?: string | null
}

export function RelatedProducts({ productId }: { productId: string }) {
  const [products, setProducts] = useState<RelatedProduct[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    fetch(`/api/products/${productId}/related`)
      .then(r => r.json())
      .then(json => {
        setProducts((json.data ?? []).map((d: { product: RelatedProduct }) => d.product))
        setLoading(false)
      })
  }, [productId])

  if (loading || products.length === 0) return null

  return (
    <section className="mt-12 pt-10" style={{ borderTop: '1px solid var(--shop-border)' }}>
      <h2 className="text-xl mb-6" style={{ fontFamily: 'var(--font-display)', color: 'var(--shop-ink)' }}>
        함께 구매하면 좋은 상품
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.map(p => {
          const price = p.sale_price ?? p.price
          return (
            <Link key={p.id} href={`/shop/products/${p.id}`}
              className="group block">
              <div className="relative rounded-2xl overflow-hidden mb-3 aspect-square"
                style={{ background: 'var(--shop-bg2)' }}>
                {p.primary_image_url ? (
                  <Image src={p.primary_image_url} alt={p.name} fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="25vw" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-3xl"
                    style={{ color: 'var(--shop-border)' }}>📷</div>
                )}
              </div>
              <p className="text-sm font-medium line-clamp-2 mb-1" style={{ color: 'var(--shop-ink)' }}>
                {p.name}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold" style={{ color: 'var(--shop-ink)' }}>
                  {formatPrice(price)}
                </span>
                {p.sale_price && (
                  <span className="text-xs line-through" style={{ color: 'var(--shop-ink3)' }}>
                    {formatPrice(p.price)}
                  </span>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
