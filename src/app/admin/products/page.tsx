'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Topbar } from '@/components/layout/Topbar'
import { PageHeader, Card } from '@/components/ui/Card'
import { Table, Thead, Th, Tbody, Tr, Td, EmptyRow } from '@/components/ui/Table'
import { ProductStatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { Select, FormField, Input, Textarea } from '@/components/ui/Input'
import { Pagination } from '@/components/ui/Pagination'
import { Modal, ModalActions } from '@/components/ui/Modal'
import { WysiwygEditor } from '@/components/features/WysiwygEditor'
import { formatPrice, formatDate } from '@/lib/utils'
import type { ProductListItem, CategoryTree } from '@/types'

const LIMIT = 20
const EMPTY_FORM = { name: '', summary: '', description: '', cat1_id: '', cat2_id: '', cat3_id: '', price: 0, sale_price: null as number | null, stock: 0, status: 'sale' as 'sale' | 'stop' | 'soldout' }

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductListItem[]>([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [loading, setLoading]   = useState(true)
  const [q, setQ]               = useState('')
  const [status, setStatus]     = useState('')
  const [categories, setCategories] = useState<CategoryTree[]>([])
  const [modalOpen, setModalOpen]   = useState(false)
  const [editId, setEditId]         = useState<string | null>(null)
  const [form, setForm]             = useState({ ...EMPTY_FORM })
  const [saving, setSaving]         = useState(false)
  const [images, setImages]         = useState<{ file: File; preview: string }[]>([])
  const [uploadingImg, setUploadingImg] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [formError, setFormError]   = useState('')

  // 중분류 선택지
  const subCats = categories.find(c => c.id === form.cat1_id)?.children ?? []
  const smallCats = subCats.find(c => c.id === form.cat2_id)?.children ?? []

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams({ page: String(page), limit: String(LIMIT), q, status })
      const res = await fetch(`/api/products?${p}`)
      const json = await res.json()
      setProducts(json.data ?? [])
      setTotal(json.total ?? 0)
    } finally {
      setLoading(false)
    }
  }, [page, q, status])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(j => setCategories(j.data ?? []))
  }, [])

  const handleSearch = useCallback((v: string) => { setQ(v); setPage(1) }, [])

  function openCreate() {
    setEditId(null)
    setForm({ ...EMPTY_FORM })
    setFormError('')
    setImages([])
    setModalOpen(true)
  }

  async function openEdit(id: string) {
    const res = await fetch(`/api/products/${id}`)
    const json = await res.json()
    const p = json.data
    setEditId(id)
    setForm({
      name: p.name, summary: p.summary ?? '', description: p.description ?? '',
      cat1_id: p.cat1_id ?? '', cat2_id: p.cat2_id ?? '', cat3_id: p.cat3_id ?? '',
      price: p.price, sale_price: p.sale_price ?? null, stock: p.stock, status: p.status,
    })
    setFormError('')
    setImages([])
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { setFormError('상품명을 입력하세요.'); return }
    if (!form.price)       { setFormError('가격을 입력하세요.'); return }
    setSaving(true)
    setFormError('')
    const payload = { ...form, cat1_id: form.cat1_id || null, cat2_id: form.cat2_id || null, cat3_id: form.cat3_id || null, sale_price: form.sale_price || null }
    const res = await fetch(editId ? `/api/products/${editId}` : '/api/products', {
      method: editId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    if (!res.ok) { setFormError(json.error ?? '저장 실패'); setSaving(false); return }

    // 이미지 업로드
    if (images.length > 0) {
      const { id: productId } = json.data
      setUploadingImg(true)
      const supabase = createClient()
      await Promise.all(images.map(async (img, idx) => {
        const ext  = img.file.name.split('.').pop()
        const path = `products/${productId}/${Date.now()}_${idx}.${ext}`
        const { data: uploaded } = await supabase.storage
          .from('product-images').upload(path, img.file, { upsert: true })
        if (uploaded) {
          const { data: pub } = supabase.storage.from('product-images').getPublicUrl(path)
          await supabase.from('product_images').insert({
            product_id: productId,
            storage_path: path,
            public_url: pub.publicUrl,
            sort_order: idx,
            is_main: idx === 0,
          })
        }
      }))
      setUploadingImg(false)
    }

    setSaving(false)
    setModalOpen(false)
    fetchProducts()
  }

  async function handleDelete(id: string) {
    if (!confirm('상품을 삭제하시겠습니까?')) return
    await fetch(`/api/products/${id}`, { method: 'DELETE' })
    fetchProducts()
  }

  return (
    <>
      <Topbar title="상품 관리" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 animate-page">
        <PageHeader title="상품 관리" subtitle={`총 ${total.toLocaleString()}개`}>
          <SearchBar placeholder="상품명, 번호 검색..." onSearch={handleSearch} />
          <Select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} className="w-36">
            <option value="">전체 상태</option>
            <option value="sale">판매중</option>
            <option value="soldout">품절</option>
            <option value="stop">판매중지</option>
          </Select>
          <Button variant="primary" onClick={openCreate}>+ 상품 등록</Button>
        </PageHeader>

        <Card noPadding>
          <Table>
            <Thead>
              <tr>
                <Th>번호</Th><Th>상품명</Th><Th>분류</Th>
                <Th>정가</Th><Th>할인가</Th><Th>재고</Th><Th>상태</Th><Th>등록일</Th><Th>관리</Th>
              </tr>
            </Thead>
            <Tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                  <Tr key={i}>{Array.from({ length: 9 }).map((_, j) => <Td key={j}><div className="h-4 bg-bg-3 rounded animate-pulse w-16" /></Td>)}</Tr>
                ))
                : products.length === 0
                  ? <EmptyRow colSpan={9} message="등록된 상품이 없습니다" />
                  : products.map(p => (
                    <Tr key={p.id}>
                      <Td><span className="font-mono text-xs text-ink-3">{p.serial_no}</span></Td>
                      <Td><span className="font-medium">{p.name}</span></Td>
                      <Td>
                        <div className="flex flex-wrap gap-1">
                          {p.cat1_name && <span className="text-[10px] bg-bg-3 border border-border px-1.5 py-0.5 rounded text-ink-2">{p.cat1_name}</span>}
                          {p.cat2_name && <span className="text-[10px] bg-bg-3 border border-border px-1.5 py-0.5 rounded text-ink-2">{p.cat2_name}</span>}
                        </div>
                      </Td>
                      <Td><span className="font-mono text-xs">{formatPrice(p.price)}</span></Td>
                      <Td><span className="font-mono text-xs text-red-400">{p.sale_price ? formatPrice(p.sale_price) : '-'}</span></Td>
                      <Td><span className={`font-mono text-xs font-bold ${p.stock <= 5 ? 'text-red-400' : 'text-ink'}`}>{p.stock}</span></Td>
                      <Td><ProductStatusBadge status={p.status} /></Td>
                      <Td><span className="font-mono text-xs text-ink-3">{formatDate(p.created_at)}</span></Td>
                      <Td>
                        <div className="flex gap-1">
                          <Button size="xs" onClick={() => openEdit(p.id)}>수정</Button>
                          <Button size="xs" variant="danger" onClick={() => handleDelete(p.id)}>삭제</Button>
                        </div>
                      </Td>
                    </Tr>
                  ))
              }
            </Tbody>
          </Table>
          <Pagination page={page} total={total} limit={LIMIT} onChange={setPage} />
        </Card>
      </div>

      {/* 상품 등록/수정 모달 */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? '상품 수정' : '상품 등록'} size="xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="상품명" required>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="상품명 입력" />
            </FormField>
            <FormField label="판매 상태">
              <Select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as typeof form.status }))}>
                <option value="sale">판매중</option>
                <option value="stop">판매중지</option>
                <option value="soldout">품절</option>
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <FormField label="대분류">
              <Select value={form.cat1_id} onChange={e => setForm(f => ({ ...f, cat1_id: e.target.value, cat2_id: '', cat3_id: '' }))}>
                <option value="">선택</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </FormField>
            <FormField label="중분류">
              <Select value={form.cat2_id} onChange={e => setForm(f => ({ ...f, cat2_id: e.target.value, cat3_id: '' }))} disabled={!form.cat1_id}>
                <option value="">선택</option>
                {subCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </FormField>
            <FormField label="소분류">
              <Select value={form.cat3_id} onChange={e => setForm(f => ({ ...f, cat3_id: e.target.value }))} disabled={!form.cat2_id}>
                <option value="">선택</option>
                {smallCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <FormField label="정가 (원)" required>
              <Input type="number" value={form.price || ''} onChange={e => setForm(f => ({ ...f, price: parseInt(e.target.value) || 0 }))} placeholder="0" min="0" />
            </FormField>
            <FormField label="할인가 (원)">
              <Input type="number" value={form.sale_price ?? ''} onChange={e => setForm(f => ({ ...f, sale_price: e.target.value ? parseInt(e.target.value) : null }))} placeholder="없으면 비워두세요" min="0" />
            </FormField>
            <FormField label="재고 수량">
              <Input type="number" value={form.stock || ''} onChange={e => setForm(f => ({ ...f, stock: parseInt(e.target.value) || 0 }))} placeholder="0" min="0" />
            </FormField>
          </div>

          <FormField label="요약 설명">
            <Input value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} placeholder="목록에 표시될 짧은 설명 (선택)" />
          </FormField>

          {/* 이미지 업로드 */}
          <FormField label="상품 이미지">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {images.map((img, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border group">
                    <img src={img.preview} alt="" className="w-full h-full object-cover" />
                    {i === 0 && (
                      <span className="absolute top-0 left-0 bg-accent text-white text-[9px] px-1 py-0.5">대표</span>
                    )}
                    <button
                      onClick={() => {
                        setImages(prev => {
                          const next = prev.filter((_, j) => j !== i)
                          return next
                        })
                      }}
                      className="absolute top-0 right-0 bg-black/60 text-white text-xs w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >✕</button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-ink-3 hover:border-accent hover:text-accent transition-colors text-xs"
                >
                  <span className="text-xl">+</span>
                  <span>추가</span>
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => {
                  const files = Array.from(e.target.files ?? [])
                  const newImgs = files.map(f => ({ file: f, preview: URL.createObjectURL(f) }))
                  setImages(prev => [...prev, ...newImgs])
                  e.target.value = ''
                }}
              />
              <p className="text-xs text-ink-3">첫 번째 이미지가 대표 이미지로 사용됩니다. 여러 장 선택 가능.</p>
            </div>
          </FormField>

          <FormField label="상품 상세 내용 (WYSIWYG)">
            <WysiwygEditor value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} />
          </FormField>

          {formError && <p className="text-xs text-red-400">{formError}</p>}
        </div>
        <ModalActions>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>취소</Button>
          <Button variant="primary" loading={saving || uploadingImg} onClick={handleSave}>{uploadingImg ? '이미지 업로드 중...' : '저장'}</Button>
        </ModalActions>
      </Modal>
    </>
  )
}
