'use client'
import { useState, useEffect } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { PageHeader, Card } from '@/components/ui/Card'
import { Table, Thead, Th, Tbody, Tr, Td, EmptyRow } from '@/components/ui/Table'
import { formatPrice, formatDate } from '@/lib/utils'

interface Settlement {
  id: string
  store_id: string
  period_from: string
  period_to: string
  gross_amount: number
  commission_rate: number
  commission_amount: number
  net_amount: number
  status: string
  created_at: string
  store?: { store_name: string }
}

const STATUS: Record<string, { label: string; color: string }> = {
  pending:   { label: '정산대기', color: 'text-yellow-600 bg-yellow-50' },
  confirmed: { label: '정산확정', color: 'text-blue-600 bg-blue-50' },
  paid:      { label: '지급완료', color: 'text-green-600 bg-green-50' },
}

export default function AdminSettlementsPage() {
  const [data, setData] = useState<Settlement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/settlements')
      .then(r => r.json()).then(j => { setData(j.data ?? []); setLoading(false) })
  }, [])

  return (
    <>
      <Topbar title="정산 관리" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 animate-page">
        <PageHeader title="정산 관리" subtitle="상점별 정산 내역" />
        <Card>
          <Table>
            <Thead>
              <Tr>
                <Th>상점</Th><Th>기간</Th><Th>매출</Th><Th>수수료</Th><Th>정산액</Th><Th>상태</Th><Th>생성일</Th>
              </Tr>
            </Thead>
            <Tbody>
              {loading ? (
                <Tr><Td colSpan={7}><div className="text-center py-8 text-ink-3 text-sm">로딩 중...</div></Td></Tr>
              ) : data.length === 0 ? (
                <EmptyRow colSpan={7} message="정산 내역이 없습니다" />
              ) : data.map(s => {
                const st = STATUS[s.status] ?? { label: s.status, color: '' }
                return (
                  <Tr key={s.id}>
                    <Td className="font-medium">{s.store?.store_name ?? '-'}</Td>
                    <Td className="text-xs">{s.period_from?.slice(0,10)} ~ {s.period_to?.slice(0,10)}</Td>
                    <Td className="font-mono text-xs">{formatPrice(s.gross_amount)}</Td>
                    <Td className="font-mono text-xs text-red-400">{formatPrice(s.commission_amount)} ({s.commission_rate}%)</Td>
                    <Td className="font-mono text-xs font-semibold">{formatPrice(s.net_amount)}</Td>
                    <Td><span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span></Td>
                    <Td className="text-xs text-ink-3">{formatDate(s.created_at)}</Td>
                  </Tr>
                )
              })}
            </Tbody>
          </Table>
        </Card>
      </div>
    </>
  )
}
