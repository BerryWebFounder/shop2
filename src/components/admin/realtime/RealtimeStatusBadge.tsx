'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

type Status = 'connecting' | 'connected' | 'disconnected' | 'error'

export function RealtimeStatusBadge() {
  const [status, setStatus] = useState<Status>('connecting')

  useEffect(() => {
    const supabase = createClient()

    // 더미 채널로 연결 상태 확인
    const probe = supabase
      .channel('_realtime_probe')
      .on('system', {}, (payload: Record<string, unknown>) => {
        if (payload.extension === 'postgres_changes') setStatus('connected')
      })
      .subscribe(state => {
        if (state === 'SUBSCRIBED')   setStatus('connected')
        if (state === 'CLOSED')       setStatus('disconnected')
        if (state === 'CHANNEL_ERROR') setStatus('error')
        if (state === 'TIMED_OUT')     setStatus('error')
      })

    return () => { supabase.removeChannel(probe) }
  }, [])

  const configs: Record<Status, { label: string; dotClass: string; textClass: string }> = {
    connecting:   { label: '연결 중',   dotClass: 'bg-yellow-400 animate-pulse', textClass: 'text-yellow-400' },
    connected:    { label: '실시간',    dotClass: 'bg-green-400',                textClass: 'text-green-400'  },
    disconnected: { label: '연결 끊김', dotClass: 'bg-[var(--text-3)]',                   textClass: 'text-ink-3'      },
    error:        { label: '오류',      dotClass: 'bg-red-400',                 textClass: 'text-red-400'    },
  }

  const cfg = configs[status]

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-bg-3 border border-border">
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', cfg.dotClass)} />
      <span className={cn('text-[10px] font-medium', cfg.textClass)}>{cfg.label}</span>
    </div>
  )
}
