'use client'
import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { PageHeader, Card } from '@/components/ui/Card'
import { Table, Thead, Th, Tbody, Tr, Td, EmptyRow } from '@/components/ui/Table'
import { EventStatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal, ModalActions } from '@/components/ui/Modal'
import { FormField, Input, Textarea, Select } from '@/components/ui/Input'
import { formatDate } from '@/lib/utils'
import type { ShopEvent } from '@/types'

const EMPTY = { name: '', description: '', start_date: '', end_date: '', status: 'scheduled' as 'scheduled' | 'active' | 'ended' }

export default function EventsPage() {
  const [events, setEvents]   = useState<ShopEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId]   = useState<string | null>(null)
  const [form, setForm]       = useState({ ...EMPTY })
  const [saving, setSaving]   = useState(false)
  const [formError, setFormError] = useState('')

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/events')
    const json = await res.json()
    setEvents(json.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  function openCreate() {
    setEditId(null); setForm({ ...EMPTY }); setFormError(''); setModalOpen(true)
  }

  function openEdit(e: ShopEvent) {
    setEditId(e.id)
    setForm({ name: e.name, description: e.description ?? '', start_date: e.start_date, end_date: e.end_date, status: e.status })
    setFormError(''); setModalOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim())    { setFormError('이벤트명을 입력하세요.'); return }
    if (!form.start_date)     { setFormError('시작일을 입력하세요.'); return }
    if (!form.end_date)       { setFormError('종료일을 입력하세요.'); return }
    if (form.start_date > form.end_date) { setFormError('종료일이 시작일보다 빠릅니다.'); return }
    setSaving(true); setFormError('')
    const res = await fetch(editId ? `/api/events/${editId}` : '/api/events', {
      method: editId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json()
    if (!res.ok) { setFormError(json.error ?? '저장 실패'); setSaving(false); return }
    setSaving(false); setModalOpen(false); fetchEvents()
  }

  async function handleDelete(id: string) {
    if (!confirm('이벤트를 삭제하시겠습니까?')) return
    await fetch(`/api/events/${id}`, { method: 'DELETE' })
    fetchEvents()
  }

  return (
    <>
      <Topbar title="이벤트 관리" />
      <div className="flex-1 overflow-y-auto p-6 animate-page">
        <PageHeader title="이벤트 관리" subtitle="전시 이벤트를 등록 및 관리합니다">
          <Button variant="primary" onClick={openCreate}>+ 이벤트 등록</Button>
        </PageHeader>

        <Card noPadding>
          <Table>
            <Thead>
              <tr><Th>이벤트명</Th><Th>시작일</Th><Th>종료일</Th><Th>상태</Th><Th>관리</Th></tr>
            </Thead>
            <Tbody>
              {loading
                ? Array.from({ length: 3 }).map((_, i) => <Tr key={i}>{Array.from({ length: 5 }).map((_, j) => <Td key={j}><div className="h-4 bg-bg-3 rounded animate-pulse w-24" /></Td>)}</Tr>)
                : events.length === 0
                  ? <EmptyRow colSpan={5} message="등록된 이벤트가 없습니다" />
                  : events.map(e => (
                    <Tr key={e.id}>
                      <Td>
                        <div className="font-medium">{e.name}</div>
                        {e.description && <div className="text-xs text-ink-3 mt-0.5 line-clamp-1">{e.description}</div>}
                      </Td>
                      <Td><span className="font-mono text-xs text-ink-2">{formatDate(e.start_date)}</span></Td>
                      <Td><span className="font-mono text-xs text-ink-2">{formatDate(e.end_date)}</span></Td>
                      <Td><EventStatusBadge status={e.status} /></Td>
                      <Td>
                        <div className="flex gap-1">
                          <Button size="xs" onClick={() => openEdit(e)}>수정</Button>
                          <Button size="xs" variant="danger" onClick={() => handleDelete(e.id)}>삭제</Button>
                        </div>
                      </Td>
                    </Tr>
                  ))
              }
            </Tbody>
          </Table>
        </Card>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? '이벤트 수정' : '이벤트 등록'} size="md">
        <div className="space-y-3">
          <FormField label="이벤트명" required>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="이벤트명 입력" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="시작일" required>
              <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            </FormField>
            <FormField label="종료일" required>
              <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
            </FormField>
          </div>
          <FormField label="상태">
            <Select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as typeof form.status }))}>
              <option value="scheduled">예정</option>
              <option value="active">진행중</option>
              <option value="ended">종료</option>
            </Select>
          </FormField>
          <FormField label="설명">
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="이벤트 설명 (선택)" />
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
