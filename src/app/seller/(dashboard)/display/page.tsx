'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface DisplayItem {
  id: string
  sort_order: number
  is_active: boolean
  start_date: string
  end_date: string
  product: { id: string; name: string; price: number; sale_price: number | null }
}

interface Product {
  id: string
  name: string
  price: number
  sale_price: number | null
  status: string
}

export default function SellerDisplayPage() {
  const [items, setItems]       = useState<DisplayItem[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading]   = useState(true)
  const [storeId, setStoreId]   = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    product_id: '', start_date: '', end_date: '', sort_order: 0,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const today = new Date().toISOString().slice(0, 10)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 내 상점
    const { data: store } = await supabase
      .from('seller_stores').select('id').eq('owner_id', user.id).single()
    if (!store) { setLoading(false); return }
    setStoreId(store.id)

    // 내 상품
    const { data: myProducts } = await supabase
      .from('products').select('id, name, price, sale_price, status')
      .eq('store_id', store.id).eq('status', 'sale').order('created_at', { ascending: false })
    setProducts(myProducts ?? [])

    // 전시 중인 상품
    const { data: displayData } = await supabase
      .from('display_items')
      .select('id, sort_order, is_active, start_date, end_date, product:products(id, name, price, sale_price)')
      .in('product_id', (myProducts ?? []).map(p => p.id))
      .order('sort_order')
    setItems(displayData as unknown as DisplayItem[] ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleAdd() {
    if (!form.product_id || !form.start_date || !form.end_date) {
      setError('상품, 시작일, 종료일을 모두 입력하세요.'); return
    }
    setSaving(true); setError('')
    const supabase = createClient()
    const { error: e } = await supabase.from('display_items').insert({
      product_id:   form.product_id,
      display_type: 'default',
      start_date:   form.start_date,
      end_date:     form.end_date,
      sort_order:   form.sort_order,
      is_active:    true,
    })
    if (e) { setError(e.message); setSaving(false); return }
    setShowForm(false)
    setForm({ product_id: '', start_date: '', end_date: '', sort_order: 0 })
    setSaving(false)
    load()
  }

  async function toggleActive(id: string, cur: boolean) {
    const supabase = createClient()
    await supabase.from('display_items').update({ is_active: !cur }).eq('id', id)
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('전시에서 제거하시겠습니까?')) return
    const supabase = createClient()
    await supabase.from('display_items').delete().eq('id', id)
    load()
  }

  const fmtDate = (d: string) => d?.slice(0, 10) ?? ''

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><span className="w-6 h-6 border-2 border-t-transparent border-indigo-500 rounded-full animate-spin" /></div>

  if (!storeId) return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <p className="text-gray-500">승인된 상점이 없습니다.</p>
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">전시 관리</h1>
          <p className="text-sm text-gray-500 mt-1">전시 등록된 상품만 쇼핑몰에 노출됩니다</p>
        </div>
        <button onClick={() => { setShowForm(true); setError('') }}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors">
          + 전시 등록
        </button>
      </div>

      {/* 등록 폼 */}
      {showForm && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">새 전시 등록</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">상품 선택 *</label>
              <select value={form.product_id} onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white">
                <option value="">상품을 선택하세요</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {products.length === 0 && <p className="text-xs text-red-500 mt-1">등록된 판매중 상품이 없습니다.</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">전시 시작일 *</label>
                <input type="date" value={form.start_date} min={today}
                  onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">전시 종료일 *</label>
                <input type="date" value={form.end_date} min={form.start_date || today}
                  onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">정렬 순서 (낮을수록 앞)</label>
              <input type="number" value={form.sort_order} min={0}
                onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
            </div>
          </div>
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
          <div className="flex gap-2 mt-4">
            <button onClick={() => setShowForm(false)}
              className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50">
              취소
            </button>
            <button onClick={handleAdd} disabled={saving}
              className="flex-[2] py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-60">
              {saving ? '등록 중...' : '전시 등록'}
            </button>
          </div>
        </div>
      )}

      {/* 전시 목록 */}
      {items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🖼️</p>
          <p className="text-sm">전시 중인 상품이 없습니다</p>
          <p className="text-xs mt-1">상품을 등록하면 쇼핑몰 메인에 노출됩니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => {
            const isExpired = item.end_date < today
            const isPending = item.start_date > today
            const statusLabel = !item.is_active ? '비활성' : isExpired ? '종료됨' : isPending ? '예정' : '전시중'
            const statusColor = !item.is_active ? 'bg-gray-100 text-gray-500'
              : isExpired ? 'bg-red-100 text-red-600'
              : isPending ? 'bg-yellow-100 text-yellow-700'
              : 'bg-green-100 text-green-700'
            return (
              <div key={item.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.product?.name}</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColor}`}>
                      {statusLabel}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{fmtDate(item.start_date)} ~ {fmtDate(item.end_date)}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => toggleActive(item.id, item.is_active)}
                    className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${item.is_active ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'}`}>
                    {item.is_active ? '숨기기' : '활성화'}
                  </button>
                  <button onClick={() => handleDelete(item.id)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                    삭제
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
