// ================================================================
// src/app/seller/apply/complete/page.tsx
// 판매자 신청 완료 페이지
// ================================================================
import Link from 'next/link'

export default function SellerApplyCompletePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">✅</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">신청이 완료되었습니다!</h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-8">
          소호몰 개설 신청을 받았습니다.<br />
          관리자 검토 후 승인 결과를 이메일로 안내드립니다.<br />
          <span className="text-gray-400">보통 1~2 영업일 내에 처리됩니다.</span>
        </p>

        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-8 text-left space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">다음 단계</p>
          {[
            { step: '1', text: '관리자가 신청 내용을 검토합니다' },
            { step: '2', text: '승인 시 이메일로 안내드립니다' },
            { step: '3', text: '승인 후 소호몰 설정 및 상품 등록이 가능합니다' },
          ].map(({ step, text }) => (
            <div key={step} className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {step}
              </span>
              <p className="text-sm text-gray-600">{text}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/shop"
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            쇼핑몰 둘러보기
          </Link>
          <Link
            href="/seller/apply/pending"
            className="px-6 py-2.5 border border-gray-200 text-gray-700 text-sm rounded-xl hover:bg-gray-50 transition-colors"
          >
            신청 현황 확인
          </Link>
        </div>
      </div>
    </div>
  )
}
