import Link from 'next/link'

export default function ShopNotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-6 text-center">
      <p
        className="text-8xl font-bold mb-4 leading-none"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--shop-bg2)', WebkitTextStroke: '2px var(--shop-border)' }}
      >
        404
      </p>
      <h2 className="text-2xl mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--shop-ink)' }}>
        페이지를 찾을 수 없습니다
      </h2>
      <p className="text-sm mb-8" style={{ color: 'var(--shop-ink3)' }}>
        요청하신 페이지가 존재하지 않거나 이동되었습니다
      </p>
      <Link
        href="/shop"
        className="px-8 py-3.5 rounded-full text-sm font-semibold transition-all hover:opacity-90"
        style={{ background: 'var(--shop-ink)', color: 'white' }}
      >
        홈으로 돌아가기
      </Link>
    </div>
  )
}
