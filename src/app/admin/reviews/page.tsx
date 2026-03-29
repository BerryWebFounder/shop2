'use client'
import { useState, useEffect, useCallback } from 'react'
import { Topbar }       from '@/components/layout/Topbar'
import { PageHeader, Card, StatCard } from '@/components/ui/Card'
import { Table, Thead, Th, Tbody, Tr, Td, EmptyRow } from '@/components/ui/Table'
import { Badge }        from '@/components/ui/Badge'
import { Button }       from '@/components/ui/Button'
import { Select }       from '@/components/ui/Input'
import { Modal, ModalActions } from '@/components/ui/Modal'
import { AdminStarDisplay }    from '@/components/shop/review/StarRating'
import { formatDate }   from '@/lib/utils'
import type { ReviewAdminView, ReviewStatus, ReviewStatsData } from '@/types/review'

const STATUS_LABEL: Record<ReviewStatus, string> = {
  pending:  '검토 중',
  approved: '승인',
  rejected: '거부',
}
const STATUS_VARIANT: Record<ReviewStatus, 'yellow' | 'green' | 'red'> = {
  pending:  'yellow',
  approved: 'green',
  rejected: 'red',
}

const LIMIT = 20

export default function AdminReviewsPage() {
  const [reviews, setReviews]   = useState<ReviewAdminView[]>([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [loading, setLoading]   = useState(true)
  const [status, setStatus]     = useState('pending')
  const [stats, setStats]       = useState<ReviewStatsData | null>(null)
  const [selected, setSelected] = useState<ReviewAdminView | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [rejectReason, setRejectReason]   = useState('')
  const [adminReply, setAdminReply]       = useState('')
  const [replyMode, setReplyMode]         = useState(false)

  const fetchReviews = useCallback(async () => {
    setLoading(true)
    const p = new URLSearchParams({ admin: 'true', status, page: String(page), limit: String(LIMIT) })
    const res  = await fetch(`/api/reviews?${p}`)
    const json = await res.json()
    setReviews(json.data ?? [])
    setTotal(json.total ?? 0)
    setLoading(false)
  }, [status, page])

  const fetchStats = useCallback(async () => {
    const supabase = (await import('@/lib/supabase/client')).createClient()
    const { data } = await supabase.rpc('review_stats_summary')
    if (data && data[0]) setStats(data[0])
  }, [])

  useEffect(() => { fetchReviews() }, [fetchReviews])
  useEffect(() => { fetchStats() }, [fetchStats])

  async function handleAction(action: 'approve' | 'reject' | 'reply') {
    if (!selected) return
    setActionLoading(true)
    const res = await fetch(`/api/reviews/${selected.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action, reject_reason: rejectReason, admin_reply: adminReply }),
    })
    const json = await res.json()
    if (!res.ok) { alert(json.error); setActionLoading(false); return }
    setActionLoading(false)
    setSelected(null)
    setRejectReason('')
    setAdminReply('')
    setReplyMode(false)
    fetchReviews()
    fetchStats()
  }

  async function handleDelete(id: string) {
    if (!confirm('이 리뷰를 삭제하시겠습니까?')) return
    await fetch(`/api/reviews/${id}`, { method: 'DELETE' })
    fetchReviews(); fetchStats()
  }

  return (
    <>
      <Topbar title="리뷰 관리" />
      <div className="flex-1 overflow-y-auto p-6 animate-page">
        {/* 통계 카드 */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
            <StatCard label="전체 리뷰"  value={stats.total}    />
            <StatCard label="검토 대기"  value={stats.pending}   changeType={stats.pending > 0 ? 'down' : 'neutral'} change={stats.pending > 0 ? '처리 필요' : undefined} />
            <StatCard label="승인됨"     value={stats.approved}  changeType="up" />
            <StatCard label="거부됨"     value={stats.rejected}  />
            <StatCard label="평균 별점"  value={stats.avg_rating ? `★ ${Number(stats.avg_rating).toFixed(1)}` : '-'} />
          </div>
        )}

        <PageHeader title="리뷰 관리" subtitle={`총 ${total.toLocaleString()}건`}>
          <Select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} className="w-36">
            <option value="">전체</option>
            <option value="pending">검토 중</option>
            <option value="approved">승인</option>
            <option value="rejected">거부</option>
          </Select>
        </PageHeader>

        <Card noPadding>
          <Table>
            <Thead>
              <tr>
                <Th>상품</Th><Th>작성자</Th><Th>별점</Th>
                <Th>제목</Th><Th>상태</Th><Th>작성일</Th><Th>관리</Th>
              </tr>
            </Thead>
            <Tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <Tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                      <Td key={j}><div className="h-4 bg-bg-3 rounded animate-pulse w-20" /></Td>
                    ))}</Tr>
                  ))
                : reviews.length === 0
                  ? <EmptyRow colSpan={7} message="리뷰가 없습니다" />
                  : reviews.map(r => (
                      <Tr key={r.id} onClick={() => { setSelected(r); setReplyMode(false) }}>
                        <Td>
                          <div className="text-xs font-medium text-ink line-clamp-1 max-w-[120px]">{r.product_name}</div>
                          <div className="text-[11px] text-ink-3 font-mono">{r.product_serial}</div>
                        </Td>
                        <Td>
                          <div className="text-sm">{r.reviewer_name}</div>
                          {r.reviewer_email && <div className="text-[11px] text-ink-3">{r.reviewer_email}</div>}
                        </Td>
                        <Td><AdminStarDisplay rating={r.rating} /></Td>
                        <Td><span className="text-sm line-clamp-1 max-w-[160px]">{r.title}</span></Td>
                        <Td><Badge variant={STATUS_VARIANT[r.status]}>{STATUS_LABEL[r.status]}</Badge></Td>
                        <Td><span className="text-xs font-mono text-ink-3">{formatDate(r.created_at)}</span></Td>
                        <Td onClick={e => e.stopPropagation()}>
                          <div className="flex gap-1">
                            {r.status === 'pending' && <>
                              <Button size="xs" variant="primary" loading={actionLoading}
                                onClick={() => { setSelected(r); handleAction('approve') }}>승인</Button>
                              <Button size="xs" variant="danger"
                                onClick={() => { setSelected(r); setRejectReason('') }}>거부</Button>
                            </>}
                            <Button size="xs" variant="secondary"
                              onClick={() => { setSelected(r); setReplyMode(true) }}>답변</Button>
                            <Button size="xs" variant="danger"
                              onClick={() => handleDelete(r.id)}>삭제</Button>
                          </div>
                        </Td>
                      </Tr>
                    ))
              }
            </Tbody>
          </Table>
          {/* 페이지네이션 */}
          {Math.ceil(total / LIMIT) > 1 && (
            <div className="flex justify-center gap-1 py-4">
              {Array.from({ length: Math.ceil(total / LIMIT) }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-md text-xs font-mono border transition-colors
                    ${p === page ? 'bg-accent border-accent text-white' : 'bg-bg-3 border-border text-ink-2 hover:border-accent'}`}>
                  {p}
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* 리뷰 상세 / 액션 모달 */}
      <Modal open={!!selected} onClose={() => { setSelected(null); setRejectReason(''); setReplyMode(false) }}
        title={replyMode ? '답변 작성' : '리뷰 상세'} size="lg">
        {selected && (
          <>
            {!replyMode && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-xs text-ink-3">상품</span><p className="font-medium mt-0.5">{selected.product_name}</p></div>
                  <div><span className="text-xs text-ink-3">작성자</span><p className="font-medium mt-0.5">{selected.reviewer_name}</p></div>
                  <div><span className="text-xs text-ink-3">별점</span><div className="mt-0.5"><AdminStarDisplay rating={selected.rating} /></div></div>
                  <div><span className="text-xs text-ink-3">상태</span><div className="mt-0.5"><Badge variant={STATUS_VARIANT[selected.status]}>{STATUS_LABEL[selected.status]}</Badge></div></div>
                </div>
                <div className="p-4 rounded-xl bg-bg-3">
                  <p className="font-semibold text-sm mb-2">{selected.title}</p>
                  <p className="text-sm text-ink-2 leading-relaxed">{selected.body}</p>
                </div>
                {selected.admin_reply && (
                  <div className="p-3 rounded-lg bg-accent/5 border border-accent/20">
                    <p className="text-xs text-accent font-semibold mb-1">관리자 답변</p>
                    <p className="text-sm text-ink-2">{selected.admin_reply}</p>
                  </div>
                )}
                {selected.status === 'rejected' && selected.reject_reason && (
                  <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                    <p className="text-xs text-red-400 font-semibold mb-1">거부 사유</p>
                    <p className="text-sm text-ink-2">{selected.reject_reason}</p>
                  </div>
                )}
              </div>
            )}

            {/* 거부 사유 입력 */}
            {!replyMode && selected.status === 'pending' && (
              <div className="mt-4 pt-4 border-t border-border">
                <label className="block text-xs text-ink-2 mb-1.5">거부 사유 (거부 시 필수)</label>
                <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                  rows={2} placeholder="예: 욕설 포함, 홍보성 내용 등"
                  className="w-full bg-bg-3 border border-border rounded-lg px-3 py-2 text-sm text-ink outline-none resize-none
                    focus:border-accent focus:ring-2 focus:ring-accent/20" />
              </div>
            )}

            {/* 답변 작성 */}
            {replyMode && (
              <div>
                <p className="text-sm text-ink-2 mb-3">
                  <strong>{selected.reviewer_name}</strong>님의 리뷰에 답변을 남깁니다.
                </p>
                <div className="p-3 rounded-lg bg-bg-3 mb-4 text-sm text-ink-3">
                  <p className="font-medium text-ink mb-1">{selected.title}</p>
                  <p className="line-clamp-2">{selected.body}</p>
                </div>
                <textarea value={adminReply} onChange={e => setAdminReply(e.target.value)}
                  rows={4} placeholder="고객에게 공개될 답변을 입력하세요"
                  className="w-full bg-bg-3 border border-border rounded-lg px-3 py-2 text-sm text-ink outline-none resize-none
                    focus:border-accent focus:ring-2 focus:ring-accent/20" />
              </div>
            )}

            <ModalActions>
              {!replyMode && selected.status === 'pending' && <>
                <Button variant="primary" loading={actionLoading}
                  onClick={() => handleAction('approve')}>✓ 승인</Button>
                <Button variant="danger" loading={actionLoading}
                  onClick={() => handleAction('reject')}>✕ 거부</Button>
              </>}
              {!replyMode && <Button variant="secondary" onClick={() => setReplyMode(true)}>답변 작성</Button>}
              {replyMode && <Button variant="primary" loading={actionLoading}
                onClick={() => handleAction('reply')}>답변 등록</Button>}
              <Button variant="secondary" onClick={() => { setSelected(null); setReplyMode(false) }}>닫기</Button>
            </ModalActions>
          </>
        )}
      </Modal>
    </>
  )
}
