// ================================================================
// src/app/admin/layout.tsx
// role 확인을 서버 컴포넌트에서 처리 (Edge Runtime 우회)
// ================================================================
import { redirect }       from 'next/navigation'
import { createClient }   from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { Sidebar }        from '@/components/layout/Sidebar'
import { AdminProviders } from '@/components/layout/AdminProviders'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  // 1. 로그인 확인
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 2. role 확인 — service role key로 RLS 우회
  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { data: profile } = await svc
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/unauthorized')
  }

  // 3. 소호몰 이름 조회
  const { data: settings } = await supabase
    .from('admin_settings')
    .select('store_name')
    .single()

  return (
    <div className="flex h-screen overflow-hidden relative">
      <Sidebar storeName={settings?.store_name ?? '내 쇼핑몰'} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <AdminProviders>
          {children}
        </AdminProviders>
      </main>
    </div>
  )
}
