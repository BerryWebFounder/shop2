'use client'
import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Input, FormField } from '@/components/ui/Input'
import { formatPrice } from '@/lib/utils'

interface OptionGroup { name: string; values: string[] }
interface Sku {
  id?:               string
  option_combo:      Record<string, string>
  option_combo_text: string
  price_offset:      number
  stock:             number
  sku_code:          string
  is_active:         boolean
}

interface ProductOptionsProps {
  productId:  string
  basePrice:  number
  onSaved?:   () => void
}

// SKU 조합 자동 생성
function generateCombinations(groups: OptionGroup[]): Record<string, string>[] {
  if (groups.length === 0) return []
  const result: Record<string, string>[] = [{}]
  for (const group of groups) {
    const next: Record<string, string>[] = []
    for (const existing of result) {
      for (const value of group.values) {
        next.push({ ...existing, [group.name]: value })
      }
    }
    result.length = 0
    result.push(...next)
  }
  return result
}

export function ProductOptions({ productId, basePrice, onSaved }: ProductOptionsProps) {
  const [groups,  setGroups]  = useState<OptionGroup[]>([])
  const [skus,    setSkus]    = useState<Sku[]>([])
  const [loading, setLoading] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [tab,     setTab]     = useState<'groups' | 'skus'>('groups')

  const fetchOptions = useCallback(async () => {
    setLoading(true)
    const res  = await fetch(`/api/products/${productId}/options`)
    const json = await res.json()
    if (json.groups?.length > 0) {
      setGroups(json.groups.map((g: { name: string; values: Array<{ value: string }> }) => ({
        name:   g.name,
        values: g.values.map((v: { value: string }) => v.value),
      })))
    }
    if (json.skus?.length > 0) setSkus(json.skus)
    setLoading(false)
  }, [productId])

  useEffect(() => { fetchOptions() }, [fetchOptions])

  function addGroup() {
    setGroups(prev => [...prev, { name: '', values: [''] }])
  }

  function updateGroup(idx: number, field: keyof OptionGroup, value: string | string[]) {
    setGroups(prev => prev.map((g, i) => i === idx ? { ...g, [field]: value } : g))
  }

  function removeGroup(idx: number) {
    setGroups(prev => prev.filter((_, i) => i !== idx))
  }

  function addValue(gIdx: number) {
    setGroups(prev => prev.map((g, i) =>
      i === gIdx ? { ...g, values: [...g.values, ''] } : g
    ))
  }

  function updateValue(gIdx: number, vIdx: number, value: string) {
    setGroups(prev => prev.map((g, i) =>
      i === gIdx ? { ...g, values: g.values.map((v, j) => j === vIdx ? value : v) } : g
    ))
  }

  function removeValue(gIdx: number, vIdx: number) {
    setGroups(prev => prev.map((g, i) =>
      i === gIdx ? { ...g, values: g.values.filter((_, j) => j !== vIdx) } : g
    ))
  }

  // SKU 자동 생성
  function generateSkus() {
    const validGroups = groups.filter(g => g.name && g.values.some(v => v))
    const combos      = generateCombinations(validGroups.map(g => ({
      ...g, values: g.values.filter(v => v),
    })))

    setSkus(combos.map(combo => ({
      option_combo:      combo,
      option_combo_text: Object.values(combo).join(' / '),
      price_offset:      0,
      stock:             0,
      sku_code:          '',
      is_active:         true,
    })))
    setTab('skus')
  }

  async function handleSave() {
    setSaving(true)
    const res = await fetch(`/api/products/${productId}/options`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        groups: groups.filter(g => g.name && g.values.some(v => v)),
        skus,
      }),
    })
    const json = await res.json()
    if (!res.ok) { alert(json.error); setSaving(false); return }
    setSaving(false)
    onSaved?.()
    fetchOptions()
  }

  if (loading) return <div className="text-center py-8 text-ink-3">로딩 중...</div>

  return (
    <div>
      {/* 탭 */}
      <div className="flex border-b border-border mb-4">
        {[{ key: 'groups', label: '옵션 그룹' }, { key: 'skus', label: `SKU (${skus.length})` }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key ? 'border-accent text-accent' : 'border-transparent text-ink-3 hover:text-ink-2'
            }`}>{t.label}</button>
        ))}
      </div>

      {tab === 'groups' && (
        <div className="space-y-4">
          {groups.map((group, gIdx) => (
            <div key={gIdx} className="p-4 rounded-xl border border-border bg-bg-3">
              <div className="flex items-center gap-2 mb-3">
                <Input
                  value={group.name}
                  onChange={e => updateGroup(gIdx, 'name', e.target.value)}
                  placeholder="옵션명 (예: 색상)"
                  className="font-medium"
                />
                <Button size="sm" variant="danger" onClick={() => removeGroup(gIdx)}>삭제</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {group.values.map((val, vIdx) => (
                  <div key={vIdx} className="flex items-center gap-1">
                    <Input
                      value={val}
                      onChange={e => updateValue(gIdx, vIdx, e.target.value)}
                      placeholder={`값 ${vIdx + 1}`}
                      className="w-24 text-sm"
                    />
                    {group.values.length > 1 && (
                      <button onClick={() => removeValue(gIdx, vIdx)}
                        className="text-ink-3 hover:text-red-400 text-sm">×</button>
                    )}
                  </div>
                ))}
                <Button size="sm" variant="secondary" onClick={() => addValue(gIdx)}>+ 값 추가</Button>
              </div>
            </div>
          ))}

          <div className="flex gap-2">
            <Button variant="secondary" onClick={addGroup}>+ 옵션 그룹 추가</Button>
            {groups.length > 0 && (
              <Button variant="primary" onClick={generateSkus}>
                SKU 자동 생성 ({generateCombinations(groups.filter(g => g.name).map(g => ({ ...g, values: g.values.filter(v => v) }))).length}개)
              </Button>
            )}
          </div>
        </div>
      )}

      {tab === 'skus' && (
        <div>
          <div className="overflow-x-auto rounded-xl border border-border mb-4">
            <table className="w-full text-sm">
              <thead className="bg-bg-3">
                <tr>
                  <th className="px-3 py-2 text-left text-xs text-ink-3">옵션 조합</th>
                  <th className="px-3 py-2 text-right text-xs text-ink-3">추가 금액</th>
                  <th className="px-3 py-2 text-right text-xs text-ink-3">판매가</th>
                  <th className="px-3 py-2 text-right text-xs text-ink-3">재고</th>
                  <th className="px-3 py-2 text-center text-xs text-ink-3">활성</th>
                </tr>
              </thead>
              <tbody>
                {skus.map((sku, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-3 py-2 font-medium text-ink">{sku.option_combo_text}</td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        value={sku.price_offset}
                        onChange={e => setSkus(prev => prev.map((s, j) => j === i ? { ...s, price_offset: parseInt(e.target.value) || 0 } : s))}
                        className="w-24 text-right text-sm"
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs text-ink-3">
                      {formatPrice(basePrice + sku.price_offset)}
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        value={sku.stock}
                        onChange={e => setSkus(prev => prev.map((s, j) => j === i ? { ...s, stock: parseInt(e.target.value) || 0 } : s))}
                        className="w-20 text-right text-sm"
                        min="0"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input type="checkbox" checked={sku.is_active}
                        onChange={e => setSkus(prev => prev.map((s, j) => j === i ? { ...s, is_active: e.target.checked } : s))}
                        className="w-4 h-4 accent-accent" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-ink-3 mb-4">
            총 재고: {skus.reduce((s, sku) => s + sku.stock, 0).toLocaleString()}개
          </p>
        </div>
      )}

      <Button variant="primary" loading={saving} onClick={handleSave} className="w-full mt-4">
        옵션 저장
      </Button>
    </div>
  )
}
