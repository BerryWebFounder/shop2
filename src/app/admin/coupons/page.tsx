'use client'
import { useState, useEffect, useCallback } from 'react'
import { Topbar }       from '@/components/layout/Topbar'
import { PageHeader, Card, StatCard } from '@/components/ui/Card'
import { Table, Thead, Th, Tbody, Tr, Td, EmptyRow } from '@/components/ui/Table'
import { Badge }        from '@/components/ui/Badge'
import { Button }       from '@/components/ui/Button'
import { Modal, ModalActions } from '@/components/ui/Modal'
import { FormField, Input, Select, Textarea } from '@/components/ui/Input'
import { SearchBar }    from '@/components/ui/SearchBar'
import { Pagination }   from '@/components/ui/Pagination'
import { formatPrice, formatDate } from '@/lib/utils'
import type { CouponStatsView, DiscountType } from '@/types/coupon'

const EMPTY_FORM = {
  code: '', name: '', description: '',
  discount_type: 'percent' as DiscountType,
  discount_value: 10,
  min_order_amount: 0, max_discount_amt: null as number | null,
  usage_limit: null as number | null, per_user_limit: 1,
  valid_from: new Date().toISOString().slice(0, 16),
  valid_until: null as string | null,
  applicable_cat: null as string | null,
  is_active: true,
}

const STATUS_VARIANT = {
  active:   'green',
  expired:  'gray',
  inactive: 'red',
} as const

const STATUS_LABEL = { active: '활성', expired: '만료', inactive: '비활성' }

export default function AdminCouponsPage() {
  const [coupons, setCoupons]   = useState<CouponStatsView[]>([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [loading, setLoading]   = useState(true)
  const [q, setQ]               = useState('')
  const [status, setStatus]     = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId]     = useState<string | null>(null)
  const [form, setForm]         = useState({ ...EMPTY_FORM })
  const [saving, setSaving]     = useState(false)
  const [formError, setFormError] = useState('')

  // 통계
  const activeCount  = coupons.filter(c => c.computed_status === 'active').length
  const expiredCount = coupons.filter(c => c.computed_status === 'expired').length
  const totalDiscount = coupons.reduce((s, c) => s + c.total_discount_given, 0)

  const fetchCoupons = useCallback(async () => {
    setLoading(true)
    const p = new URLSearchParams({ page: String(page), q, ...(status && { status }) })
    const res  = await fetch(`/api/coupons?${p}`)
    const json = await res.json()
    setCoupons(json.data ?? [])
    setTotal(json.total ?? 0)
    setLoading(false)
  }, [page, q, status])

  useEffect(() => { fetchCoupons() }, [fetchCoupons])

  function openCreate() {
    setEditId(null)
    setForm({ ...EMPTY_FORM, valid_from: new Date().toISOString().slice(0, 16) })
    setFormError(''); setModalOpen(true)
  }

  function openEdit(c: CouponStatsView) {
    setEditId(c.id)
    setForm({
      code: c.code, name: c.name, description: c.description ?? '',
      discount_type: c.discount_type, discount_value: c.discount_value,
      min_order_amount: c.min_order_amount, max_discount_amt: c.max_discount_amt,
      usage_limit: c.usage_limit, per_user_limit: c.per_user_limit,
      valid_from: c.valid_from.slice(0, 16),
      valid_until: c.valid_until ? c.valid_until.slice(0, 16) : null,
      applicable_cat: c.applicable_cat, is_active: c.is_active,
    })
    setFormError(''); setModalOpen(true)
  }

  async function handleSave() {
    if (!form.code.trim()) { setFormError('쿠폰 코드를 입력하세요'); return }
    if (!form.name.trim()) { setFormError('쿠폰 이름을 입력하세요'); return }
    if (form.discount_value <= 0) { setFormError('할인 값을 입력하세요'); return }
    setSaving(true); setFormError('')

    const payload = {
      ...form,
      code:            form.code.toUpperCase(),
      max_discount_amt: form.max_discount_amt || null,
      usage_limit:     form.usage_limit || null,
      valid_until:     form.valid_until || null,
      applicable_cat:  form.applicable_cat || null,
    }

    const res = await fetch(editId ? `/api/coupons/${editId}` : '/api/coupons', {
      method: editId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    if (!res.ok) { setFormError(json.error ?? '저장 실패'); setSaving(false); return }
    setSaving(false); setModalOpen(false); fetchCoupons()
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch(`/api/coupons/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    })
    fetchCoupons()
  }

  async function handleDelete(id: string) {
    if (!confirm('쿠폰을 삭제하시겠습니까?')) return
    await fetch(`/api/coupons/${id}`, { method: 'DELETE' })
    fetchCoupons()
  }

  // 랜덤 코드 생성
  function generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    const code  = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    setForm(f => ({ ...f, code }))
  }

  return (
    <>
      <Topbar title="쿠폰 관리" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 animate-page">

        {/* 통계 */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <StatCard label="활성 쿠폰"   value={activeCount}            icon="🎫" />
          <StatCard label="만료 쿠폰"   value={expiredCount}           icon="📭" />
          <StatCard label="총 할인 제공" value={formatPrice(totalDiscount)} icon="💸" />
        </div>

        <PageHeader title="쿠폰 목록" subtitle={`총 ${total}개`}>
          <SearchBar placeholder="쿠폰명, 코드 검색..." onSearch={v => { setQ(v); setPage(1) }} />
          <Select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} className="w-32">
            <option value="">전체</option>
            <option value="active">활성</option>
            <option value="expired">만료</option>
            <option value="inactive">비활성</option>
          </Select>
          <Button variant="primary" onClick={openCreate}>+ 쿠폰 등록</Button>
        </PageHeader>

        <Card noPadding>
          <Table>
            <Thead>
              <tr>
                <Th>코드</Th><Th>쿠폰명</Th><Th>할인</Th><Th>조건</Th>
                <Th>사용</Th><Th>유효기간</Th><Th>상태</Th><Th>관리</Th>
              </tr>
            </Thead>
            <Tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <Tr key={i}>{Array.from({ length: 8 }).map((_, j) => (
                      <Td key={j}><div className="h-4 bg-bg-3 rounded animate-pulse w-16" /></Td>
                    ))}</Tr>
                  ))
                : coupons.length === 0
                  ? <EmptyRow colSpan={8} message="쿠폰이 없습니다" />
                  : coupons.map(c => (
                      <Tr key={c.id}>
                        <Td>
                          <span className="font-mono text-xs font-bold text-accent bg-accent/10 px-2 py-1 rounded">
                            {c.code}
                          </span>
                        </Td>
                        <Td>
                          <div className="font-medium text-sm">{c.name}</div>
                          {c.description && <div className="text-xs text-ink-3 line-clamp-1">{c.description}</div>}
                        </Td>
                        <Td>
                          <span className="font-semibold text-sm">
                            {c.discount_type === 'percent'
                              ? `${c.discount_value}%`
                              : formatPrice(c.discount_value)}
                          </span>
                          {c.max_discount_amt && (
                            <div className="text-[11px] text-ink-3">최대 {formatPrice(c.max_discount_amt)}</div>
                          )}
                        </Td>
                        <Td>
                          {c.min_order_amount > 0
                            ? <span className="text-xs text-ink-2">{formatPrice(c.min_order_amount)} 이상</span>
                            : <span className="text-xs text-ink-3">제한 없음</span>}
                        </Td>
                        <Td>
                          <span className="font-mono text-sm">
                            {c.actual_usage_count}
                            {c.usage_limit && <span className="text-ink-3"> / {c.usage_limit}</span>}
                          </span>
                        </Td>
                        <Td>
                          <span className="font-mono text-xs text-ink-3">
                            {c.valid_until ? formatDate(c.valid_until) : '무기한'}
                          </span>
                        </Td>
                        <Td>
                          <Badge variant={STATUS_VARIANT[c.computed_status]}>
                            {STATUS_LABEL[c.computed_status]}
                          </Badge>
                        </Td>
                        <Td>
                          <div className="flex gap-1">
                            <Button size="xs" onClick={() => openEdit(c)}>수정</Button>
                            <Button size="xs" variant={c.is_active ? 'danger' : 'secondary'}
                              onClick={() => toggleActive(c.id, c.is_active)}>
                              {c.is_active ? '비활성' : '활성화'}
                            </Button>
                            <Button size="xs" variant="danger" onClick={() => handleDelete(c.id)}>삭제</Button>
                          </div>
                        </Td>
                      </Tr>
                    ))
              }
            </Tbody>
          </Table>
          <Pagination page={page} total={total} limit={20} onChange={setPage} />
        </Card>
      </div>

      {/* 쿠폰 등록/수정 모달 */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editId ? '쿠폰 수정' : '쿠폰 등록'} size="lg">
        <div className="space-y-3">
          {/* 코드 */}
          <FormField label="쿠폰 코드 *">
            <div className="flex gap-2">
              <Input value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="WELCOME10" className="flex-1 font-mono" />
              <Button size="sm" variant="secondary" onClick={generateCode}>자동 생성</Button>
            </div>
          </FormField>

          <FormField label="쿠폰 이름 *">
            <Input value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="신규 가입 10% 할인" />
          </FormField>

          {/* 할인 유형 / 값 */}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="할인 유형">
              <Select value={form.discount_type}
                onChange={e => setForm(f => ({ ...f, discount_type: e.target.value as DiscountType }))}>
                <option value="percent">비율 할인 (%)</option>
                <option value="fixed">정액 할인 (원)</option>
              </Select>
            </FormField>
            <FormField label={form.discount_type === 'percent' ? '할인율 (%)' : '할인 금액 (원)'} required>
              <Input type="number" value={form.discount_value}
                onChange={e => setForm(f => ({ ...f, discount_value: parseInt(e.target.value) || 0 }))}
                min="1" max={form.discount_type === 'percent' ? 100 : undefined} />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="최소 주문금액 (원)">
              <Input type="number" value={form.min_order_amount}
                onChange={e => setForm(f => ({ ...f, min_order_amount: parseInt(e.target.value) || 0 }))} min="0" />
            </FormField>
            {form.discount_type === 'percent' && (
              <FormField label="최대 할인 금액 (원, 선택)">
                <Input type="number" value={form.max_discount_amt ?? ''}
                  onChange={e => setForm(f => ({ ...f, max_discount_amt: e.target.value ? parseInt(e.target.value) : null }))}
                  placeholder="제한 없으면 비워두세요" min="0" />
              </FormField>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="전체 사용 횟수 제한 (선택)">
              <Input type="number" value={form.usage_limit ?? ''}
                onChange={e => setForm(f => ({ ...f, usage_limit: e.target.value ? parseInt(e.target.value) : null }))}
                placeholder="무제한이면 비워두세요" min="1" />
            </FormField>
            <FormField label="1인당 사용 횟수">
              <Input type="number" value={form.per_user_limit}
                onChange={e => setForm(f => ({ ...f, per_user_limit: parseInt(e.target.value) || 1 }))} min="1" />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="사용 시작일">
              <Input type="datetime-local" value={form.valid_from}
                onChange={e => setForm(f => ({ ...f, valid_from: e.target.value }))} />
            </FormField>
            <FormField label="만료일 (선택)">
              <Input type="datetime-local" value={form.valid_until ?? ''}
                onChange={e => setForm(f => ({ ...f, valid_until: e.target.value || null }))} />
            </FormField>
          </div>

          <FormField label="설명 (선택)">
            <Textarea value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="쿠폰 사용 조건 안내 등" />
          </FormField>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_active" checked={form.is_active}
              onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
              className="w-4 h-4 accent-accent" />
            <label htmlFor="is_active" className="text-sm text-ink-2">쿠폰 활성화</label>
          </div>

          {formError && <p className="text-xs text-red-400">{formError}</p>}
        </div>
        <ModalActions>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>취소</Button>
          <Button variant="primary" loading={saving} onClick={handleSave}>저장</Button>
        </ModalActions>
      </Modal>
    </>
  )
}
