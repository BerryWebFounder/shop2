import { redirect } from 'next/navigation'

// 미들웨어에서 처리하지만 fallback
export default function RootPage() {
  redirect('/login')
}
