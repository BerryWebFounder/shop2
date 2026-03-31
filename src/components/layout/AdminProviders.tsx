'use client'
import { NotificationProvider } from '@/hooks/useNotificationStore'
import { ToastNotifications }   from '@/components/admin/realtime/ToastNotifications'
import { createContext, useContext, useState } from 'react'

// 모바일 사이드바 토글 컨텍스트
const SidebarContext = createContext<{
  open: boolean
  toggle: () => void
  close: () => void
}>({ open: false, toggle: () => {}, close: () => {} })

export function useSidebar() { return useContext(SidebarContext) }

export function AdminProviders({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <SidebarContext.Provider value={{
      open,
      toggle: () => setOpen(v => !v),
      close:  () => setOpen(false),
    }}>
      <NotificationProvider>
        <ToastNotifications />
        {children}
      </NotificationProvider>
    </SidebarContext.Provider>
  )
}
