// ============================================================
// middleware.ts (프로젝트 루트)
// 역할 기반 라우팅 & 접근 제어
// ============================================================

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response = NextResponse.next({ request: { headers: request.headers } })
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // ── 비로그인 보호 경로 ──────────────────────────────────────
  const protectedPaths = ['/seller', '/admin']
  const isProtected = protectedPaths.some(p => pathname.startsWith(p))

  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/login?next=' + pathname, request.url))
  }

  if (!user) return response

  // ── 사용자 역할 조회 (members 테이블) ───────────────────────
  const { data: profile } = await supabase
    .from('members')
    .select('role, seller_status')
    .eq('id', user.id)
    .single()

  const role         = profile?.role         || 'customer'
  const sellerStatus = profile?.seller_status

  // ── /admin 접근 제어 ────────────────────────────────────────
  if (pathname.startsWith('/admin')) {
    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
  }

  // ── /seller 접근 제어 ──────────────────────────────────────
  if (pathname.startsWith('/seller')) {
    if (pathname === '/seller/apply') return response

    if (role !== 'seller' && role !== 'admin') {
      if (sellerStatus === 'pending') {
        return NextResponse.redirect(new URL('/seller/apply/pending', request.url))
      }
      return NextResponse.redirect(new URL('/seller/apply', request.url))
    }

    if (role === 'seller' && sellerStatus !== 'approved') {
      return NextResponse.redirect(new URL('/seller/apply/pending', request.url))
    }
  }

  // ── 이미 로그인된 사용자의 로그인/회원가입 페이지 리다이렉트 ──
  if ((pathname === '/login' || pathname === '/signup') && user) {
    if (role === 'admin')  return NextResponse.redirect(new URL('/admin',  request.url))
    if (role === 'seller') return NextResponse.redirect(new URL('/seller', request.url))
    return NextResponse.redirect(new URL('/shop', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/seller/:path*',
    '/admin/:path*',
    '/login',
    '/signup',
    '/account/:path*',
  ],
}
