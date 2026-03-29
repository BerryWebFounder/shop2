'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { useCart } from '@/hooks/useCart'
import { formatPrice } from '@/lib/utils'
import type { ProductListItem } from '@/types'

type ShopProduct = ProductListItem & { primary_image_url?: string | null }

export function ProductCard({ product, index = 0 }: { product: ShopProduct; index?: number }) {
  const { addItem, isInCart } = useCart()
  const [added, setAdded]     = useState(false)
  const inCart = isInCart(product.id)

  const effectivePrice = product.sale_price ?? product.price
  const discountRate   = product.sale_price
    ? Math.round((1 - product.sale_price / product.price) * 100)
    : null

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    addItem({
      id:          product.id,
      serial_no:   product.serial_no,
      name:        product.name,
      price:       product.price,
      sale_price:  product.sale_price ?? null,
      image_url:   product.primary_image_url ?? null,
      stock:       product.stock,
      cat1_name:   product.cat1_name ?? null,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 1800)
  }

  const isSoldOut = product.status === 'soldout'

  return (
    <Link
      href={`/shop/products/${product.id}`}
      className="group block shop-animate-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* 이미지 */}
      <div
        className="relative overflow-hidden rounded-2xl mb-3"
        style={{ aspectRatio: '3/4', background: 'var(--shop-bg2)' }}
      >
        {product.primary_image_url ? (
          <Image
            src={product.primary_image_url}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-4xl" style={{ color: 'var(--shop-border)' }}>
            📷
          </div>
        )}

        {/* 뱃지 */}
        <div className="absolute top-3 left-3 flex flex-col gap-1">
          {discountRate && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'var(--shop-accent)', color: 'white' }}>
              -{discountRate}%
            </span>
          )}
          {isSoldOut && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'var(--shop-ink)', color: 'white' }}>
              품절
            </span>
          )}
        </div>

        {/* 장바구니 버튼 (hover) */}
        {!isSoldOut && (
          <button
            onClick={handleAddToCart}
            className="absolute bottom-3 left-3 right-3 py-2.5 rounded-xl text-sm font-medium
              transition-all duration-300 opacity-0 translate-y-2
              group-hover:opacity-100 group-hover:translate-y-0"
            style={{
              background: added || inCart ? 'var(--shop-success)' : 'var(--shop-ink)',
              color: 'white',
            }}
          >
            {added ? '✓ 추가됨' : inCart ? '장바구니에 있음' : '장바구니 담기'}
          </button>
        )}
      </div>

      {/* 정보 */}
      <div>
        {product.cat1_name && (
          <p className="text-[11px] font-medium uppercase tracking-wider mb-1"
            style={{ color: 'var(--shop-ink3)' }}>
            {product.cat1_name}
          </p>
        )}
        <h3 className="text-sm font-medium mb-1.5 line-clamp-2 leading-snug"
          style={{ color: 'var(--shop-ink)' }}>
          {product.name}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: 'var(--shop-ink)' }}>
            {formatPrice(effectivePrice)}
          </span>
          {product.sale_price && (
            <span className="text-xs line-through" style={{ color: 'var(--shop-ink3)' }}>
              {formatPrice(product.price)}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
