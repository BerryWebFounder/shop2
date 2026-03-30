'use client'
import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { PageHeader, Card, Notice } from '@/components/ui/Card'
import { Table, Thead, Th, Tbody, Tr, Td, EmptyRow } from '@/components/ui/Table'
import { MemberStatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { Pagination } from '@/components/ui/Pagination'
import { Modal, ModalActions } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Input'
import { formatDate, formatDateTime } from '@/lib/utils'
import type { MemberSafeView } from '@/types'

const LIMIT = 20

export default function MembersPage() {
  const [members, setMembers]   = useState<MemberSafeView[]>([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [loading, setLoading]   = useState(true)
  const [q, setQ]               = useState('')
  const [status, setStatus]     = useState('')
  const [detail, setDetail]     = useState<(MemberSafeView & { recent_orders?: unknown[] }) | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT), q, status })
      const res = await fetch(`/api/members?${params}`)
      const json = await res.json()
      setMembers(json.data ?? [])
      setTotal(json.total ?? 0)
    } finally {
      setLoading(false)
    }
  }, [page, q, status])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  const handleSearch = useCallback((v: string) => { setQ(v); setPage(1) }, [])
  const handleStatus = (v: string) => { setStatus(v); setPage(1) }

  async function openDetail(id: string) {
    setDetailLoading(true)
    setDetail(null)
    const res = await fetch(`/api/members/${id}`)
    const json = await res.json()
    setDetail(json.data)
    setDetailLoading(false)
  }

  async function changeStatus(id: string, newStatus: string) {
    if (!confirm(`회원 상태를 "${newStatus === 'dormant' ? '휴면' : newStatus === 'withdrawn' ? '탈퇴' : '활성'}"으로 변경하시겠습니까?`)) return
    setActionLoading(true)
    await fetch(`/api/members/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    setActionLoading(false)
    setDetail(null)
    fetchMembers()
  }

  return (
    <>
      <Topbar title="회원 관리" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 animate-page">
        <PageHeader title="회원 관리" subtitle={`전체 ${total.toLocaleString()}명`}>
          <SearchBar placeholder="이름, 이메일 검색..." onSearch={handleSearch} />
          <Select value={status} onChange={e => handleStatus(e.target.value)} className="w-36">
            <option value="">전체 상태</option>
            <option value="active">활성</option>
            <option value="dormant">휴면</option>
            <option value="withdrawn">탈퇴</option>
          </Select>
        </PageHeader>

        <Notice variant="warning">
          <strong>휴면 회원 정책</strong> — 개인정보보호법 및 KISA 기준에 따라 1년 이상 미접속 회원은 자동으로 휴면 전환되며,
          개인정보는 별도 암호화 보관됩니다. 휴면·탈퇴 회원의 민감 정보는 마스킹 처리됩니다.
        </Notice>

        <Card noPadding>
          <Table>
            <Thead>
              <tr>
                <Th>이름</Th><Th>이메일</Th><Th>상태</Th>
                <Th>가입일</Th><Th>최종 접속</Th><Th>관리</Th>
              </tr>
            </Thead>
            <Tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                  <Tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <Td key={j}><div className="h-4 bg-bg-3 rounded animate-pulse w-20" /></Td>
                    ))}
                  </Tr>
                ))
                : members.length === 0
                  ? <EmptyRow colSpan={6} message="회원이 없습니다" />
                  : members.map(m => (
                    <Tr key={m.id} onClick={() => openDetail(m.id)}>
                      <Td><span className="font-medium">{m.name}</span></Td>
                      <Td><span className="font-mono text-xs text-ink-2">{m.email}</span></Td>
                      <Td><MemberStatusBadge status={m.status} /></Td>
                      <Td><span className="font-mono text-xs text-ink-3">{formatDate(m.join_date)}</span></Td>
                      <Td><span className="font-mono text-xs text-ink-3">{formatDateTime(m.last_login)}</span></Td>
                      <Td onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <Button size="xs" onClick={() => openDetail(m.id)}>상세</Button>
                          {m.status === 'active' && (
                            <Button size="xs" variant="danger" onClick={() => changeStatus(m.id, 'dormant')}>휴면</Button>
                          )}
                          {m.status === 'dormant' && (
                            <Button size="xs" onClick={() => changeStatus(m.id, 'active')}>복귀</Button>
                          )}
                        </div>
                      </Td>
                    </Tr>
                  ))
              }
            </Tbody>
          </Table>
          <Pagination page={page} total={total} limit={LIMIT} onChange={setPage} />
        </Card>
      </div>

      {/* 회원 상세 모달 */}
      <Modal open={!!detail || detailLoading} onClose={() => setDetail(null)} title="회원 상세 정보" size="lg">
        {detailLoading && (
          <div className="flex items-center justify-center py-12 text-ink-3">
            <span className="w-6 h-6 border-2 border-ink-3 border-t-accent rounded-full animate-spin" />
          </div>
        )}
        {detail && (
          <>
            {detail.status === 'dormant' && (
              <Notice variant="warning">휴면 회원입니다. KISA 기준에 따라 개인정보가 마스킹 처리됩니다.</Notice>
            )}
            {detail.status === 'withdrawn' && (
              <Notice variant="danger">탈퇴 처리된 회원입니다.</Notice>
            )}
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
              {[
                ['이름', detail.name],
                ['이메일', detail.email],
                ['연락처', detail.phone ?? '-'],
                ['상태', <MemberStatusBadge key="s" status={detail.status} />],
                ['가입일', formatDate(detail.join_date)],
                ['최종 접속', formatDateTime(detail.last_login)],
                ['주소', detail.address ?? '-'],
                ['휴면 전환일', formatDate(detail.dormant_date)],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <div className="text-[11px] text-ink-3 mb-1 uppercase tracking-wide">{label}</div>
                  <div className="font-medium text-ink">{value}</div>
                </div>
              ))}
            </div>
            <ModalActions>
              {detail.status === 'active' && (
                <Button variant="secondary" size="sm" loading={actionLoading} onClick={() => changeStatus(detail.id, 'dormant')}>휴면 처리</Button>
              )}
              {detail.status === 'dormant' && (
                <Button variant="secondary" size="sm" loading={actionLoading} onClick={() => changeStatus(detail.id, 'active')}>활성 복귀</Button>
              )}
              {detail.status !== 'withdrawn' && (
                <Button variant="danger" size="sm" loading={actionLoading} onClick={() => changeStatus(detail.id, 'withdrawn')}>탈퇴 처리</Button>
              )}
              <Button variant="secondary" size="sm" onClick={() => setDetail(null)}>닫기</Button>
            </ModalActions>
          </>
        )}
      </Modal>
    </>
  )
}
