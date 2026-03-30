'use client'
import { useState, useEffect, useCallback } from 'react'
import { Topbar }       from '@/components/layout/Topbar'
import { PageHeader, Card } from '@/components/ui/Card'
import { Table, Thead, Th, Tbody, Tr, Td, EmptyRow } from '@/components/ui/Table'
import { Badge }        from '@/components/ui/Badge'
import { Button }       from '@/components/ui/Button'
import { Modal, ModalActions } from '@/components/ui/Modal'
import { FormField, Input, Textarea } from '@/components/ui/Input'
import { SearchBar }    from '@/components/ui/SearchBar'
import { Pagination }   from '@/components/ui/Pagination'
import { formatDate }   from '@/lib/utils'
import type { MemberPointBalance, PointType } from '@/types/coupon'

interface MemberWithPoints extends MemberPointBalance {
  member_name: string
  member_email: string
}

const TYPE_LABEL: Record<PointType, string> = {
  earn:   '적립', use: '사용', expire: '소멸', admin: '관리자', cancel: '취소복구',
}
const TYPE_VARIANT: Record<PointType, 'green' | 'red' | 'gray' | 'blue' | 'yellow'> = {
  earn: 'green', use: 'red', expire: 'gray', admin: 'blue', cancel: 'yellow',
}

export default function AdminPointsPage() {
  const [members, setMembers]       = useState<MemberWithPoints[]>([])
  const [total, setTotal]           = useState(0)
  const [page, setPage]             = useState(1)
  const [loading, setLoading]       = useState(true)
  const [q, setQ]                   = useState('')
  const [selected, setSelected]     = useState<MemberWithPoints | null>(null)
  const [history, setHistory]       = useState<unknown[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [grantModal, setGrantModal] = useState(false)
  const [grantForm, setGrantForm]   = useState({ amount: 0, reason: '' })
  const [grantLoading, setGrantLoading] = useState(false)
  const [grantError, setGrantError] = useState('')

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    // 포인트 잔액과 회원 정보를 join해서 조회
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { data, count } = await supabase
      .from('member_point_balance')
      .select(`
        *,
        member:members!member_id(name, email)
      `, { count: 'exact' })
      .order('balance', { ascending: false })
      .range((page - 1) * 20, page * 20 - 1)

    setMembers((data ?? []).map((d: {
      member_id: string; balance: number; total_earned: number; total_used: number
      earn_count: number; last_activity: string | null
      member: { name: string; email: string } | null
    }) => ({
      ...d,
      member_name:  d.member?.name  ?? '알 수 없음',
      member_email: d.member?.email ?? '',
    })))
    setTotal(count ?? 0)
    setLoading(false)
  }, [page])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  async function openDetail(m: MemberWithPoints) {
    setSelected(m); setHistoryLoading(true)
    const res  = await fetch(`/api/points/${m.member_id}`)
    const json = await res.json()
    setHistory(json.history ?? [])
    setHistoryLoading(false)
  }

  async function handleGrant() {
    if (!selected) return
    if (!grantForm.amount)        { setGrantError('금액을 입력하세요'); return }
    if (!grantForm.reason.trim()) { setGrantError('사유를 입력하세요'); return }
    setGrantLoading(true); setGrantError('')

    const res = await fetch(`/api/points/${selected.member_id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(grantForm),
    })
    const json = await res.json()
    if (!res.ok) { setGrantError(json.error ?? '처리 실패'); setGrantLoading(false); return }

    setGrantLoading(false); setGrantModal(false)
    setGrantForm({ amount: 0, reason: '' })
    openDetail(selected); fetchMembers()
  }

  return (
    <>
      <Topbar title="포인트 관리" />
      <div className="flex h-[calc(100vh-56px)] overflow-hidden">
        {/* 회원 목록 */}
        <div className="w-80 flex-shrink-0 border-r border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <SearchBar placeholder="회원 검색..." onSearch={v => { setQ(v); setPage(1) }} className="w-full" />
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="p-4 border-b border-border animate-pulse">
                    <div className="h-4 bg-bg-3 rounded w-24 mb-2" />
                    <div className="h-3 bg-bg-3 rounded w-16" />
                  </div>
                ))
              : members.map(m => (
                  <div
                    key={m.member_id}
                    onClick={() => openDetail(m)}
                    className={`p-4 border-b border-border cursor-pointer hover:bg-bg-3 transition-colors ${selected?.member_id === m.member_id ? 'bg-accent/10 border-l-2 border-l-accent' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-ink">{m.member_name}</span>
                      <span className="text-sm font-bold font-mono text-accent">{m.balance.toLocaleString()}P</span>
                    </div>
                    <div className="text-xs text-ink-3">{m.member_email}</div>
                    <div className="text-[11px] text-ink-3 mt-1">
                      총 {m.total_earned?.toLocaleString() ?? 0}P 적립 · {m.total_used?.toLocaleString() ?? 0}P 사용
                    </div>
                  </div>
                ))
            }
          </div>
          <div className="p-2 border-t border-border">
            <Pagination page={page} total={total} limit={20} onChange={setPage} />
          </div>
        </div>

        {/* 포인트 내역 */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full text-ink-3">
              <p className="text-4xl mb-3">👈</p>
              <p className="text-sm">회원을 선택하면 포인트 내역을 확인할 수 있습니다</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-base font-bold text-ink">{selected.member_name}</h2>
                  <p className="text-xs text-ink-3">{selected.member_email}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs text-ink-3">현재 잔액</div>
                    <div className="text-xl font-bold font-mono text-accent">{selected.balance.toLocaleString()}P</div>
                  </div>
                  <Button variant="primary" onClick={() => { setGrantModal(true); setGrantError('') }}>
                    포인트 지급/차감
                  </Button>
                </div>
              </div>

              <Card noPadding>
                <Table>
                  <Thead>
                    <tr><Th>유형</Th><Th>금액</Th><Th>사유</Th><Th>일시</Th></tr>
                  </Thead>
                  <Tbody>
                    {historyLoading
                      ? Array.from({ length: 5 }).map((_, i) => <Tr key={i}>{Array.from({ length: 4 }).map((_, j) => <Td key={j}><div className="h-4 bg-bg-3 rounded w-20 animate-pulse" /></Td>)}</Tr>)
                      : (history as Array<{ id: string; type: PointType; amount: number; reason: string; created_at: string }>).length === 0
                        ? <EmptyRow colSpan={4} message="포인트 내역이 없습니다" />
                        : (history as Array<{ id: string; type: PointType; amount: number; reason: string; created_at: string }>).map(h => (
                          <Tr key={h.id}>
                            <Td><Badge variant={TYPE_VARIANT[h.type]}>{TYPE_LABEL[h.type]}</Badge></Td>
                            <Td>
                              <span className={`font-mono font-bold text-sm ${h.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {h.amount > 0 ? '+' : ''}{h.amount.toLocaleString()}P
                              </span>
                            </Td>
                            <Td><span className="text-sm text-ink-2">{h.reason}</span></Td>
                            <Td><span className="font-mono text-xs text-ink-3">{formatDate(h.created_at)}</span></Td>
                          </Tr>
                        ))
                    }
                  </Tbody>
                </Table>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* 포인트 지급/차감 모달 */}
      <Modal open={grantModal} onClose={() => setGrantModal(false)} title="포인트 지급/차감" size="sm">
        <div className="space-y-3">
          <FormField label="금액 (양수: 지급, 음수: 차감)" required>
            <Input type="number"
              value={grantForm.amount || ''}
              onChange={e => setGrantForm(f => ({ ...f, amount: parseInt(e.target.value) || 0 }))}
              placeholder="예: 1000 (지급) 또는 -500 (차감)" />
          </FormField>
          <FormField label="사유" required>
            <Textarea value={grantForm.reason}
              onChange={e => setGrantForm(f => ({ ...f, reason: e.target.value }))}
              placeholder="이벤트 보상, 오류 보상 등" rows={2} />
          </FormField>
          {grantError && <p className="text-xs text-red-400">{grantError}</p>}
        </div>
        <ModalActions>
          <Button variant="secondary" onClick={() => setGrantModal(false)}>취소</Button>
          <Button variant="primary" loading={grantLoading} onClick={handleGrant}>처리</Button>
        </ModalActions>
      </Modal>
    </>
  )
}
