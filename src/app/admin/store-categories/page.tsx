'use client'
import { useState, useEffect } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { PageHeader, Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal, ModalActions } from '@/components/ui/Modal'
import { FormField, Input } from '@/components/ui/Input'

interface StoreCategory {
  id: string
  name: string
  sort_order: number
  is_active: boolean
}

export default function StoreCategoriesPage() {
  const [cats, setCats]       = useState<StoreCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId]   = useState<string | null>(null)
  const [form, setForm]       = useState({ name: '', sort_order: 0 })
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  async function load() {
    const res = await fetch('/api/admin/store-categories')
    const json = await res.json()
    setCats(json.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setEditId(null)
    setForm({ name: '', sort_order: cats.length })
    setError('')
    setModalOpen(true)
  }

  function openEdit(c: StoreCategory) {
    setEditId(c.id)
    setForm({ name: c.name, sort_order: c.sort_order })
    setError('')
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('카테고리명을 입력하세요.'); return }
    setSaving(true)
    const res = editId
      ? await fetch(`/api/admin/store-categories/${editId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
      : await fetch('/api/admin/store-categories', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? '저장 실패'); setSaving(false); return }
    setSaving(false); setModalOpen(false); load()
  }

  async function toggleActive(id: string, cur: boolean) {
    await fetch(`/api/admin/store-categories/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !cur }),
    })
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('삭제하시겠습니까?')) return
    await fetch(`/api/admin/store-categories/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <>
      <Topbar title="상점 카테고리 관리" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 animate-page">
        <PageHeader title="상점 카테고리" subtitle="상점 개설 신청 시 선택 가능한 카테고리를 관리합니다">
          <Button variant="primary" onClick={openCreate}>+ 카테고리 추가</Button>
        </PageHeader>
        <Card>
          <CardTitle>카테고리 목록</CardTitle>
          {loading ? (
            <div className="flex justify-center py-12">
              <span className="w-6 h-6 border-2 border-ink-3 border-t-accent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-1">
              {cats.length === 0 ? (
                <p className="text-sm text-ink-3 text-center py-8">카테고리가 없습니다.</p>
              ) : cats.map(c => (
                <div key={c.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-bg-3 group transition-colors">
                  <span className="text-sm text-ink-3 w-6 text-right">{c.sort_order}</span>
                  <span className={`flex-1 text-sm font-medium ${!c.is_active ? 'line-through text-ink-3' : 'text-ink'}`}>
                    {c.name}
                  </span>
                  {!c.is_active && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-3 text-ink-3">비활성</span>
                  )}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="xs" variant="secondary" onClick={() => openEdit(c)}>수정</Button>
                    <Button size="xs" variant="secondary" onClick={() => toggleActive(c.id, c.is_active)}>
                      {c.is_active ? '숨기기' : '활성화'}
                    </Button>
                    <Button size="xs" variant="danger" onClick={() => handleDelete(c.id)}>삭제</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editId ? '카테고리 수정' : '카테고리 추가'} size="sm">
        <FormField label="카테고리명" required>
          <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="예: 패션/의류" autoFocus />
        </FormField>
        <FormField label="정렬 순서" className="mt-3">
          <Input type="number" value={form.sort_order}
            onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} min="0" />
        </FormField>
        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
        <ModalActions>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>취소</Button>
          <Button variant="primary" loading={saving} onClick={handleSave}>저장</Button>
        </ModalActions>
      </Modal>
    </>
  )
}
