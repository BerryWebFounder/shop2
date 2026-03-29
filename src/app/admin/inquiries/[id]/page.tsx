'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Topbar }       from '@/components/layout/Topbar'
import { Card, CardTitle, Notice } from '@/components/ui/Card'
import { Badge }        from '@/components/ui/Badge'
import { Button }       from '@/components/ui/Button'
import { Select, FormField } from '@/components/ui/Input'
import { formatDateTime } from '@/lib/utils'
import {
  INQUIRY_CATEGORY_LABEL, INQUIRY_STATUS_LABEL, INQUIRY_STATUS_VARIANT,
  type InquiryWithReplies, type InquiryStatus,
} from '@/types/cs'

export default function AdminInquiryDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [inquiry, setInquiry]     = useState<InquiryWithReplies | null>(null)
  const [loading, setLoading]     = useState(true)
  const [replyBody, setReplyBody] = useState('')
  const [replyLoading, setReplyLoading] = useState(false)
  const [replyError, setReplyError]     = useState('')
  const [statusLoading, setStatusLoading] = useState(false)

  const fetchInquiry = useCallback(async () => {
    setLoading(true)
    const res  = await fetch(`/api/inquiries/${params.id}`)
    const json = await res.json()
    if (res.ok) setInquiry(json.data)
    setLoading(false)
  }, [params.id])

  useEffect(() => { fetchInquiry() }, [fetchInquiry])

  async function handleStatusChange(newStatus: InquiryStatus) {
    setStatusLoading(true)
    await fetch(`/api/inquiries/${params.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status: newStatus }),
    })
    setStatusLoading(false)
    fetchInquiry()
  }

  async function handleReply() {
    if (!replyBody.trim()) { setReplyError('답변 내용을 입력하세요'); return }
    setReplyLoading(true); setReplyError('')

    const res = await fetch(`/api/inquiries/${params.id}/reply`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        body:        replyBody,
        is_admin:    true,
        author_name: '관리자',
        attachments: [],
      }),
    })
    const json = await res.json()
    if (!res.ok) { setReplyError(json.error ?? '답변 실패'); setReplyLoading(false); return }
    setReplyBody('')
    setReplyLoading(false)
    fetchInquiry()
  }

  if (loading) {
    return (
      <>
        <Topbar title="문의 상세" />
        <div className="flex-1 flex items-center justify-center">
          <span className="w-8 h-8 border-2 border-ink-3 border-t-accent rounded-full animate-spin" />
        </div>
      </>
    )
  }

  if (!inquiry) return (
    <>
      <Topbar title="문의 상세" />
      <div className="flex-1 flex items-center justify-center text-ink-3">문의를 찾을 수 없습니다</div>
    </>
  )

  return (
    <>
      <Topbar title="문의 상세" />
      <div className="flex-1 overflow-y-auto p-6 animate-page max-w-4xl mx-auto">

        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>← 목록</Button>
          <Badge variant={INQUIRY_STATUS_VARIANT[inquiry.status]}>
            {INQUIRY_STATUS_LABEL[inquiry.status]}
          </Badge>
          <span className="text-xs text-ink-3 font-mono">{INQUIRY_CATEGORY_LABEL[inquiry.category]}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 문의 내용 (왼쪽 2/3) */}
          <div className="lg:col-span-2 space-y-4">
            {/* 원문 */}
            <Card>
              <CardTitle>📋 문의 내용</CardTitle>
              <h2 className="text-base font-semibold mb-3 text-ink">{inquiry.title}</h2>
              <p className="text-sm text-ink-2 leading-relaxed whitespace-pre-wrap mb-4">{inquiry.body}</p>
              {inquiry.attachments?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {inquiry.attachments.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener"
                      className="text-xs px-2 py-1 rounded-lg bg-bg-3 text-ink-2 border border-border">
                      📎 첨부파일 {i + 1}
                    </a>
                  ))}
                </div>
              )}
            </Card>

            {/* 답변 스레드 */}
            {inquiry.replies?.length > 0 && (
              <Card>
                <CardTitle>💬 답변 스레드</CardTitle>
                <div className="space-y-4">
                  {inquiry.replies.map(reply => (
                    <div
                      key={reply.id}
                      className="p-4 rounded-xl"
                      style={{
                        background: reply.is_admin ? 'rgba(79,142,247,0.06)' : 'var(--bg-3)',
                        border: `1px solid ${reply.is_admin ? 'rgba(79,142,247,0.2)' : 'var(--border)'}`,
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-semibold ${reply.is_admin ? 'text-accent' : 'text-ink-2'}`}>
                          {reply.is_admin ? '🛡️ 관리자' : reply.author_name}
                        </span>
                        <span className="text-[11px] text-ink-3 font-mono">{formatDateTime(reply.created_at)}</span>
                      </div>
                      <p className="text-sm text-ink-2 leading-relaxed whitespace-pre-wrap">{reply.body}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* 답변 작성 */}
            {inquiry.status !== 'closed' && (
              <Card>
                <CardTitle>✍️ 답변 작성</CardTitle>
                <textarea
                  value={replyBody}
                  onChange={e => setReplyBody(e.target.value)}
                  placeholder="고객에게 공개될 답변을 입력하세요"
                  rows={5}
                  className="w-full bg-bg-3 border border-border rounded-lg px-3 py-2.5 text-sm text-ink
                    outline-none resize-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                />
                <div className="flex items-center justify-between mt-3">
                  {replyError && <p className="text-xs text-red-400">{replyError}</p>}
                  <div className="flex gap-2 ml-auto">
                    <Button variant="secondary" size="sm"
                      onClick={() => handleStatusChange('in_progress')} loading={statusLoading}>
                      처리 중으로
                    </Button>
                    <Button variant="primary" size="sm" loading={replyLoading} onClick={handleReply}>
                      답변 등록
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* 사이드: 문의자 정보 + 상태 변경 */}
          <div className="space-y-4">
            <Card>
              <CardTitle>👤 문의자 정보</CardTitle>
              {[
                ['이름',   inquiry.author_name],
                ['이메일', inquiry.author_email],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-1.5 border-b border-border last:border-0">
                  <span className="text-xs text-ink-3">{label}</span>
                  <span className="text-sm text-ink font-medium">{value}</span>
                </div>
              ))}
            </Card>

            <Card>
              <CardTitle>🔄 상태 변경</CardTitle>
              <div className="space-y-2">
                {(['pending','in_progress','answered','closed'] as InquiryStatus[]).map(s => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    disabled={inquiry.status === s || statusLoading}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-40"
                    style={{
                      background: inquiry.status === s ? 'rgba(79,142,247,0.1)' : 'var(--bg-3)',
                      color:      inquiry.status === s ? 'var(--accent)' : 'var(--text-2)',
                      fontWeight: inquiry.status === s ? 600 : 400,
                    }}
                  >
                    {INQUIRY_STATUS_LABEL[s]}
                    {inquiry.status === s && ' ✓'}
                  </button>
                ))}
              </div>
            </Card>

            <Card>
              <CardTitle>📅 타임라인</CardTitle>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-ink-3">접수</span>
                  <span className="font-mono text-ink-2">{formatDateTime(inquiry.created_at)}</span>
                </div>
                {inquiry.admin_replied_at && (
                  <div className="flex justify-between">
                    <span className="text-ink-3">최초 답변</span>
                    <span className="font-mono text-green-400">{formatDateTime(inquiry.admin_replied_at)}</span>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}
