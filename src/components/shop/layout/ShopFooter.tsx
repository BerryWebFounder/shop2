import Link from 'next/link'

export function ShopFooter({ storeName }: { storeName: string }) {
  return (
    <footer style={{ background: 'var(--shop-ink)', color: 'var(--shop-bg2)' }}>
      <div
        className="mx-auto px-8 py-16"
        style={{ maxWidth: 'var(--shop-max-w)' }}
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* 브랜드 */}
          <div className="md:col-span-2">
            <div
              className="text-2xl mb-4"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--shop-bg)' }}
            >
              {storeName}
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--shop-ink3)' }}>
              엄선된 상품과 합리적인 가격으로<br />
              최고의 쇼핑 경험을 제공합니다.
            </p>
          </div>

          {/* 쇼핑 */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--shop-ink3)' }}>쇼핑</h4>
            <ul className="space-y-2 text-sm">
              {['전체 상품', '신상품', '베스트', '세일'].map(l => (
                <li key={l}>
                  <Link href="/shop/products" className="transition-colors hover:text-white" style={{ color: 'var(--shop-bg3)' }}>{l}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 고객센터 */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--shop-ink3)' }}>고객센터</h4>
            <ul className="space-y-2 text-sm">
              {['공지사항', '자주 묻는 질문', '교환/반품 안내', '개인정보처리방침'].map(l => (
                <li key={l}>
                  <Link href="#" className="transition-colors hover:text-white" style={{ color: 'var(--shop-bg3)' }}>{l}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div
          className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs"
          style={{ borderTop: '1px solid rgba(255,255,255,0.1)', color: 'var(--shop-ink3)' }}
        >
          <p>© {new Date().getFullYear()} {storeName}. All rights reserved.</p>
          <p>Powered by Vercel + Supabase</p>
        </div>
      </div>
    </footer>
  )
}
