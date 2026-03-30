'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useCart } from '@/hooks/useCart'
import { formatPrice } from '@/lib/utils'

export default function CartPage() {
  const { items, total, count, updateItem, removeItem, clearCart } = useCart()
  const shippingFee   = total >= 50000 || total === 0 ? 0 : 3000
  const finalTotal    = total + shippingFee

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-6"
        style={{ minHeight: '60vh' }}>
        <div className="text-6xl mb-6">🛍️</div>
        <h2 className="text-2xl mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--shop-ink)' }}>
          장바구니가 비었습니다
        </h2>
        <p className="text-sm mb-8" style={{ color: 'var(--shop-ink3)' }}>마음에 드는 상품을 담아보세요</p>
        <Link
          href="/shop/products"
          className="px-8 py-3.5 rounded-full text-sm font-semibold transition-all hover:opacity-90"
          style={{ background: 'var(--shop-ink)', color: 'white' }}
        >
          쇼핑 계속하기
        </Link>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 'var(--shop-max-w)', margin: '0 auto' }} className="px-4 sm:px-6 md:px-8 py-8 md:py-10">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl" style={{ fontFamily: 'var(--font-display)', color: 'var(--shop-ink)' }}>
          장바구니 <span className="text-xl" style={{ color: 'var(--shop-ink3)' }}>({count})</span>
        </h1>
        <button
          onClick={() => clearCart()}
          className="text-xs transition-colors"
          style={{ color: 'var(--shop-ink3)' }}
        >
          전체 삭제
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* 상품 목록 */}
        <div className="lg:col-span-2 space-y-4">
          {items.map(item => {
            const price = item.sale_price ?? item.price
            return (
              <div
                key={item.id}
                className="flex gap-4 p-4 rounded-2xl shop-animate-up"
                style={{ background: 'var(--shop-bg2)' }}
              >
                {/* 이미지 */}
                <Link href={`/shop/products/${item.id}`} className="flex-shrink-0">
                  <div
                    className="relative rounded-xl overflow-hidden"
                    style={{ width: 96, height: 120, background: 'var(--shop-bg3)' }}
                  >
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="100px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl" style={{ color: 'var(--shop-border)' }}>📷</div>
                    )}
                  </div>
                </Link>

                {/* 정보 */}
                <div className="flex-1 min-w-0">
                  {item.cat1_name && (
                    <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'var(--shop-ink3)' }}>
                      {item.cat1_name}
                    </p>
                  )}
                  <Link href={`/shop/products/${item.id}`}>
                    <p className="text-sm font-medium mb-3 line-clamp-2 leading-snug hover:underline"
                      style={{ color: 'var(--shop-ink)' }}>
                      {item.name}
                    </p>
                  </Link>

                  {/* 가격 */}
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-sm font-semibold" style={{ color: 'var(--shop-ink)' }}>
                      {formatPrice(price)}
                    </span>
                    {item.sale_price && (
                      <span className="text-xs line-through" style={{ color: 'var(--shop-ink3)' }}>
                        {formatPrice(item.price)}
                      </span>
                    )}
                  </div>

                  {/* 수량 + 삭제 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center rounded-lg overflow-hidden" style={{ border: '1.5px solid var(--shop-border)' }}>
                      <button
                        onClick={() => updateItem(item.id, item.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center text-base"
                        style={{ color: 'var(--shop-ink2)' }}
                      >−</button>
                      <span className="w-10 text-center text-sm" style={{ color: 'var(--shop-ink)' }}>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateItem(item.id, item.quantity + 1)}
                        disabled={item.quantity >= item.stock}
                        className="w-8 h-8 flex items-center justify-center text-base disabled:opacity-30"
                        style={{ color: 'var(--shop-ink2)' }}
                      >+</button>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold" style={{ color: 'var(--shop-ink)' }}>
                        {formatPrice(price * item.quantity)}
                      </span>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-sm w-7 h-7 flex items-center justify-center rounded-full transition-colors"
                        style={{ color: 'var(--shop-ink3)', background: 'var(--shop-bg3)' }}
                      >✕</button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* 주문 요약 */}
        <div className="lg:col-span-1">
          <div
            className="rounded-2xl p-6 sticky top-24"
            style={{ background: 'var(--shop-bg2)' }}
          >
            <h2 className="text-lg font-semibold mb-6" style={{ color: 'var(--shop-ink)', fontFamily: 'var(--font-display)' }}>
              주문 요약
            </h2>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm" style={{ color: 'var(--shop-ink2)' }}>
                <span>상품 금액</span>
                <span>{formatPrice(total)}</span>
              </div>
              <div className="flex justify-between text-sm" style={{ color: 'var(--shop-ink2)' }}>
                <span>배송비</span>
                <span>
                  {shippingFee === 0
                    ? <span style={{ color: 'var(--shop-success)' }}>무료</span>
                    : formatPrice(shippingFee)
                  }
                </span>
              </div>
              {shippingFee > 0 && (
                <p className="text-[11px]" style={{ color: 'var(--shop-ink3)' }}>
                  {formatPrice(50000 - total)} 더 담으면 무료 배송
                </p>
              )}
            </div>

            <div
              className="flex justify-between font-semibold pt-4 mb-6"
              style={{ borderTop: '1.5px solid var(--shop-border)', color: 'var(--shop-ink)' }}
            >
              <span>총 결제금액</span>
              <span className="text-lg">{formatPrice(finalTotal)}</span>
            </div>

            <Link
              href="/shop/checkout"
              className="block w-full py-4 rounded-2xl text-sm font-semibold text-center transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: 'var(--shop-ink)', color: 'white' }}
            >
              주문하기
            </Link>
            <Link
              href="/shop/products"
              className="block w-full py-3 rounded-2xl text-sm text-center mt-3 transition-colors"
              style={{ color: 'var(--shop-ink2)' }}
            >
              쇼핑 계속하기
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
