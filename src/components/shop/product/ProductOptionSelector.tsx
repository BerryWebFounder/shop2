'use client'
import { useState, useEffect } from 'react'
import { formatPrice } from '@/lib/utils'

interface OptionGroup {
  id:     string
  name:   string
  values: Array<{ id: string; value: string }>
}

interface Sku {
  id:               string
  option_combo:     Record<string, string>
  option_combo_text: string
  price_offset:     number
  stock:            number
  is_active:        boolean
}

interface ProductOptionSelectorProps {
  productId:   string
  basePrice:   number
  onSelect:    (sku: Sku | null, totalPrice: number) => void
}

export function ProductOptionSelector({ productId, basePrice, onSelect }: ProductOptionSelectorProps) {
  const [groups,   setGroups]   = useState<OptionGroup[]>([])
  const [skus,     setSkus]     = useState<Sku[]>([])
  const [selected, setSelected] = useState<Record<string, string>>({})
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    fetch(`/api/products/${productId}/options`)
      .then(r => r.json())
      .then(json => {
        setGroups(json.groups ?? [])
        setSkus(json.skus?.filter((s: Sku) => s.is_active) ?? [])
        setLoading(false)
      })
  }, [productId])

  // 현재 선택에 매칭되는 SKU 찾기
  const matchedSku = skus.find(sku =>
    Object.entries(selected).every(([k, v]) => sku.option_combo[k] === v) &&
    Object.keys(sku.option_combo).length === Object.keys(selected).length
  ) ?? null

  const isComplete    = groups.length > 0 && groups.every(g => selected[g.name])
  const totalPrice    = basePrice + (matchedSku?.price_offset ?? 0)
  const selectedStock = matchedSku?.stock ?? 0

  // 옵션 선택 시 부모에게 알림
  useEffect(() => {
    if (isComplete) {
      onSelect(matchedSku, totalPrice)
    } else {
      onSelect(null, basePrice)
    }
  }, [selected, matchedSku, isComplete, totalPrice, basePrice, onSelect])

  function selectOption(groupName: string, value: string) {
    setSelected(prev => ({ ...prev, [groupName]: value }))
  }

  // 해당 값이 선택 가능한지 확인 (다른 그룹의 선택과 조합 가능한 SKU가 있는지)
  function isValueAvailable(groupName: string, value: string): boolean {
    const testSelected = { ...selected, [groupName]: value }
    return skus.some(sku =>
      Object.entries(testSelected).every(([k, v]) => sku.option_combo[k] === v)
    )
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => <div key={i} className="h-14 bg-bg-2 rounded-xl animate-pulse" style={{ background: 'var(--shop-bg2)' }} />)}
      </div>
    )
  }

  if (groups.length === 0) return null

  return (
    <div className="space-y-4">
      {groups.map(group => (
        <div key={group.id}>
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--shop-ink2)' }}>
            {group.name}
            {selected[group.name] && (
              <span className="ml-2 font-normal" style={{ color: 'var(--shop-accent)' }}>
                {selected[group.name]}
              </span>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            {group.values.map(opt => {
              const isSelected  = selected[group.name] === opt.value
              const isAvailable = isValueAvailable(group.name, opt.value)

              return (
                <button
                  key={opt.id}
                  onClick={() => isAvailable && selectOption(group.name, opt.value)}
                  disabled={!isAvailable}
                  className="px-4 py-2 rounded-xl text-sm transition-all disabled:cursor-not-allowed"
                  style={{
                    border:      isSelected
                      ? '2px solid var(--shop-ink)'
                      : '1.5px solid var(--shop-border)',
                    background:  isSelected ? 'var(--shop-ink)' : 'var(--shop-bg)',
                    color:       isSelected ? 'white'
                      : isAvailable ? 'var(--shop-ink)' : 'var(--shop-ink3)',
                    opacity:     isAvailable ? 1 : 0.4,
                    textDecoration: isAvailable ? 'none' : 'line-through',
                  }}
                >
                  {opt.value}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {/* 선택 완료 시 재고/가격 표시 */}
      {isComplete && matchedSku && (
        <div
          className="flex items-center justify-between p-3 rounded-xl"
          style={{ background: 'var(--shop-bg2)', border: '1px solid var(--shop-border)' }}
        >
          <div>
            <p className="text-xs" style={{ color: 'var(--shop-ink3)' }}>
              선택: {matchedSku.option_combo_text}
            </p>
            <p className="text-xs mt-0.5" style={{ color: selectedStock <= 5 && selectedStock > 0 ? 'var(--shop-accent)' : selectedStock === 0 ? 'var(--shop-accent)' : 'var(--shop-ink3)' }}>
              {selectedStock === 0 ? '품절' : selectedStock <= 5 ? `재고 ${selectedStock}개` : '재고 있음'}
            </p>
          </div>
          {matchedSku.price_offset !== 0 && (
            <span className="text-sm font-semibold" style={{ color: 'var(--shop-ink)' }}>
              {matchedSku.price_offset > 0 ? '+' : ''}{formatPrice(matchedSku.price_offset)}
            </span>
          )}
        </div>
      )}

      {isComplete && !matchedSku && (
        <p className="text-xs" style={{ color: 'var(--shop-accent)' }}>
          해당 옵션 조합은 현재 판매하지 않습니다
        </p>
      )}
    </div>
  )
}
