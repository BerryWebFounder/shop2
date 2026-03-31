// ================================================================
// src/app/admin/layout.tsx
// ================================================================
import { redirect }       from 'next/navigation'
import { createClient }   from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { Sidebar }        from '@/components/layout/Sidebar'
import { AdminProviders } from '@/components/layout/AdminProviders'
import { MobileMenuButton } from '@/components/layout/MobileMenuButton'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { data: profile } = await svc
    .from('profiles').select('role').eq('id', user.id).single()

  if (profile?.role !== 'admin') redirect('/unauthorized')

  const { data: settings } = await supabase
    .from('admin_settings').select('store_name').single()

  return (
    <AdminProviders>
      <div className="flex h-screen overflow-hidden relative">
        <Sidebar storeName={settings?.store_name ?? '내 쇼핑몰'} />
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* 모바일 전용 상단 바 */}
          <MobileMenuButton storeName={settings?.store_name ?? '내 쇼핑몰'} />
          {children}
        </main>
      </div>
    </AdminProviders>
  )
}
