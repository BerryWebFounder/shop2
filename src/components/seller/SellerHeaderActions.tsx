'use client'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  storeSlug?: string | null
}

export function SellerHeaderActions({ storeSlug }: Props) {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/shop/auth/login')
    router.refresh()
  }

  return (
    <div className="flex items-center gap-2">
      {storeSlug && (
        <a href={`/stores/${storeSlug}`} target="_blank" rel="noreferrer"
          className="text-xs text-indigo-600 hover:text-indigo-800 hidden sm:block">
          내 상점 →
        </a>
      )}
      <button onClick={handleLogout}
        className="text-xs px-3 py-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors">
        로그아웃
      </button>
    </div>
  )
}
