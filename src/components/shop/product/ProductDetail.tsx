'use client'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useCart } from '@/hooks/useCart'
import { formatPrice } from '@/lib/utils'

interface ProductImage { id: string; public_url: string; sort_order: number; is_primary: boolean }
interface Product {
  id: string; serial_no: string; name: string; summary: string | null
  description: string | null; price: number; sale_price: number | null
  stock: number; status: string; cat1?: { name: string } | null
  cat2?: { name: string } | null; cat3?: { name: string } | null
}

export function ProductDetail({ product, images }: { product: Product; images: ProductImage[] }) {
  const { addItem, isInCart, getItem } = useCart()
  const [activeImg, setActiveImg] = useState(0)
  const [qty, setQty]             = useState(1)
  const [added, setAdded]         = useState(false)

  const inCart     = isInCart(product.id)
  const cartItem   = getItem(product.id)
  const isSoldOut  = product.status === 'soldout'
  const effectivePrice = product.sale_price ?? product.price
  const discountRate   = product.sale_price
    ? Math.round((1 - product.sale_price / product.price) * 100)
    : null
  const primaryImg = images[activeImg]?.public_url ?? null

  function handleAddToCart() {
    if (isSoldOut) return
    addItem({
      id: product.id, serial_no: product.serial_no, name: product.name,
      price: product.price, sale_price: product.sale_price ?? null,
      image_url: images[0]?.public_url ?? null,
      stock: product.stock, cat1_name: product.cat1?.name ?? null,
    }, qty)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div style={{ maxWidth: 'var(--shop-max-w)', margin: '0 auto' }} className="px-4 sm:px-6 md:px-8 py-8 md:py-10">
      {/* 브레드크럼 */}
      <nav className="flex items-center gap-2 text-xs mb-6 overflow-x-auto whitespace-nowrap" style={{ color: 'var(--shop-ink3)' }}>
        <Link href="/shop" className="hover:underline">홈</Link>
        <span>/</span>
        <Link href="/shop/products" className="hover:underline">상품</Link>
        {product.cat1 && <><span>/</span><span>{product.cat1.name}</span></>}
        <span>/</span>
        <span style={{ color: 'var(--shop-ink2)' }}>{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 lg:gap-16">
        {/* 이미지 영역 */}
        <div>
          {/* 메인 이미지 */}
          <div
            className="relative rounded-2xl overflow-hidden mb-3"
            style={{ aspectRatio: '3/4', background: 'var(--shop-bg2)' }}
          >
            {primaryImg ? (
              <Image
                src={primaryImg}
                alt={product.name}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-6xl" style={{ color: 'var(--shop-border)' }}>📷</div>
            )}
            {discountRate && (
              <span className="absolute top-4 left-4 text-sm font-bold px-3 py-1 rounded-full"
                style={{ background: 'var(--shop-accent)', color: 'white' }}>
                -{discountRate}%
              </span>
            )}
          </div>

          {/* 썸네일 */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImg(i)}
                  className="relative flex-shrink-0 rounded-xl overflow-hidden transition-all"
                  style={{
                    width: 72, height: 90,
                    outline: i === activeImg ? `2px solid var(--shop-ink)` : '2px solid transparent',
                    outlineOffset: 2,
                  }}
                >
                  <Image src={img.public_url} alt="" fill className="object-cover" sizes="80px" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 정보 영역 */}
        <div className="flex flex-col">
          {/* 분류 */}
          {product.cat1 && (
            <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: 'var(--shop-ink3)' }}>
              {[product.cat1?.name, product.cat2?.name, product.cat3?.name].filter(Boolean).join(' / ')}
            </p>
          )}

          {/* 이름 */}
          <h1 className="text-3xl md:text-4xl mb-4 leading-tight"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--shop-ink)' }}>
            {product.name}
          </h1>

          {/* 가격 */}
          <div className="flex items-end gap-3 mb-6">
            <span className="text-3xl font-semibold" style={{ color: 'var(--shop-ink)' }}>
              {formatPrice(effectivePrice)}
            </span>
            {product.sale_price && (
              <span className="text-lg line-through mb-0.5" style={{ color: 'var(--shop-ink3)' }}>
                {formatPrice(product.price)}
              </span>
            )}
          </div>

          {product.summary && (
            <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--shop-ink2)' }}>
              {product.summary}
            </p>
          )}

          {/* 재고 */}
          <p className="text-xs mb-6" style={{ color: product.stock <= 5 ? 'var(--shop-accent)' : 'var(--shop-ink3)' }}>
            {isSoldOut ? '품절' : product.stock <= 5 ? `재고 ${product.stock}개 남음` : '재고 있음'}
          </p>

          {/* 수량 */}
          {!isSoldOut && (
            <div className="flex items-center gap-3 mb-6">
              <span className="text-sm" style={{ color: 'var(--shop-ink2)' }}>수량</span>
              <div className="flex items-center rounded-xl overflow-hidden" style={{ border: '1.5px solid var(--shop-border)' }}>
                <button
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                  className="w-10 h-10 flex items-center justify-center text-lg transition-colors hover:bg-bg-2"
                  style={{ color: 'var(--shop-ink2)' }}
                >
                  −
                </button>
                <span className="w-12 text-center text-sm font-medium" style={{ color: 'var(--shop-ink)' }}>
                  {qty}
                </span>
                <button
                  onClick={() => setQty(q => Math.min(product.stock, q + 1))}
                  className="w-10 h-10 flex items-center justify-center text-lg transition-colors hover:bg-bg-2"
                  style={{ color: 'var(--shop-ink2)' }}
                >
                  +
                </button>
              </div>
            </div>
          )}

          {/* 버튼 */}
          <div className="flex flex-col gap-3 mb-8">
            <button
              onClick={handleAddToCart}
              disabled={isSoldOut}
              className="w-full py-4 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
              style={{
                background: added ? 'var(--shop-success)' : isSoldOut ? 'var(--shop-bg3)' : 'var(--shop-ink)',
                color: isSoldOut ? 'var(--shop-ink3)' : 'white',
              }}
            >
              {isSoldOut ? '품절' : added ? '✓ 장바구니에 추가됨' : '장바구니 담기'}
            </button>
            {inCart && !added && (
              <Link
                href="/shop/cart"
                className="w-full py-4 rounded-2xl text-sm font-semibold text-center transition-all"
                style={{ border: '1.5px solid var(--shop-border)', color: 'var(--shop-ink)' }}
              >
                장바구니 보기 ({cartItem?.quantity}개)
              </Link>
            )}
          </div>

          {/* 배송 안내 */}
          <div className="space-y-2 pt-6" style={{ borderTop: '1px solid var(--shop-border)' }}>
            {[
              ['🚚', '5만원 이상 무료 배송'],
              ['🔄', '7일 이내 교환/반품 가능'],
              ['🔒', '안전한 결제 보장'],
            ].map(([icon, text]) => (
              <div key={text} className="flex items-center gap-2 text-xs" style={{ color: 'var(--shop-ink2)' }}>
                <span>{icon}</span><span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 상품 상세 */}
      {product.description && (
        <div className="mt-16 pt-12" style={{ borderTop: '1px solid var(--shop-border)' }}>
          <h2 className="text-2xl mb-8" style={{ fontFamily: 'var(--font-display)', color: 'var(--shop-ink)' }}>상품 상세</h2>
          <div
            className="prose max-w-none text-sm leading-relaxed"
            style={{ color: 'var(--shop-ink2)' }}
            dangerouslySetInnerHTML={{ __html: product.description }}
          />
        </div>
      )}
    </div>
  )
}
