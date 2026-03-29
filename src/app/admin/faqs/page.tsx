'use client'
import { useState, useEffect, useCallback } from 'react'
import { Topbar }       from '@/components/layout/Topbar'
import { PageHeader, Card } from '@/components/ui/Card'
import { Table, Thead, Th, Tbody, Tr, Td, EmptyRow } from '@/components/ui/Table'
import { Badge }        from '@/components/ui/Badge'
import { Button }       from '@/components/ui/Button'
import { Modal, ModalActions } from '@/components/ui/Modal'
import { FormField, Input, Select, Textarea } from '@/components/ui/Input'
import { INQUIRY_CATEGORY_LABEL, type InquiryCategory, type FAQ } from '@/types/cs'

const CATEGORIES = Object.entries(INQUIRY_CATEGORY_LABEL) as [InquiryCategory, string][]
const EMPTY = { category: 'other' as InquiryCategory, question: '', answer: '', sort_order: 0, is_active: true }

export default function AdminFAQsPage() {
  const [faqs, setFaqs]         = useState<FAQ[]>([])
  const [loading, setLoading]   = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId]     = useState<string | null>(null)
  const [form, setForm]         = useState({ ...EMPTY })
  const [saving, setSaving]     = useState(false)
  const [formError, setFormError] = useState('')

  const fetchFaqs = useCallback(async () => {
    setLoading(true)
    const res  = await fetch('/api/faqs?admin=true')
    const json = await res.json()
    setFaqs(json.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchFaqs() }, [fetchFaqs])

  function openCreate() {
    setEditId(null); setForm({ ...EMPTY }); setFormError(''); setModalOpen(true)
  }

  function openEdit(faq: FAQ) {
    setEditId(faq.id)
    setForm({ category: faq.category, question: faq.question, answer: faq.answer, sort_order: faq.sort_order, is_active: faq.is_active })
    setFormError(''); setModalOpen(true)
  }

  async function handleSave() {
    if (!form.question.trim()) { setFormError('질문을 입력하세요'); return }
    if (!form.answer.trim())   { setFormError('답변을 입력하세요'); return }
    setSaving(true); setFormError('')

    const res = await fetch(editId ? `/api/faqs/${editId}` : '/api/faqs', {
      method:  editId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(form),
    })
    const json = await res.json()
    if (!res.ok) { setFormError(json.error ?? '저장 실패'); setSaving(false); return }
    setSaving(false); setModalOpen(false); fetchFaqs()
  }

  async function handleDelete(id: string) {
    if (!confirm('FAQ를 삭제하시겠습니까?')) return
    await fetch(`/api/faqs/${id}`, { method: 'DELETE' })
    fetchFaqs()
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch(`/api/faqs/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    })
    fetchFaqs()
  }

  return (
    <>
      <Topbar title="FAQ 관리" />
      <div className="flex-1 overflow-y-auto p-6 animate-page">
        <PageHeader title="FAQ 관리" subtitle={`총 ${faqs.length}개`}>
          <Button variant="primary" onClick={openCreate}>+ FAQ 등록</Button>
        </PageHeader>

        <Card noPadding>
          <Table>
            <Thead>
              <tr><Th>유형</Th><Th>질문</Th><Th>순서</Th><Th>조회수</Th><Th>상태</Th><Th>관리</Th></tr>
            </Thead>
            <Tbody>
              {loading
                ? Array.from({ length: 4 }).map((_, i) => <Tr key={i}>{Array.from({ length: 6 }).map((_, j) => <Td key={j}><div className="h-4 bg-bg-3 rounded animate-pulse w-20" /></Td>)}</Tr>)
                : faqs.length === 0
                  ? <EmptyRow colSpan={6} message="FAQ가 없습니다" />
                  : faqs.map(faq => (
                    <Tr key={faq.id}>
                      <Td>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-bg-3 text-ink-3">
                          {INQUIRY_CATEGORY_LABEL[faq.category]}
                        </span>
                      </Td>
                      <Td>
                        <div className="text-sm font-medium line-clamp-1 max-w-xs">{faq.question}</div>
                        <div className="text-xs text-ink-3 line-clamp-1 mt-0.5">{faq.answer}</div>
                      </Td>
                      <Td><span className="font-mono text-sm">{faq.sort_order}</span></Td>
                      <Td><span className="font-mono text-sm">{faq.view_count}</span></Td>
                      <Td><Badge variant={faq.is_active ? 'green' : 'gray'}>{faq.is_active ? '공개' : '비공개'}</Badge></Td>
                      <Td>
                        <div className="flex gap-1">
                          <Button size="xs" onClick={() => openEdit(faq)}>수정</Button>
                          <Button size="xs" variant={faq.is_active ? 'secondary' : 'primary'}
                            onClick={() => toggleActive(faq.id, faq.is_active)}>
                            {faq.is_active ? '숨기기' : '공개'}
                          </Button>
                          <Button size="xs" variant="danger" onClick={() => handleDelete(faq.id)}>삭제</Button>
                        </div>
                      </Td>
                    </Tr>
                  ))
              }
            </Tbody>
          </Table>
        </Card>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'FAQ 수정' : 'FAQ 등록'} size="lg">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="카테고리">
              <Select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as InquiryCategory }))}>
                {CATEGORIES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </FormField>
            <FormField label="정렬 순서">
              <Input type="number" value={form.sort_order}
                onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} min="0" />
            </FormField>
          </div>
          <FormField label="질문 *">
            <Input value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} placeholder="자주 묻는 질문 내용" />
          </FormField>
          <FormField label="답변 *">
            <Textarea value={form.answer} onChange={e => setForm(f => ({ ...f, answer: e.target.value }))} rows={5} placeholder="상세한 답변 내용" />
          </FormField>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="faq_active" checked={form.is_active}
              onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4 accent-accent" />
            <label htmlFor="faq_active" className="text-sm text-ink-2">공개</label>
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
