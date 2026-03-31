// ============================================================
// middleware.ts — 단순화 버전
//
// 미들웨어는 "로그인 여부"만 확인합니다.
// role 기반 분기는 각 layout에서 서버 컴포넌트로 처리합니다.
// (미들웨어 Edge Runtime에서 DB 조회 시 RLS 컨텍스트 문제 회피)
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

  // ── 비로그인 → /login으로 이동 ─────────────────────────────
  const protectedPaths = ['/seller', '/admin']
  const isProtected = protectedPaths.some(p => pathname.startsWith(p))

  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/login?next=' + pathname, request.url))
  }

  // ── role 기반 접근 제어는 각 layout 서버 컴포넌트에서 처리 ──
  // admin/layout.tsx → profiles.role 확인 후 /unauthorized 리다이렉트
  // seller/layout.tsx → profiles.role 확인 후 /seller/apply 리다이렉트

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
