// ============================================================
// middleware.ts
// 역할 기반 라우팅 & 접근 제어
//
// profiles 조회는 service role key를 쓰는 별도 클라이언트로 처리.
// anon key 클라이언트는 RLS에 막혀 조회가 실패할 수 있기 때문.
// ============================================================

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  let response = NextResponse.next({ request: { headers: request.headers } })

  // ── 세션 확인용 (anon key + 쿠키) ───────────────────────────
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

  // ── profiles 조회: service role key로 RLS 우회 ───────────────
  // anon key 클라이언트는 RLS 정책에 따라 조회가 막힐 수 있음
  const serviceClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: profile } = await serviceClient
    .from('profiles')
    .select('role, seller_status')
    .eq('id', user.id)
    .single()

  const role         = profile?.role         ?? 'customer'
  const sellerStatus = profile?.seller_status ?? null

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

  // ── 이미 로그인된 사용자의 /login 접근 → role에 따라 분기 ──
  if ((pathname === '/login' || pathname === '/signup') && user) {
    if (role === 'admin')  return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    if (role === 'seller') return NextResponse.redirect(new URL('/seller',           request.url))
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
