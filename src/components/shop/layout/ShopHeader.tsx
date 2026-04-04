'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useCart } from '@/hooks/useCart'
import { createClient } from '@/lib/supabase/client'

interface ShopHeaderProps {
  storeName:   string
  isLoggedIn:  boolean
  userEmail?:  string
  categories?: { id: string; name: string }[]
}

export function ShopHeader({ storeName, isLoggedIn, userEmail, categories = [] }: ShopHeaderProps) {
  const { count }   = useCart()
  const pathname    = usePathname()
  const router      = useRouter()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchQ, setSearchQ]   = useState('')

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // 경로 변경 시 메뉴 닫기
  useEffect(() => { setMenuOpen(false) }, [pathname])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/shop')
    router.refresh()
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (searchQ.trim()) {
      router.push(`/shop/products?q=${encodeURIComponent(searchQ.trim())}`)
      setSearchQ('')
    }
  }

  const NAV = [
    { href: '/shop/products', label: '전체 상품' },
    ...categories.map(c => ({
      href:  `/shop/products?cat=${encodeURIComponent(c.name)}`,
      label: c.name,
    })),
  ]

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-40 transition-all duration-300"
        style={{
          background:  scrolled ? 'rgba(250,250,248,0.95)' : 'var(--shop-bg)',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          borderBottom: `1px solid ${scrolled ? 'var(--shop-border)' : 'transparent'}`,
          height: 'var(--shop-header)',
        }}
      >
        <div
          className="mx-auto flex items-center justify-between h-full px-4 md:px-8"
          style={{ maxWidth: 'var(--shop-max-w)' }}
        >
          {/* 로고 */}
          <Link
            href="/shop"
            className="font-display text-xl tracking-tight text-[var(--shop-ink)] hover:opacity-70 transition-opacity"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--shop-ink)' }}
          >
            {storeName}
          </Link>

          {/* 데스크톱 nav */}
          <nav className="hidden md:flex items-center gap-8">
            {NAV.map(n => (
              <Link
                key={n.href}
                href={n.href}
                className="text-sm transition-colors"
                style={{
                  color:      pathname.startsWith(n.href) ? 'var(--shop-accent)' : 'var(--shop-ink2)',
                  fontWeight: pathname.startsWith(n.href) ? 500 : 400,
                }}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          {/* 우측 액션 */}
          <div className="flex items-center gap-3">
            {/* 검색 */}
            <form onSubmit={handleSearch} className="hidden md:flex items-center">
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors"
                style={{ background: 'var(--shop-bg2)', border: '1px solid var(--shop-border)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--shop-ink3)' }}>
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  type="text"
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  placeholder="검색..."
                  className="bg-transparent outline-none w-28 text-sm"
                  style={{ color: 'var(--shop-ink)', fontFamily: 'var(--font-body)' }}
                />
              </div>
            </form>

            {/* 로그인/회원가입 */}
            {isLoggedIn ? (
              <div className="hidden md:flex items-center gap-2">
                <Link
                  href="/seller/apply"
                  className="text-xs px-3 py-1.5 rounded-full transition-colors"
                  style={{ color: 'var(--shop-ink2)' }}
                >
                  소호몰 신청
                </Link>
                <Link
                  href="/shop/orders"
                  className="text-xs px-3 py-1.5 rounded-full transition-colors"
                  style={{ color: 'var(--shop-ink2)', border: '1px solid var(--shop-border)' }}
                >
                  주문내역
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-xs px-3 py-1.5 rounded-full transition-colors"
                  style={{ color: 'var(--shop-ink3)' }}
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link
                  href="/seller/apply"
                  className="text-xs px-3 py-1.5 rounded-full transition-colors"
                  style={{ color: 'var(--shop-ink2)' }}
                >
                  소호몰 신청
                </Link>
                <Link
                  href="/shop/auth/login"
                  className="text-xs px-3 py-1.5 rounded-full transition-colors"
                  style={{ color: 'var(--shop-ink2)', border: '1px solid var(--shop-border)' }}
                >
                  로그인
                </Link>
                <Link
                  href="/shop/auth/register"
                  className="text-xs px-3 py-1.5 rounded-full font-medium transition-colors"
                  style={{ background: 'var(--shop-ink)', color: 'var(--shop-bg)' }}
                >
                  회원가입
                </Link>
              </div>
            )}

            {/* 장바구니 */}
            <Link
              href="/shop/cart"
              className="relative flex items-center justify-center w-9 h-9 rounded-full transition-colors"
              style={{ background: count > 0 ? 'var(--shop-accent)' : 'var(--shop-bg2)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: count > 0 ? 'white' : 'var(--shop-ink)' }}>
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
              {count > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center"
                  style={{ background: 'var(--shop-ink)', color: 'white' }}
                >
                  {count > 9 ? '9+' : count}
                </span>
              )}
            </Link>

            {/* 모바일 메뉴 */}
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="md:hidden w-9 h-9 flex flex-col items-center justify-center gap-1.5"
            >
              <span className="w-5 h-px transition-all" style={{ background: 'var(--shop-ink)', transform: menuOpen ? 'translateY(4px) rotate(45deg)' : 'none' }} />
              <span className="w-5 h-px transition-all" style={{ background: 'var(--shop-ink)', opacity: menuOpen ? 0 : 1 }} />
              <span className="w-5 h-px transition-all" style={{ background: 'var(--shop-ink)', transform: menuOpen ? 'translateY(-4px) rotate(-45deg)' : 'none' }} />
            </button>
          </div>
        </div>
      </header>

      {/* 모바일 메뉴 */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-30 md:hidden shop-animate-in"
          style={{ background: 'var(--shop-bg)', paddingTop: 'var(--shop-header)' }}
        >
          <div className="p-6 space-y-2">
            {/* 모바일 검색창 */}
            <form onSubmit={handleSearch} className="mb-4">
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-full" style={{ background: 'var(--shop-bg2)', border: '1px solid var(--shop-border)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--shop-ink3)', flexShrink: 0 }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="상품 검색..." className="bg-transparent outline-none flex-1 text-sm" style={{ color: 'var(--shop-ink)', fontFamily: 'var(--font-body)' }} />
              </div>
            </form>
            {NAV.map(n => (
              <Link
                key={n.href}
                href={n.href}
                className="block py-3 text-lg border-b"
                style={{ color: 'var(--shop-ink)', borderColor: 'var(--shop-border)', fontFamily: 'var(--font-display)' }}
              >
                {n.label}
              </Link>
            ))}
            <div className="pt-4 flex flex-col gap-2">
              <Link href="/seller/apply" className="block py-2 text-sm font-medium border-b" style={{ color: 'var(--shop-accent)', borderColor: 'var(--shop-border)' }}>
                🏪 소호몰 신청하기
              </Link>
              {isLoggedIn ? (
                <>
                  <Link href="/shop/orders" className="block py-2 text-sm" style={{ color: 'var(--shop-ink2)' }}>주문내역</Link>
                  <button onClick={handleLogout} className="block py-2 text-sm text-left" style={{ color: 'var(--shop-ink3)' }}>로그아웃</button>
                </>
              ) : (
                <>
                  <Link href="/shop/auth/login"    className="block py-2 text-sm" style={{ color: 'var(--shop-ink2)' }}>로그인</Link>
                  <Link href="/shop/auth/register"  className="block py-2 text-sm" style={{ color: 'var(--shop-ink2)' }}>회원가입</Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 헤더 높이 spacer */}
      <div style={{ height: 'var(--shop-header)' }} />
    </>
  )
}
