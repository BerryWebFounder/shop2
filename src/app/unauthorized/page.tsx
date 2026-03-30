// ================================================================
// src/app/unauthorized/page.tsx
// 권한 없음 페이지 — 미들웨어 역할 체크 실패 시 리다이렉트
// ================================================================
import Link from 'next/link'

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="text-center max-w-sm px-6">
        <div className="text-5xl mb-6">🔒</div>
        <h1 className="text-2xl font-bold text-ink mb-3">접근 권한이 없습니다</h1>
        <p className="text-sm text-ink-2 mb-8 leading-relaxed">
          이 페이지에 접근할 권한이 없습니다.<br />
          권한이 필요하다면 관리자에게 문의해 주세요.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href="/shop"
            className="px-6 py-2.5 bg-accent hover:bg-accent-2 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            쇼핑몰로 이동
          </Link>
          <Link
            href="/login"
            className="px-6 py-2.5 border border-border text-ink-2 text-sm rounded-lg hover:bg-bg-3 transition-colors"
          >
            다른 계정으로 로그인
          </Link>
        </div>
      </div>
    </div>
  )
}
