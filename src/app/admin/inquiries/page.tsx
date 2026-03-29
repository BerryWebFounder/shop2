'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Topbar }       from '@/components/layout/Topbar'
import { PageHeader, Card, StatCard } from '@/components/ui/Card'
import { Table, Thead, Th, Tbody, Tr, Td, EmptyRow } from '@/components/ui/Table'
import { Badge }        from '@/components/ui/Badge'
import { Button }       from '@/components/ui/Button'
import { Select }       from '@/components/ui/Input'
import { SearchBar }    from '@/components/ui/SearchBar'
import { Pagination }   from '@/components/ui/Pagination'
import { useNotifications } from '@/hooks/useNotificationStore'
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications'
import { formatDateTime } from '@/lib/utils'
import {
  INQUIRY_CATEGORY_LABEL, INQUIRY_STATUS_LABEL, INQUIRY_STATUS_VARIANT,
  type InquiryStatus, type InquiryCategory, type InquiryStats,
} from '@/types/cs'

const LIMIT = 20

export default function AdminInquiriesPage() {
  const router  = useRouter()
  const [inquiries, setInquiries] = useState<unknown[]>([])
  const [total, setTotal]         = useState(0)
  const [page, setPage]           = useState(1)
  const [loading, setLoading]     = useState(true)
  const [q, setQ]                 = useState('')
  const [status, setStatus]       = useState('')
  const [category, setCategory]   = useState('')
  const [stats, setStats]         = useState<InquiryStats | null>(null)

  // 신규 문의 Realtime 알림
  const { addNotification } = useNotifications()
  useRealtimeNotifications({
    onNotification: n => {
      if (n.type === 'new_member') return  // 문의 알림만 필터
      addNotification(n)
    },
    enabled: true,
  })

  const fetchInquiries = useCallback(async () => {
    setLoading(true)
    const p = new URLSearchParams({ admin: 'true', page: String(page), q, ...(status && { status }), ...(category && { category }) })
    const res  = await fetch(`/api/inquiries?${p}`)
    const json = await res.json()
    setInquiries(json.data ?? [])
    setTotal(json.total ?? 0)
    setLoading(false)
  }, [page, q, status, category])

  const fetchStats = useCallback(async () => {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { data } = await supabase.rpc('inquiry_stats')
    if (data?.[0]) setStats(data[0])
  }, [])

  useEffect(() => { fetchInquiries() }, [fetchInquiries])
  useEffect(() => { fetchStats()     }, [fetchStats])

  return (
    <>
      <Topbar title="1:1 문의 관리" />
      <div className="flex-1 overflow-y-auto p-6 animate-page">
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
            <StatCard label="전체"     value={stats.total}       />
            <StatCard label="대기"     value={stats.pending}     changeType={stats.pending > 0 ? 'down' : 'neutral'} change={stats.pending > 0 ? '처리 필요' : undefined} />
            <StatCard label="처리 중"  value={stats.in_progress} />
            <StatCard label="답변 완료" value={stats.answered}   changeType="up" />
            <StatCard label="평균 응답" value={stats.avg_response_hours ? `${stats.avg_response_hours}h` : '-'} />
          </div>
        )}

        <PageHeader title="문의 목록" subtitle={`총 ${total}건`}>
          <SearchBar placeholder="제목, 작성자 검색..." onSearch={v => { setQ(v); setPage(1) }} />
          <Select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} className="w-32">
            <option value="">전체 상태</option>
            {(Object.entries(INQUIRY_STATUS_LABEL) as [InquiryStatus, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
          <Select value={category} onChange={e => { setCategory(e.target.value); setPage(1) }} className="w-32">
            <option value="">전체 유형</option>
            {(Object.entries(INQUIRY_CATEGORY_LABEL) as [InquiryCategory, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </PageHeader>

        <Card noPadding>
          <Table>
            <Thead>
              <tr>
                <Th>유형</Th><Th>제목</Th><Th>작성자</Th>
                <Th>상태</Th><Th>접수일</Th><Th>답변일</Th>
              </tr>
            </Thead>
            <Tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <Tr key={i}>{Array.from({ length: 6 }).map((_, j) => (
                      <Td key={j}><div className="h-4 bg-bg-3 rounded animate-pulse w-20" /></Td>
                    ))}</Tr>
                  ))
                : inquiries.length === 0
                  ? <EmptyRow colSpan={6} message="문의가 없습니다" />
                  : (inquiries as Array<{
                      id: string; category: InquiryCategory; title: string
                      author_name: string; author_email: string; status: InquiryStatus
                      created_at: string; admin_replied_at: string | null
                    }>).map(q => (
                    <Tr key={q.id} onClick={() => router.push(`/admin/inquiries/${q.id}`)}>
                      <Td>
                        <span className="text-[11px] px-2 py-0.5 rounded-full"
                          style={{ background: 'var(--bg-3)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
                          {INQUIRY_CATEGORY_LABEL[q.category]}
                        </span>
                      </Td>
                      <Td>
                        <span className="text-sm font-medium line-clamp-1 max-w-[200px]">{q.title}</span>
                      </Td>
                      <Td>
                        <div className="text-sm">{q.author_name}</div>
                        <div className="text-[11px] text-ink-3">{q.author_email}</div>
                      </Td>
                      <Td><Badge variant={INQUIRY_STATUS_VARIANT[q.status]}>{INQUIRY_STATUS_LABEL[q.status]}</Badge></Td>
                      <Td><span className="font-mono text-xs text-ink-3">{formatDateTime(q.created_at)}</span></Td>
                      <Td>
                        {q.admin_replied_at
                          ? <span className="font-mono text-xs text-green-400">{formatDateTime(q.admin_replied_at)}</span>
                          : <span className="text-xs text-ink-3">-</span>}
                      </Td>
                    </Tr>
                  ))
              }
            </Tbody>
          </Table>
          <Pagination page={page} total={total} limit={LIMIT} onChange={setPage} />
        </Card>
      </div>
    </>
  )
}
