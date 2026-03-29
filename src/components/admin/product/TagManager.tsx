'use client'
import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface Tag { id: string; name: string; color: string; use_count: number }

const PRESET_COLORS = [
  '#4f8ef7','#34d399','#f59e0b','#f87171','#a78bfa',
  '#fb923c','#f472b6','#2dd4bf','#c4503a','#6b7280',
]

// ── 글로벌 태그 관리 (관리자 설정 페이지용) ───────────────────────
export function GlobalTagManager() {
  const [tags,    setTags]    = useState<Tag[]>([])
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#4f8ef7')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  const fetchTags = useCallback(async () => {
    setLoading(true)
    const res  = await fetch('/api/products/tags')
    const json = await res.json()
    setTags(json.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchTags() }, [fetchTags])

  async function createTag() {
    if (!newName.trim()) return
    setCreating(true)
    const res = await fetch('/api/products/tags', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name: newName.trim(), color: newColor }),
    })
    const json = await res.json()
    if (!res.ok) { alert(json.error); setCreating(false); return }
    setNewName('')
    setCreating(false)
    fetchTags()
  }

  if (loading) return <div className="text-center py-4 text-ink-3 text-sm">로딩 중...</div>

  return (
    <div className="space-y-4">
      {/* 태그 생성 */}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Input value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="새 태그 이름" onKeyDown={e => e.key === 'Enter' && createTag()} />
        </div>
        <div className="flex gap-1">
          {PRESET_COLORS.map(c => (
            <button key={c} onClick={() => setNewColor(c)}
              className={`w-6 h-6 rounded-full transition-transform ${newColor === c ? 'scale-125 ring-2 ring-white' : ''}`}
              style={{ background: c }} />
          ))}
        </div>
        <Button size="sm" variant="primary" loading={creating} onClick={createTag}>추가</Button>
      </div>

      {/* 태그 목록 */}
      <div className="flex flex-wrap gap-2">
        {tags.map(tag => (
          <div key={tag.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ background: `${tag.color}20`, color: tag.color, border: `1px solid ${tag.color}40` }}>
            <span>{tag.name}</span>
            <span className="opacity-60 text-[10px]">({tag.use_count})</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 상품 태그 선택 (상품 편집 폼용) ──────────────────────────────
export function ProductTagSelector({
  productId,
  selectedTagIds = [],
  onChange,
}: {
  productId:      string
  selectedTagIds: string[]
  onChange:       (ids: string[]) => void
}) {
  const [tags,    setTags]    = useState<Tag[]>([])
  const [q,       setQ]       = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/products/tags')
      .then(r => r.json())
      .then(j => { setTags(j.data ?? []); setLoading(false) })
  }, [])

  const filtered = tags.filter(t => !q || t.name.includes(q))

  function toggle(id: string) {
    onChange(
      selectedTagIds.includes(id)
        ? selectedTagIds.filter(i => i !== id)
        : [...selectedTagIds, id]
    )
  }

  if (loading) return <div className="text-xs text-ink-3">로딩 중...</div>

  return (
    <div>
      <Input value={q} onChange={e => setQ(e.target.value)} placeholder="태그 검색..." className="mb-2 text-sm" />
      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
        {filtered.map(tag => {
          const selected = selectedTagIds.includes(tag.id)
          return (
            <button key={tag.id} onClick={() => toggle(tag.id)}
              className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
              style={{
                background: selected ? tag.color : `${tag.color}20`,
                color:      selected ? 'white' : tag.color,
                border:     `1px solid ${tag.color}40`,
              }}>
              {selected ? '✓ ' : ''}{tag.name}
            </button>
          )
        })}
        {filtered.length === 0 && <p className="text-xs text-ink-3">태그 없음</p>}
      </div>
    </div>
  )
}

// ── 태그 표시 (상품 카드/목록용) ─────────────────────────────────
export function TagBadges({ tags, max = 3 }: { tags: Array<{ name: string; color: string }>; max?: number }) {
  const shown = tags.slice(0, max)
  const rest  = tags.length - max

  return (
    <div className="flex flex-wrap gap-1">
      {shown.map(tag => (
        <span key={tag.name}
          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
          style={{ background: `${tag.color}20`, color: tag.color }}>
          {tag.name}
        </span>
      ))}
      {rest > 0 && <span className="text-[10px] text-ink-3">+{rest}</span>}
    </div>
  )
}
