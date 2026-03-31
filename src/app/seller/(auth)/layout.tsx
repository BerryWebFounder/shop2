// 판매자 신청 경로: 로그인 여부만 확인, role 체크 없음
// 누구든 신청 가능
export default function SellerAuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
