'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal, ModalActions } from '@/components/ui/Modal'
import { FormField, Select, Textarea } from '@/components/ui/Input'
import { GradeBadge, GradeProgress } from '@/components/admin/member/GradeBadge'
import { MemberOrderHistory } from '@/components/admin/member/MemberOrderHistory'
import { formatPrice, formatDate, formatDateTime } from '@/lib/utils'
import {
  GRADE_LABEL, GRADE_ICON,
  type MemberStatsView, type MemberGrade, type MemberGradeHistory,
} from '@/types/member'

const STATUS_VARIANT = { active: 'green', dormant: 'yellow', withdrawn: 'gray' } as const
const STATUS_LABEL   = { active: '활성', dormant: '휴면', withdrawn: '탈퇴' }

export default function AdminMemberDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [member,  setMember]  = useState<MemberStatsView | null>(null)
  const [history, setHistory] = useState<MemberGradeHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [gradeModal, setGradeModal] = useState(false)
  const [newGrade,   setNewGrade]   = useState<MemberGrade>('bronze')
  const [gradeReason, setGradeReason] = useState('')
  const [gradeLoading, setGradeLoading] = useState(false)
  const [gradeError,   setGradeError]   = useState('')
  const [notes, setNotes]   = useState('')
  const [notesEditing, setNotesEditing] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'orders' | 'grade'>('info')

  const fetchMember = useCallback(async () => {
    setLoading(true)
    const supabase = (await import('@/lib/supabase/client')).createClient()
    const [{ data: m }, { data: h }] = await Promise.all([
      supabase.from('member_stats_view').select('*').eq('id', params.id).single(),
      supabase.from('member_grade_history').select('*').eq('member_id', params.id).order('created_at', { ascending: false }).limit(20),
    ])
    if (m) { setMember(m); setNotes(m.notes ?? ''); setNewGrade(m.grade as MemberGrade) }
    setHistory(h ?? [])
    setLoading(false)
  }, [params.id])

  useEffect(() => { fetchMember() }, [fetchMember])

  async function handleGradeChange() {
    setGradeLoading(true); setGradeError('')
    const res = await fetch(`/api/members/${params.id}/grade`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grade: newGrade, reason: gradeReason || '관리자 수동 변경' }),
    })
    const json = await res.json()
    if (!res.ok) { setGradeError(json.error ?? '실패'); setGradeLoading(false); return }
    setGradeLoading(false); setGradeModal(false)
    fetchMember()
  }

  async function handleRecalcGrade() {
    await fetch(`/api/members/${params.id}/grade`, { method: 'POST' })
    fetchMember()
  }

  async function saveNotes() {
    const supabase = (await import('@/lib/supabase/client')).createClient()
    await supabase.from('members').update({ notes }).eq('id', params.id)
    setNotesEditing(false)
    fetchMember()
  }

  if (loading) return (
    <>
      <Topbar title="회원 상세" />
      <div className="flex-1 flex items-center justify-center">
        <span className="w-8 h-8 border-2 border-ink-3 border-t-accent rounded-full animate-spin" />
      </div>
    </>
  )

  if (!member) return (
    <>
      <Topbar title="회원 상세" />
      <div className="flex-1 flex items-center justify-center text-ink-3">회원을 찾을 수 없습니다</div>
    </>
  )

  return (
    <>
      <Topbar title="회원 상세" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 animate-page">

        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>← 목록</Button>
        </div>

        {/* 프로필 요약 */}
        <div className="flex items-start gap-4 p-5 rounded-xl border border-border bg-bg-2 mb-5">
          {/* 아바타 */}
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            {member.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-bold text-ink">{member.name}</h2>
              <Badge variant={STATUS_VARIANT[member.status as keyof typeof STATUS_VARIANT]}>
                {STATUS_LABEL[member.status as keyof typeof STATUS_LABEL]}
              </Badge>
              <GradeBadge grade={member.grade as MemberGrade} size="sm" />
            </div>
            <p className="text-sm text-ink-3 mb-1">{member.email}</p>
            {member.phone && <p className="text-sm text-ink-3">{member.phone}</p>}
          </div>
          <div className="grid grid-cols-3 gap-4 text-center flex-shrink-0">
            {[
              ['총 구매', formatPrice(member.total_purchase)],
              ['주문 수', `${member.order_count}건`],
              ['포인트', `${member.point_balance.toLocaleString()}P`],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="text-xs text-ink-3 mb-0.5">{label}</div>
                <div className="text-sm font-bold font-mono text-ink">{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-border mb-5">
          {[
            { key: 'info',   label: '기본 정보' },
            { key: 'orders', label: `주문 이력 (${member.order_count})` },
            { key: 'grade',  label: '등급 이력' },
          ].map(t => (
            <button key={t.key}
              onClick={() => setActiveTab(t.key as typeof activeTab)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === t.key ? 'border-accent text-accent' : 'border-transparent text-ink-3 hover:text-ink-2'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── 기본 정보 탭 ── */}
        {activeTab === 'info' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* 등급 정보 */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <CardTitle>🏆 등급 정보</CardTitle>
                <div className="flex gap-2">
                  <Button size="xs" variant="secondary" onClick={handleRecalcGrade}>재계산</Button>
                  <Button size="xs" onClick={() => setGradeModal(true)}>등급 변경</Button>
                </div>
              </div>
              <GradeProgress
                grade={member.grade as MemberGrade}
                annualPurchase={member.annual_purchase}
                nextGradeAmount={member.next_grade_amount ?? null}
              />
              <div className="mt-4 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-ink-3">연간 구매액</span>
                  <span className="font-mono font-medium text-ink">{formatPrice(member.annual_purchase)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-3">포인트 적립률</span>
                  <span className="font-mono font-medium text-ink">{(member.point_rate * 100).toFixed(0)}%</span>
                </div>
                {member.discount_rate > 0 && (
                  <div className="flex justify-between">
                    <span className="text-ink-3">추가 할인</span>
                    <span className="font-mono font-medium text-green-400">{(member.discount_rate * 100).toFixed(0)}%</span>
                  </div>
                )}
                {member.grade_updated_at && (
                  <div className="flex justify-between">
                    <span className="text-ink-3">등급 변경일</span>
                    <span className="font-mono text-ink-3">{formatDate(member.grade_updated_at)}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* 회원 정보 */}
            <Card>
              <CardTitle>👤 회원 정보</CardTitle>
              <div className="space-y-2 text-xs mt-2">
                {[
                  ['가입일',   formatDate(member.join_date)],
                  ['최근 로그인', member.last_login ? formatDateTime(member.last_login) : '없음'],
                  ['누적 구매', formatPrice(member.total_purchase)],
                  ['총 주문',  `${member.order_count}건`],
                  ['포인트 잔액', `${member.point_balance.toLocaleString()}P`],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between py-1.5 border-b border-border last:border-0">
                    <span className="text-ink-3">{label}</span>
                    <span className="text-ink font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* 관리자 메모 */}
            <Card className="lg:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <CardTitle>📝 관리자 메모</CardTitle>
                {notesEditing
                  ? <div className="flex gap-2">
                      <Button size="xs" variant="secondary" onClick={() => setNotesEditing(false)}>취소</Button>
                      <Button size="xs" variant="primary" onClick={saveNotes}>저장</Button>
                    </div>
                  : <Button size="xs" onClick={() => setNotesEditing(true)}>편집</Button>
                }
              </div>
              {notesEditing
                ? <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4}
                    className="w-full bg-bg-3 border border-border rounded-lg px-3 py-2 text-sm text-ink outline-none resize-none focus:border-accent" />
                : <p className="text-sm text-ink-2 whitespace-pre-wrap min-h-[48px]">
                    {member.notes || <span className="text-ink-3 italic">메모 없음</span>}
                  </p>
              }
            </Card>
          </div>
        )}

        {/* ── 주문 이력 탭 ── */}
        {activeTab === 'orders' && (
          <Card>
            <CardTitle>📦 주문 이력</CardTitle>
            <MemberOrderHistory memberId={params.id} />
          </Card>
        )}

        {/* ── 등급 이력 탭 ── */}
        {activeTab === 'grade' && (
          <Card>
            <CardTitle>📊 등급 변경 이력</CardTitle>
            {history.length === 0
              ? <p className="text-sm text-ink-3 text-center py-8">등급 변경 이력이 없습니다</p>
              : (
                <div className="space-y-3 mt-2">
                  {history.map(h => (
                    <div key={h.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                      <div className="flex items-center gap-2">
                        {h.from_grade && <GradeBadge grade={h.from_grade as MemberGrade} size="xs" />}
                        <span className="text-ink-3 text-xs">→</span>
                        <GradeBadge grade={h.to_grade as MemberGrade} size="xs" />
                      </div>
                      <span className="text-xs text-ink-3 flex-1">{h.reason}</span>
                      {h.annual_amount != null && (
                        <span className="text-xs font-mono text-ink-3">{formatPrice(h.annual_amount)}</span>
                      )}
                      <span className="text-[11px] font-mono text-ink-3 flex-shrink-0">{formatDate(h.created_at)}</span>
                    </div>
                  ))}
                </div>
              )
            }
          </Card>
        )}
      </div>

      {/* 등급 변경 모달 */}
      <Modal open={gradeModal} onClose={() => setGradeModal(false)} title="등급 수동 변경" size="sm">
        <FormField label="변경할 등급">
          <Select value={newGrade} onChange={e => setNewGrade(e.target.value as MemberGrade)}>
            {(['bronze','silver','gold','vip'] as MemberGrade[]).map(g => (
              <option key={g} value={g}>{GRADE_ICON[g]} {GRADE_LABEL[g]}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="사유">
          <Textarea value={gradeReason} onChange={e => setGradeReason(e.target.value)}
            placeholder="이벤트 보상, CS 처리 등" rows={2} />
        </FormField>
        {gradeError && <p className="text-xs text-red-400 mt-2">{gradeError}</p>}
        <ModalActions>
          <Button variant="secondary" onClick={() => setGradeModal(false)}>취소</Button>
          <Button variant="primary" loading={gradeLoading} onClick={handleGradeChange}>변경</Button>
        </ModalActions>
      </Modal>
    </>
  )
}
