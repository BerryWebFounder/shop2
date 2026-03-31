// ================================================================
// src/app/seller/apply/pending/page.tsx
// 판매자 신청 심사 대기 페이지
// ================================================================
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { SellerApplication } from '@/lib/types/v2'

export default function SellerApplyPendingPage() {
  const [app, setApp]       = useState<SellerApplication | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('seller_applications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      setApp(data)
      setLoading(false)
    })()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const statusMeta = {
    pending:  { icon: '⏳', title: '심사 중입니다', color: 'bg-amber-100 text-amber-700',  desc: '관리자가 신청 내용을 검토하고 있습니다.\n보통 1~2 영업일 내에 결과를 안내드립니다.' },
    approved: { icon: '🎉', title: '승인되었습니다!', color: 'bg-green-100 text-green-700', desc: '소호몰 개설이 승인되었습니다.\n지금 바로 소호몰을 설정하고 상품을 등록해 보세요.' },
    rejected: { icon: '😔', title: '승인이 거절되었습니다', color: 'bg-red-100 text-red-700', desc: '이번 신청은 승인되지 않았습니다.\n아래 사유를 확인하고 다시 신청해 주세요.' },
  }

  const status = app?.status ?? 'pending'
  const meta   = statusMeta[status]

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md w-full">
        {/* 상태 아이콘 */}
        <div className="text-5xl mb-5">{meta.icon}</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{meta.title}</h1>
        <p className="text-sm text-gray-500 leading-relaxed mb-8 whitespace-pre-line">{meta.desc}</p>

        {/* 신청 정보 카드 */}
        {app && (
          <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6 text-left space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">신청 정보</p>
            {[
              { label: '소호몰명',    value: app.store_name },
              { label: 'URL',        value: `/stores/${app.store_slug}` },
              { label: '카테고리',   value: app.store_category },
              { label: '신청일',     value: new Date(app.created_at).toLocaleDateString('ko-KR') },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="text-gray-400">{label}</span>
                <span className="text-gray-800 font-medium">{value}</span>
              </div>
            ))}
            {/* 상태 배지 */}
            <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-50">
              <span className="text-gray-400">심사 상태</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${meta.color}`}>
                {status === 'pending' ? '심사 중' : status === 'approved' ? '승인' : '거절'}
              </span>
            </div>
            {/* 거절 사유 */}
            {status === 'rejected' && app.admin_note && (
              <div className="pt-2 border-t border-gray-50">
                <p className="text-xs text-gray-400 mb-1">거절 사유</p>
                <p className="text-sm text-gray-700 bg-red-50 rounded-lg p-3">{app.admin_note}</p>
              </div>
            )}
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {status === 'approved' ? (
            <Link
              href="/seller"
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              소호몰 관리 시작하기 →
            </Link>
          ) : status === 'rejected' ? (
            <>
              <Link
                href="/seller/apply"
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                다시 신청하기
              </Link>
              <Link
                href="/shop"
                className="px-6 py-2.5 border border-gray-200 text-gray-700 text-sm rounded-xl hover:bg-gray-50 transition-colors"
              >
                쇼핑몰로 이동
              </Link>
            </>
          ) : (
            <Link
              href="/shop"
              className="px-6 py-2.5 border border-gray-200 text-gray-700 text-sm rounded-xl hover:bg-gray-50 transition-colors"
            >
              쇼핑몰 둘러보기
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
