import { redirect }       from 'next/navigation'
import { createClient }   from '@/lib/supabase/server'
import { Sidebar }        from '@/components/layout/Sidebar'
import { AdminProviders } from '@/components/layout/AdminProviders'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: settings } = await supabase
    .from('admin_settings')
    .select('store_name')
    .single()

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar storeName={settings?.store_name ?? '내 쇼핑몰'} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <AdminProviders>
          {children}
        </AdminProviders>
      </main>
    </div>
  )
}
