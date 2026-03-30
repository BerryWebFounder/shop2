'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { PageHeader, Card, StatCard } from '@/components/ui/Card'
import { Table, Thead, Th, Tbody, Tr, Td, EmptyRow } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { Select, FormField, Input } from '@/components/ui/Input'
import { Pagination } from '@/components/ui/Pagination'
import { formatPrice, formatDateTime } from '@/lib/utils'
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_VARIANT,
  type OrderListItem,
  type OrderStatus,
} from '@/types/order'

const LIMIT = 20

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '',          label: '전체 상태' },
  { value: 'pending',   label: '결제대기' },
  { value: 'paid',      label: '결제완료' },
  { value: 'shipping',  label: '배송중' },
  { value: 'delivered', label: '배송완료' },
  { value: 'returned',  label: '반품요청' },
  { value: 'cancelled', label: '취소' },
]

export default function OrdersPage() {
  const router = useRouter()
  const [orders, setOrders]   = useState<OrderListItem[]>([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [loading, setLoading] = useState(true)
  const [q, setQ]             = useState('')
  const [status, setStatus]   = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')

  // 상태별 집계 (빠른 필터용)
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams({
        page: String(page), limit: String(LIMIT), q, status,
        ...(dateFrom && { date_from: dateFrom }),
        ...(dateTo   && { date_to:   dateTo   }),
      })
      const res  = await fetch(`/api/orders?${p}`)
      const json = await res.json()
      setOrders(json.data  ?? [])
      setTotal(json.total ?? 0)
    } finally {
      setLoading(false)
    }
  }, [page, q, status, dateFrom, dateTo])

  // 상태별 카운트 조회
  const fetchStatusCounts = useCallback(async () => {
    const res  = await fetch('/api/orders/stats')
    const json = await res.json()
    const counts: Record<string, number> = {}
    ;(json.data?.by_status ?? []).forEach(
      (s: { status: string; order_count: number }) => {
        counts[s.status] = s.order_count
      }
    )
    setStatusCounts(counts)
  }, [])

  useEffect(() => { fetchOrders() },       [fetchOrders])
  useEffect(() => { fetchStatusCounts() }, [fetchStatusCounts])

  const handleSearch = useCallback((v: string) => { setQ(v); setPage(1) }, [])

  function quickFilter(s: string) {
    setStatus(s)
    setPage(1)
  }

  return (
    <>
      <Topbar title="주문 관리" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 animate-page">

        {/* 상태별 빠른 필터 카드 */}
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 mb-5">
          {(Object.entries(ORDER_STATUS_LABEL) as [OrderStatus, string][]).map(
            ([s, label]) => (
              <button
                key={s}
                onClick={() => quickFilter(status === s ? '' : s)}
                className={`
                  flex flex-col items-center py-3 px-2 rounded-xl border transition-all
                  ${status === s
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border bg-bg-2 text-ink-2 hover:border-border-2 hover:text-ink'
                  }
                `}
              >
                <span className="text-lg font-bold font-mono">
                  {(statusCounts[s] ?? 0).toLocaleString()}
                </span>
                <span className="text-[11px] mt-0.5">{label}</span>
              </button>
            )
          )}
        </div>

        <PageHeader title="주문 목록" subtitle={`전체 ${total.toLocaleString()}건`}>
          <SearchBar
            placeholder="주문번호, 수령인 검색..."
            onSearch={handleSearch}
          />
          <Select
            value={status}
            onChange={e => { setStatus(e.target.value); setPage(1) }}
            className="w-32"
          >
            {STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </PageHeader>

        {/* 기간 필터 */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs text-ink-3">기간</span>
          <Input
            type="date" value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setPage(1) }}
            className="w-36 py-1.5 text-xs"
          />
          <span className="text-ink-3 text-xs">~</span>
          <Input
            type="date" value={dateTo}
            onChange={e => { setDateTo(e.target.value); setPage(1) }}
            className="w-36 py-1.5 text-xs"
          />
          {(dateFrom || dateTo) && (
            <Button
              size="xs" variant="ghost"
              onClick={() => { setDateFrom(''); setDateTo(''); setPage(1) }}
            >
              초기화
            </Button>
          )}
        </div>

        <Card noPadding>
          <Table>
            <Thead>
              <tr>
                <Th>주문번호</Th>
                <Th>주문자</Th>
                <Th>수령인</Th>
                <Th>상품 수</Th>
                <Th>결제금액</Th>
                <Th>주문일시</Th>
                <Th>상태</Th>
                <Th>관리</Th>
              </tr>
            </Thead>
            <Tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <Tr key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <Td key={j}>
                          <div className="h-4 bg-bg-3 rounded animate-pulse w-20" />
                        </Td>
                      ))}
                    </Tr>
                  ))
                : orders.length === 0
                  ? <EmptyRow colSpan={8} message="주문이 없습니다" />
                  : orders.map(order => (
                      <Tr
                        key={order.id}
                        onClick={() => router.push(`/admin/orders/${order.id}`)}
                      >
                        <Td>
                          <span className="font-mono text-xs text-accent">
                            {order.order_no}
                          </span>
                        </Td>
                        <Td>
                          <div className="text-sm font-medium">
                            {order.member_name ?? '비회원'}
                          </div>
                          <div className="text-[11px] text-ink-3 font-mono">
                            {order.member_email ?? '-'}
                          </div>
                        </Td>
                        <Td>
                          <span className="text-sm">
                            {order.shipping_name ?? '-'}
                          </span>
                        </Td>
                        <Td>
                          <span className="font-mono text-sm">
                            {order.item_count}개
                          </span>
                        </Td>
                        <Td>
                          <span className="font-mono text-sm font-medium">
                            {formatPrice(order.total_amount)}
                          </span>
                        </Td>
                        <Td>
                          <span className="font-mono text-xs text-ink-3">
                            {formatDateTime(order.created_at)}
                          </span>
                        </Td>
                        <Td>
                          <Badge variant={ORDER_STATUS_VARIANT[order.status]}>
                            {ORDER_STATUS_LABEL[order.status]}
                          </Badge>
                        </Td>
                        <Td onClick={e => e.stopPropagation()}>
                          <Button
                            size="xs"
                            onClick={() => router.push(`/admin/orders/${order.id}`)}
                          >
                            상세
                          </Button>
                        </Td>
                      </Tr>
                    ))
              }
            </Tbody>
          </Table>
          <Pagination
            page={page} total={total} limit={LIMIT} onChange={setPage}
          />
        </Card>
      </div>
    </>
  )
}
