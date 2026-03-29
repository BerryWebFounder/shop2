'use client'
import { NotificationProvider } from '@/hooks/useNotificationStore'
import { ToastNotifications }   from '@/components/admin/realtime/ToastNotifications'

export function AdminProviders({ children }: { children: React.ReactNode }) {
  return (
    <NotificationProvider>
      <ToastNotifications />
      {children}
    </NotificationProvider>
  )
}
