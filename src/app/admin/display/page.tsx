'use client'
import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { PageHeader, Card } from '@/components/ui/Card'
import { Table, Thead, Th, Tbody, Tr, Td, EmptyRow } from '@/components/ui/Table'
import { Badge, EventStatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select, FormField, Input } from '@/components/ui/Input'
import { Modal, ModalActions } from '@/components/ui/Modal'
import { formatDate } from '@/lib/utils'
import type { DisplayItem, ShopEvent } from '@/types'

const EMPTY_FORM = { product_id: '', event_id: null as string | null, display_type: 'default' as 'default' | 'event', start_date: '', end_date: '', sort_order: 0 }

export default function DisplayPage() {
  const [items, setItems]     = useState<DisplayItem[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('')
  const [products, setProducts]     = useState<{ id: string; name: string }[]>([])
  const [events, setEvents]         = useState<ShopEvent[]>([])
  const [modalOpen, setModalOpen]   = useState(false)
  const [form, setForm]             = useState({ ...EMPTY_FORM })
  const [saving, setSaving]         = useState(false)
  const [formError, setFormError]   = useState('')

  const fetchItems = useCallback(async () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (typeFilter) p.set('type', typeFilter)
    const res = await fetch(`/api/display?${p}`)
    const json = await res.json()
    setItems(json.data ?? [])
    setLoading(false)
  }, [typeFilter])

  useEffect(() => { fetchItems() }, [fetchItems])

  useEffect(() => {
    fetch('/api/products?limit=100').then(r => r.json()).then(j => setProducts((j.data ?? []).map((p: { id: string; name: string }) => ({ id: p.id, name: p.name }))))
    fetch('/api/events').then(r => r.json()).then(j => setEvents(j.data ?? []))
  }, [])

  function openCreate() {
    setForm({ ...EMPTY_FORM }); setFormError(''); setModalOpen(true)
  }

  async function handleSave() {
    if (!form.product_id) { setFormError('상품을 선택하세요.'); return }
    if (form.display_type === 'event' && !form.event_id) { setFormError('이벤트를 선택하세요.'); return }
    if (!form.start_date || !form.end_date) { setFormError('전시 기간을 입력하세요.'); return }
    setSaving(true); setFormError('')
    const res = await fetch('/api/display', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, event_id: form.display_type === 'event' ? form.event_id : null }),
    })
    const json = await res.json()
    if (!res.ok) { setFormError(json.error ?? '저장 실패'); setSaving(false); return }
    setSaving(false); setModalOpen(false); fetchItems()
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch(`/api/display/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    })
    fetchItems()
  }

  async function handleDelete(id: string) {
    if (!confirm('전시를 삭제하시겠습니까?')) return
    await fetch(`/api/display/${id}`, { method: 'DELETE' })
    fetchItems()
  }

  return (
    <>
      <Topbar title="전시 관리" />
      <div className="flex-1 overflow-y-auto p-6 animate-page">
        <PageHeader title="전시 관리" subtitle="쇼핑몰에 전시할 상품을 관리합니다">
          <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="w-36">
            <option value="">전체</option>
            <option value="default">기본 전시</option>
            <option value="event">이벤트 전시</option>
          </Select>
          <Button variant="primary" onClick={openCreate}>+ 전시 상품 등록</Button>
        </PageHeader>

        <Card noPadding>
          <Table>
            <Thead>
              <tr>
                <Th>유형</Th><Th>이벤트</Th><Th>상품명</Th>
                <Th>전시 기간</Th><Th>순서</Th><Th>상태</Th><Th>관리</Th>
              </tr>
            </Thead>
            <Tbody>
              {loading
                ? Array.from({ length: 4 }).map((_, i) => <Tr key={i}>{Array.from({ length: 7 }).map((_, j) => <Td key={j}><div className="h-4 bg-bg-3 rounded animate-pulse w-20" /></Td>)}</Tr>)
                : items.length === 0
                  ? <EmptyRow colSpan={7} message="전시 상품이 없습니다" />
                  : items.map(item => (
                    <Tr key={item.id}>
                      <Td>
                        {item.display_type === 'default'
                          ? <Badge variant="blue">기본</Badge>
                          : <Badge variant="purple">이벤트</Badge>}
                      </Td>
                      <Td>
                        {item.event
                          ? <div>
                              <div className="text-xs font-medium">{item.event.name}</div>
                              <EventStatusBadge status={item.event.status} />
                            </div>
                          : <span className="text-ink-3 text-xs">-</span>}
                      </Td>
                      <Td>
                        <div className="font-medium text-sm">{item.product?.name ?? '-'}</div>
                        <div className="text-[10px] text-ink-3 font-mono">{item.product?.serial_no}</div>
                      </Td>
                      <Td>
                        <span className="font-mono text-xs text-ink-2">
                          {formatDate(item.start_date)} ~ {formatDate(item.end_date)}
                        </span>
                      </Td>
                      <Td><span className="font-mono text-xs">{item.sort_order}</span></Td>
                      <Td>
                        {item.is_active
                          ? <Badge variant="green">전시중</Badge>
                          : <Badge variant="gray">비전시</Badge>}
                      </Td>
                      <Td>
                        <div className="flex gap-1">
                          <Button size="xs" onClick={() => toggleActive(item.id, item.is_active)}>
                            {item.is_active ? '중단' : '전시'}
                          </Button>
                          <Button size="xs" variant="danger" onClick={() => handleDelete(item.id)}>삭제</Button>
                        </div>
                      </Td>
                    </Tr>
                  ))
              }
            </Tbody>
          </Table>
        </Card>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="전시 상품 등록" size="md">
        <div className="space-y-3">
          <FormField label="전시 유형">
            <Select value={form.display_type} onChange={e => setForm(f => ({ ...f, display_type: e.target.value as 'default' | 'event', event_id: null }))}>
              <option value="default">기본 전시</option>
              <option value="event">이벤트 전시</option>
            </Select>
          </FormField>

          {form.display_type === 'event' && (
            <FormField label="이벤트 선택" required>
              <Select value={form.event_id ?? ''} onChange={e => setForm(f => ({ ...f, event_id: e.target.value || null }))}>
                <option value="">이벤트 선택...</option>
                {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </Select>
            </FormField>
          )}

          <FormField label="상품 선택" required>
            <Select value={form.product_id} onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))}>
              <option value="">상품 선택...</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="전시 시작일" required>
              <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            </FormField>
            <FormField label="전시 종료일" required>
              <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
            </FormField>
          </div>

          <FormField label="정렬 순서">
            <Input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} min="0" />
          </FormField>

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
