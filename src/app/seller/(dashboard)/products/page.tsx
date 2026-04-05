'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  type SellerStore, type SellerProduct, type ProductFormData,
  PRODUCT_STATUS_META, EMPTY_PRODUCT_FORM,
} from '@/lib/types/v2'

interface SellerCategory { id: string; name: string; sort_order: number }

// ── 카테고리 관리 패널 ────────────────────────────────────────────
function CategoryManager({ storeId, categories, onRefresh }: {
  storeId: string
  categories: SellerCategory[]
  onRefresh: () => void
}) {
  const [newName, setNewName] = useState('')
  const [editId, setEditId]   = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [saving, setSaving]   = useState(false)

  async function handleAdd() {
    if (!newName.trim() || saving) return
    setSaving(true)
    const res = await fetch('/api/seller/product-categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ store_id: storeId, name: newName.trim(), sort_order: categories.length }),
    })
    if (res.ok) { setNewName(''); onRefresh() }
    else { const j = await res.json(); alert(j.error) }
    setSaving(false)
  }

  async function handleEdit(id: string) {
    if (!editName.trim()) return
    await fetch(`/api/seller/product-categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim() }),
    })
    setEditId(null); onRefresh()
  }

  async function handleDelete(id: string) {
    if (!confirm('카테고리를 삭제하시겠습니까?\n이 카테고리로 등록된 상품 정보는 유지됩니다.')) return
    await fetch(`/api/seller/product-categories/${id}`, { method: 'DELETE' })
    onRefresh()
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">📂 상품 카테고리 관리</h2>

      {/* 카테고리 목록 */}
      <div className="space-y-1.5 mb-3">
        {categories.length === 0 && (
          <p className="text-xs text-gray-400 py-2">등록된 카테고리가 없습니다.</p>
        )}
        {categories.map(c => (
          <div key={c.id} className="flex items-center gap-2 group">
            {editId === c.id ? (
              <>
                <input value={editName} onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleEdit(c.id)}
                  className="flex-1 px-3 py-1.5 text-sm border border-indigo-300 rounded-lg focus:outline-none"
                  autoFocus />
                <button onClick={() => handleEdit(c.id)}
                  className="text-xs px-2.5 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">저장</button>
                <button onClick={() => setEditId(null)}
                  className="text-xs px-2.5 py-1.5 border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50">취소</button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-gray-800 px-3 py-1.5 bg-gray-50 rounded-lg">{c.name}</span>
                <button onClick={() => { setEditId(c.id); setEditName(c.name) }}
                  className="text-xs text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity hover:text-indigo-800">수정</button>
                <button onClick={() => handleDelete(c.id)}
                  className="text-xs text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-700">삭제</button>
              </>
            )}
          </div>
        ))}
      </div>

      {/* 카테고리 추가 */}
      <div className="flex gap-2">
        <input value={newName} onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="새 카테고리 이름 입력 후 Enter"
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl
            focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
        <button onClick={handleAdd} disabled={saving || !newName.trim()}
          className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors">
          추가
        </button>
      </div>
    </div>
  )
}

// ── 상품 패널 ────────────────────────────────────────────────────
function ProductPanel({ editing, form, setForm, onSave, onClose, saving, categories }: {
  editing:    SellerProduct | null
  form:       ProductFormData
  setForm:    React.Dispatch<React.SetStateAction<ProductFormData>>
  onSave:     () => void
  onClose:    () => void
  saving:     boolean
  categories: SellerCategory[]
}) {
  const [newTag, setNewTag] = useState('')
  const patch = <K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) =>
    setForm(prev => ({ ...prev, [key]: value }))
  const addTag = () => {
    const t = newTag.trim()
    if (t && !form.tags.includes(t)) patch('tags', [...form.tags, t])
    setNewTag('')
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-[560px] bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-gray-900">{editing ? '상품 수정' : '상품 등록'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="flex-1 p-6 space-y-6">
          {/* 기본 정보 */}
          <PanelSection title="기본 정보">
            <PanelField label="상품명 *" value={form.name}
              onChange={v => patch('name', v)} placeholder="상품 이름을 입력하세요" />
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">상품 설명</label>
              <textarea value={form.description} rows={4}
                onChange={e => patch('description', e.target.value)}
                placeholder="상품에 대한 상세 설명을 입력하세요"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none
                  focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
            </div>

            {/* 카테고리 — 드롭다운 */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">카테고리</label>
              {categories.length > 0 ? (
                <select value={form.category} onChange={e => patch('category', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white
                    focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400">
                  <option value="">카테고리 선택</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              ) : (
                <div className="px-3 py-2 text-xs text-gray-400 bg-gray-50 rounded-lg border border-gray-200">
                  위 카테고리 관리에서 먼저 카테고리를 추가해 주세요.
                </div>
              )}
            </div>
          </PanelSection>

          {/* 가격 */}
          <PanelSection title="가격">
            <div className="grid grid-cols-2 gap-3">
              <PanelField label="판매가 *" value={String(form.price)} type="number"
                onChange={v => patch('price', Number(v))} placeholder="0" />
              <PanelField label="정가 (할인 전)"
                value={form.compare_price !== undefined ? String(form.compare_price) : ''}
                type="number"
                onChange={v => patch('compare_price', v ? Number(v) : undefined)}
                placeholder="0" />
            </div>
          </PanelSection>

          {/* 재고 */}
          <PanelSection title="재고">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={form.track_inventory}
                onChange={e => patch('track_inventory', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600" />
              재고 수량 추적
            </label>
            {form.track_inventory && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <PanelField label="재고 수량" value={String(form.stock_quantity)} type="number"
                  onChange={v => patch('stock_quantity', Number(v))} placeholder="0" />
                <PanelField label="부족 알림 기준" value={String(form.low_stock_alert)} type="number"
                  onChange={v => patch('low_stock_alert', Number(v))} placeholder="5" />
              </div>
            )}
          </PanelSection>

          {/* 태그 */}
          <PanelSection title="태그">
            <div className="flex gap-2">
              <input value={newTag} onChange={e => setNewTag(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="태그 입력 후 Enter"
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.tags.map(t => (
                  <span key={t} className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs">
                    {t}
                    <button type="button" onClick={() => patch('tags', form.tags.filter(x => x !== t))}
                      className="hover:text-indigo-900">✕</button>
                  </span>
                ))}
              </div>
            )}
          </PanelSection>

          {/* 판매 상태 */}
          <PanelSection title="판매 상태">
            <div className="grid grid-cols-2 gap-2">
              {(['active', 'draft', 'hidden'] as const).map(s => (
                <button key={s} type="button" onClick={() => patch('status', s)}
                  className={`py-2 px-3 rounded-lg text-sm border transition-all
                    ${form.status === s
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-medium'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  {PRODUCT_STATUS_META[s].label}
                </button>
              ))}
            </div>
          </PanelSection>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
            취소
          </button>
          <button type="button" onClick={onSave} disabled={saving || !form.name}
            className="flex-[2] px-8 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors">
            {saving ? '저장 중...' : editing ? '수정 완료' : '등록하기'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 메인 페이지 ──────────────────────────────────────────────────
export default function SellerProductsPage() {
  const supabase = createClient()
  const [store,      setStore]      = useState<SellerStore | null>(null)
  const [products,   setProducts]   = useState<SellerProduct[]>([])
  const [categories, setCategories] = useState<SellerCategory[]>([])
  const [loading,    setLoading]    = useState(true)
  const [panelOpen,  setPanelOpen]  = useState(false)
  const [editing,    setEditing]    = useState<SellerProduct | null>(null)
  const [form,       setForm]       = useState<ProductFormData>(EMPTY_PRODUCT_FORM)
  const [saving,     setSaving]     = useState(false)

  const fetchProducts = useCallback(async (storeId: string) => {
    const { data } = await supabase
      .from('products').select('*').eq('store_id', storeId)
      .order('created_at', { ascending: false })
    setProducts(data ?? [])
  }, [supabase])

  const fetchCategories = useCallback(async (storeId: string) => {
    const res = await fetch(`/api/seller/product-categories?store_id=${storeId}`)
    const json = await res.json()
    setCategories(json.data ?? [])
  }, [])

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: s } = await supabase
        .from('seller_stores').select('*').eq('owner_id', user.id).single()
      setStore(s)
      if (s) {
        await Promise.all([fetchProducts(s.id), fetchCategories(s.id)])
      }
      setLoading(false)
    })()
  }, [fetchProducts, fetchCategories, supabase])

  const openCreate = () => { setEditing(null); setForm(EMPTY_PRODUCT_FORM); setPanelOpen(true) }
  const openEdit = (p: SellerProduct) => {
    setEditing(p)
    setForm({
      name: p.name, description: p.description ?? '',
      price: p.price, compare_price: p.compare_price ?? undefined,
      cost_price: p.cost_price ?? undefined, category: p.category ?? '',
      tags: p.tags, images: p.images, track_inventory: p.track_inventory,
      stock_quantity: p.stock_quantity, low_stock_alert: p.low_stock_alert ?? 5,
      has_options: p.has_options, options: p.options, variants: p.variants, status: p.status,
    })
    setPanelOpen(true)
  }

  const handleSave = async () => {
    if (!store || !form.name) return
    setSaving(true)
    const payload = { ...form, store_id: store.id }
    const { error } = editing
      ? await supabase.from('products').update(payload).eq('id', editing.id)
      : await supabase.from('products').insert(payload)
    if (error) { alert('저장 실패: ' + error.message) }
    else { setPanelOpen(false); await fetchProducts(store.id) }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!store || !confirm('상품을 삭제하시겠습니까?')) return
    await supabase.from('products').delete().eq('id', id)
    setProducts(prev => prev.filter(p => p.id !== id))
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen text-gray-400 text-sm">불러오는 중...</div>
  )

  const stats = [
    { label: '전체',     count: products.length,                                      color: 'text-gray-700'  },
    { label: '판매 중',  count: products.filter(p => p.status === 'active').length,    color: 'text-green-600' },
    { label: '품절',     count: products.filter(p => p.status === 'sold_out').length,  color: 'text-amber-600' },
    { label: '임시저장', count: products.filter(p => p.status === 'draft').length,     color: 'text-gray-500'  },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">상품 관리</h1>
            <p className="text-gray-500 text-sm mt-0.5">총 {products.length}개 상품</p>
          </div>
          <button onClick={openCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700 transition-colors">
            + 상품 등록
          </button>
        </div>

        {/* 카테고리 관리 */}
        {store && (
          <CategoryManager
            storeId={store.id}
            categories={categories}
            onRefresh={() => fetchCategories(store.id)}
          />
        )}

        {/* 통계 카드 */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {stats.map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-xs text-gray-400">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.count}</p>
            </div>
          ))}
        </div>

        {/* 상품 목록 */}
        {products.length === 0 ? (
          <EmptyState onAdd={openCreate} />
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">상품</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-500">가격</th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-gray-500">재고</th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-gray-500">상태</th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {products.map(p => (
                  <ProductRow key={p.id} product={p}
                    onEdit={() => openEdit(p)} onDelete={() => handleDelete(p.id)} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {panelOpen && (
        <ProductPanel
          editing={editing} form={form} setForm={setForm}
          onSave={handleSave} onClose={() => setPanelOpen(false)}
          saving={saving} categories={categories}
        />
      )}
    </div>
  )
}

// ── 서브 컴포넌트 ─────────────────────────────────────────────────
function ProductRow({ product: p, onEdit, onDelete }: {
  product: SellerProduct; onEdit: () => void; onDelete: () => void
}) {
  const meta = PRODUCT_STATUS_META[p.status]
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden shrink-0">
            {p.images[0]
              ? <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-lg">📦</div>
            }
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{p.name}</p>
            {p.category && <p className="text-xs text-gray-400">{p.category}</p>}
          </div>
        </div>
      </td>
      <td className="py-3 px-4 text-right">
        <p className="text-sm font-semibold text-gray-900">{p.price.toLocaleString()}원</p>
        {p.compare_price && (
          <p className="text-xs text-gray-400 line-through">{p.compare_price.toLocaleString()}원</p>
        )}
      </td>
      <td className="py-3 px-4 text-center">
        <span className={`text-sm font-medium ${p.stock_quantity <= (p.low_stock_alert ?? 5) ? 'text-red-500' : 'text-gray-700'}`}>
          {p.track_inventory ? p.stock_quantity : '∞'}
        </span>
      </td>
      <td className="py-3 px-4 text-center">
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${meta.className}`}>
          {meta.label}
        </span>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2 justify-end">
          <button onClick={onEdit}   className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">수정</button>
          <button onClick={onDelete} className="text-xs text-red-500 hover:text-red-700">삭제</button>
        </div>
      </td>
    </tr>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 flex flex-col items-center justify-center py-20">
      <p className="text-3xl mb-3">📦</p>
      <p className="text-gray-500 text-sm">등록된 상품이 없습니다</p>
      <button onClick={onAdd}
        className="mt-4 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors">
        첫 상품 등록하기
      </button>
    </div>
  )
}

function PanelSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function PanelField({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <input type={type} value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
          focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors" />
    </div>
  )
}
