'use client'
// ================================================================
// src/app/admin/sellers/page.tsx
// 관리자 판매자 승인 콘솔
// ================================================================

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SellerApplication, ApplicationStatus } from '@/lib/types/v2'

type Filter = ApplicationStatus

// ── 유틸 ─────────────────────────────────────────────────────────
const STATUS_META: Record<Filter, { label: string; badge: string }> = {
  pending:  { label: '대기 중', badge: 'bg-amber-100 text-amber-700' },
  approved: { label: '승인됨',  badge: 'bg-green-100 text-green-700' },
  rejected: { label: '거절됨',  badge: 'bg-red-100 text-red-600'    },
}

// ── 메인 페이지 ──────────────────────────────────────────────────
export default function AdminSellersPage() {
  const supabase = createClient()

  const [applications, setApplications] = useState<SellerApplication[]>([])
  const [filter,       setFilter]       = useState<Filter>('pending')
  const [loading,      setLoading]      = useState(true)
  const [selected,     setSelected]     = useState<SellerApplication | null>(null)
  const [adminNote,    setAdminNote]    = useState('')
  const [processing,   setProcessing]   = useState(false)

  const fetchApplications = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('seller_applications')
      .select('*')
      .eq('status', filter)
      .order('created_at', { ascending: false })
    setApplications(data ?? [])
    setLoading(false)
  }, [filter])

  useEffect(() => { fetchApplications() }, [fetchApplications])

  const selectApplication = (app: SellerApplication) => {
    setSelected(app)
    setAdminNote('')
  }

  const handleApprove = async () => {
    if (!selected) return
    setProcessing(true)
    const { data, error } = await supabase.rpc('approve_seller_application', {
      p_application_id: selected.id,
      p_admin_note:     adminNote || null,
    })
    if (error || !data?.success) {
      alert('오류: ' + (error?.message ?? data?.error))
    } else {
      alert(`승인 완료! 소호몰 URL: /stores/${data.slug}`)
      setSelected(null)
      fetchApplications()
    }
    setProcessing(false)
  }

  const handleReject = async () => {
    if (!selected) return
    if (!adminNote.trim()) { alert('거절 사유를 입력해 주세요.'); return }
    setProcessing(true)
    const { data, error } = await supabase.rpc('reject_seller_application', {
      p_application_id: selected.id,
      p_admin_note:     adminNote,
    })
    if (error || !data?.success) {
      alert('오류: ' + (error?.message ?? data?.error))
    } else {
      setSelected(null)
      fetchApplications()
    }
    setProcessing(false)
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* ── 좌측 목록 ─────────────────────────────────────── */}
      <div className="w-96 flex flex-col bg-white border-r border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-xl font-bold text-gray-900">판매자 신청 관리</h1>
          {/* 필터 탭 */}
          <div className="flex gap-1 mt-4 bg-gray-100 rounded-lg p-1">
            {(Object.keys(STATUS_META) as Filter[]).map(f => (
              <button key={f} onClick={() => { setFilter(f); setSelected(null) }}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors
                  ${filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {STATUS_META[f].label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">불러오는 중...</div>
          ) : applications.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">신청서가 없습니다</div>
          ) : applications.map(app => (
            <ApplicationListItem
              key={app.id}
              app={app}
              isSelected={selected?.id === app.id}
              onClick={() => selectApplication(app)}
            />
          ))}
        </div>
      </div>

      {/* ── 우측 상세 ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {!selected ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-sm">신청서를 선택하면 상세 내용이 표시됩니다</p>
            </div>
          </div>
        ) : (
          <ApplicationDetail
            app={selected}
            adminNote={adminNote}
            onNoteChange={setAdminNote}
            onApprove={handleApprove}
            onReject={handleReject}
            processing={processing}
          />
        )}
      </div>
    </div>
  )
}

// ── 서브 컴포넌트 ─────────────────────────────────────────────────

function ApplicationListItem({ app, isSelected, onClick }: {
  app: SellerApplication; isSelected: boolean; onClick: () => void
}) {
  const { badge, label } = STATUS_META[app.status]
  return (
    <button onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-all
        ${isSelected ? 'border-indigo-300 bg-indigo-50' : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-gray-900 text-sm">{app.store_name}</p>
          <p className="text-xs text-gray-500 mt-0.5">{app.business_name} · {app.representative}</p>
          <p className="text-xs text-indigo-600 mt-1">/stores/{app.store_slug}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${badge}`}>
          {label}
        </span>
      </div>
      <p className="text-xs text-gray-400 mt-2">
        {new Date(app.created_at).toLocaleDateString('ko-KR')}
      </p>
    </button>
  )
}

function ApplicationDetail({ app, adminNote, onNoteChange, onApprove, onReject, processing }: {
  app: SellerApplication
  adminNote: string
  onNoteChange: (v: string) => void
  onApprove: () => void
  onReject:  () => void
  processing: boolean
}) {
  const { badge, label } = STATUS_META[app.status]

  const bizInfo = [
    { label: '상호명',      value: app.business_name },
    { label: '사업자 유형', value: app.business_type === 'individual' ? '개인사업자' : '법인사업자' },
    { label: '대표자',      value: app.representative },
    { label: '사업자번호',  value: app.business_number ?? '-' },
    { label: '연락처',      value: app.phone },
    { label: '이메일',      value: app.email },
    { label: '주소',        value: app.address },
  ]

  return (
    <div className="max-w-2xl mx-auto p-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{app.store_name}</h2>
          <p className="text-gray-500 text-sm mt-1">
            {app.store_category} · 신청일 {new Date(app.created_at).toLocaleDateString('ko-KR')}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${badge}`}>{label}</span>
      </div>

      {/* 사업자 정보 */}
      <DetailSection title="사업자 정보">
        <InfoGrid items={bizInfo} />
      </DetailSection>

      {/* 소호몰 정보 */}
      <DetailSection title="소호몰 정보">
        <InfoGrid items={[
          { label: '상점명',   value: app.store_name },
          { label: '예정 URL', value: `/stores/${app.store_slug}` },
          { label: '카테고리', value: app.store_category },
        ]} />
        {app.store_intro && (
          <p className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
            {app.store_intro}
          </p>
        )}
      </DetailSection>

      {/* 처리 영역 (대기 중일 때만) */}
      {app.status === 'pending' && (
        <DetailSection title="검토 및 처리">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                관리자 메모
                <span className="ml-1 text-xs text-gray-400 font-normal">
                  (거절 시 필수 — 신청자에게 전달됩니다)
                </span>
              </label>
              <textarea
                value={adminNote} rows={3}
                onChange={e => onNoteChange(e.target.value)}
                placeholder="승인 시: 추가 안내 메모 (선택) | 거절 시: 거절 사유 입력"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg resize-none
                  focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={onReject} disabled={processing}
                className="flex-1 py-3 border-2 border-red-200 text-red-600 rounded-xl font-medium
                  hover:bg-red-50 disabled:opacity-60 transition-colors">
                {processing ? '처리 중...' : '거절'}
              </button>
              <button onClick={onApprove} disabled={processing}
                className="flex-[2] px-8 py-3 bg-indigo-600 text-white rounded-xl font-medium
                  hover:bg-indigo-700 disabled:opacity-60 transition-colors">
                {processing ? '처리 중...' : '✓ 승인 및 소호몰 개설'}
              </button>
            </div>
          </div>
        </DetailSection>
      )}

      {/* 처리 완료 메모 */}
      {app.status !== 'pending' && app.admin_note && (
        <DetailSection title="처리 메모">
          <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{app.admin_note}</p>
          {app.reviewed_at && (
            <p className="text-xs text-gray-400 mt-2">
              처리일: {new Date(app.reviewed_at).toLocaleString('ko-KR')}
            </p>
          )}
        </DetailSection>
      )}
    </div>
  )
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{title}</h3>
      <div className="bg-white rounded-xl border border-gray-100 p-5">{children}</div>
    </div>
  )
}

function InfoGrid({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map(({ label, value }) => (
        <div key={label}>
          <p className="text-xs text-gray-400">{label}</p>
          <p className="text-sm text-gray-800 font-medium mt-0.5">{value}</p>
        </div>
      ))}
    </div>
  )
}
