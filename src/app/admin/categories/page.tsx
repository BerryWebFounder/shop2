'use client'
import { useState, useEffect } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { PageHeader, Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal, ModalActions } from '@/components/ui/Modal'
import { FormField, Input } from '@/components/ui/Input'
import type { CategoryTree } from '@/types'

type Level = 1 | 2 | 3
type ModalMode = 'add' | 'edit'

export default function CategoriesPage() {
  const [tree, setTree]           = useState<CategoryTree[]>([])
  const [loading, setLoading]     = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<ModalMode>('add')
  const [editId, setEditId]       = useState<string | null>(null)
  const [saving, setSaving]       = useState(false)
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState({
    name: '', description: '', sort_order: 0,
    level: 1 as Level, parent_id: null as string | null,
  })

  async function fetchTree() {
    setLoading(true)
    const res  = await fetch('/api/categories')
    const json = await res.json()
    setTree(json.data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchTree() }, [])

  function openAddModal(level: Level, parent_id: string | null) {
    setModalMode('add')
    setEditId(null)
    setForm({ name: '', description: '', sort_order: 0, level, parent_id })
    setFormError('')
    setModalOpen(true)
  }

  function openEditModal(id: string, name: string, description: string | null, sort_order: number, level: Level, parent_id: string | null) {
    setModalMode('edit')
    setEditId(id)
    setForm({ name, description: description ?? '', sort_order, level, parent_id })
    setFormError('')
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { setFormError('분류명을 입력하세요.'); return }
    setSaving(true)

    const res = modalMode === 'add'
      ? await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
      : await fetch(`/api/categories/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })

    const json = await res.json()
    if (!res.ok) { setFormError(json.error ?? '저장 실패'); setSaving(false); return }
    setSaving(false)
    setModalOpen(false)
    fetchTree()
  }

  async function handleDelete(id: string) {
    if (!confirm('이 분류를 삭제하시겠습니까?\n하위 분류가 있으면 삭제할 수 없습니다.')) return
    const res  = await fetch(`/api/categories/${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (!res.ok) { alert(json.error); return }
    fetchTree()
  }

  const levelLabel = (l: Level) => l === 1 ? '대분류' : l === 2 ? '중분류' : '소분류'
  const modalTitle = modalMode === 'add'
    ? `${levelLabel(form.level)} 추가`
    : `${levelLabel(form.level)} 수정`

  return (
    <>
      <Topbar title="상품 분류 관리" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 animate-page">
        <PageHeader title="상품 분류 관리" subtitle="대분류 / 중분류 / 소분류를 관리합니다">
          <Button variant="primary" onClick={() => openAddModal(1, null)}>+ 대분류 추가</Button>
        </PageHeader>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-ink-3">
            <span className="w-6 h-6 border-2 border-ink-3 border-t-accent rounded-full animate-spin" />
          </div>
        ) : (
          <Card>
            <CardTitle>🗂️ 분류 트리</CardTitle>
            {tree.length === 0 ? (
              <div className="text-center py-12 text-ink-3 text-sm">분류가 없습니다. 대분류를 추가해주세요.</div>
            ) : (
              <div className="space-y-1">
                {tree.map(cat1 => (
                  <div key={cat1.id}>
                    <CatRow
                      name={cat1.name} level={1}
                      onAdd={() => openAddModal(2, cat1.id)}
                      onEdit={() => openEditModal(cat1.id, cat1.name, cat1.description ?? null, cat1.sort_order, 1, null)}
                      onDelete={() => handleDelete(cat1.id)}
                      addLabel="+ 중분류"
                    />
                    {cat1.children.map(cat2 => (
                      <div key={cat2.id} className="ml-6">
                        <CatRow
                          name={cat2.name} level={2}
                          onAdd={() => openAddModal(3, cat2.id)}
                          onEdit={() => openEditModal(cat2.id, cat2.name, cat2.description ?? null, cat2.sort_order, 2, cat1.id)}
                          onDelete={() => handleDelete(cat2.id)}
                          addLabel="+ 소분류"
                        />
                        {cat2.children.map(cat3 => (
                          <div key={cat3.id} className="ml-6">
                            <CatRow
                              name={cat3.name} level={3}
                              onEdit={() => openEditModal(cat3.id, cat3.name, cat3.description ?? null, cat3.sort_order, 3, cat2.id)}
                              onDelete={() => handleDelete(cat3.id)}
                            />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle} size="sm">
        <FormField label="분류명" required>
          <Input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="분류명 입력"
            autoFocus
          />
        </FormField>
        <FormField label="정렬 순서" className="mt-3">
          <Input
            type="number"
            value={form.sort_order}
            onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
            min="0"
          />
        </FormField>
        <FormField label="설명 (선택)" className="mt-3">
          <Input
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="선택사항"
          />
        </FormField>
        {formError && <p className="text-xs text-red-400 mt-2">{formError}</p>}
        <ModalActions>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>취소</Button>
          <Button variant="primary" loading={saving} onClick={handleSave}>
            {modalMode === 'add' ? '추가' : '저장'}
          </Button>
        </ModalActions>
      </Modal>
    </>
  )
}

function CatRow({ name, level, onAdd, onEdit, onDelete, addLabel }: {
  name: string
  level: 1 | 2 | 3
  onAdd?: () => void
  onEdit: () => void
  onDelete: () => void
  addLabel?: string
}) {
  const icon   = level === 1 ? '📁' : level === 2 ? '📂' : '📄'
  const indent = level > 1 ? 'border-l-2 border-border pl-3' : ''

  return (
    <div className={`flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-bg-3 group transition-colors ${indent}`}>
      <span className="text-sm">{icon}</span>
      <span className="flex-1 text-sm text-ink">{name}</span>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {onAdd && (
          <Button size="xs" variant="secondary" onClick={onAdd}>{addLabel}</Button>
        )}
        <Button size="xs" variant="secondary" onClick={onEdit}>수정</Button>
        <Button size="xs" variant="danger" onClick={onDelete}>삭제</Button>
      </div>
    </div>
  )
}
