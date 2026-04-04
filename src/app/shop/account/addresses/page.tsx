'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Address {
  id: string
  label: string
  recipient: string
  phone: string
  postal_code: string
  address: string
  address_detail: string
  is_default: boolean
}

const EMPTY: Omit<Address, 'id' | 'is_default'> = {
  label: '', recipient: '', phone: '', postal_code: '', address: '', address_detail: '',
}

export default function AddressesPage() {
  const router = useRouter()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY })
  const [saving, setSaving] = useState(false)
  const [memberId, setMemberId] = useState('')

  async function load() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/shop/auth/login?redirect=/shop/account/addresses'); return }
    const { data: m } = await supabase.from('members').select('id').eq('email', user.email ?? '').single()
    if (m) {
      setMemberId(m.id)
      const { data } = await supabase.from('member_addresses')
        .select('*').eq('member_id', m.id).order('is_default', { ascending: false })
      setAddresses(data ?? [])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openNew() { setEditId(null); setForm({ ...EMPTY }); setShowForm(true) }
  function openEdit(a: Address) {
    setEditId(a.id)
    setForm({ label: a.label, recipient: a.recipient, phone: a.phone, postal_code: a.postal_code, address: a.address, address_detail: a.address_detail })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.recipient.trim() || !form.address.trim()) return
    setSaving(true)
    const supabase = createClient()
    if (editId) {
      await supabase.from('member_addresses').update({ ...form }).eq('id', editId)
    } else {
      await supabase.from('member_addresses').insert({ ...form, member_id: memberId, is_default: addresses.length === 0 })
    }
    setShowForm(false); setSaving(false); load()
  }

  async function handleDelete(id: string) {
    if (!confirm('배송지를 삭제하시겠습니까?')) return
    const supabase = createClient()
    await supabase.from('member_addresses').delete().eq('id', id)
    load()
  }

  async function setDefault(id: string) {
    const supabase = createClient()
    await supabase.from('member_addresses').update({ is_default: false }).eq('member_id', memberId)
    await supabase.from('member_addresses').update({ is_default: true }).eq('id', id)
    load()
  }

  const inputCls = `w-full px-4 py-3 rounded-xl text-sm outline-none`
  const inputStyle = { background: 'var(--shop-bg2)', color: 'var(--shop-ink)', border: '1px solid var(--shop-border)' }

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><span className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--shop-accent)' }} /></div>

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }} className="px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/shop/account" className="text-sm" style={{ color: 'var(--shop-ink3)' }}>← 마이페이지</Link>
      </div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--shop-ink)', fontFamily: 'var(--font-display)' }}>배송지 관리</h1>
        <button onClick={openNew}
          className="text-sm px-4 py-2 rounded-xl font-medium"
          style={{ background: 'var(--shop-ink)', color: 'var(--shop-bg)' }}>
          + 추가
        </button>
      </div>

      {/* 배송지 폼 */}
      {showForm && (
        <div className="rounded-2xl p-5 mb-5" style={{ background: 'var(--shop-bg2)', border: '1px solid var(--shop-border)' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--shop-ink)' }}>
            {editId ? '배송지 수정' : '새 배송지'}
          </h2>
          <div className="space-y-3">
            <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              className={inputCls} style={inputStyle} placeholder="배송지 이름 (예: 집, 회사)" />
            <div className="grid grid-cols-2 gap-3">
              <input value={form.recipient} onChange={e => setForm(f => ({ ...f, recipient: e.target.value }))}
                className={inputCls} style={inputStyle} placeholder="수령인 *" />
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className={inputCls} style={inputStyle} placeholder="연락처" />
            </div>
            <input value={form.postal_code} onChange={e => setForm(f => ({ ...f, postal_code: e.target.value }))}
              className={inputCls} style={inputStyle} placeholder="우편번호" />
            <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              className={inputCls} style={inputStyle} placeholder="주소 *" />
            <input value={form.address_detail} onChange={e => setForm(f => ({ ...f, address_detail: e.target.value }))}
              className={inputCls} style={inputStyle} placeholder="상세 주소" />
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => setShowForm(false)}
              className="flex-1 py-3 rounded-xl text-sm" style={{ background: 'var(--shop-bg3)', color: 'var(--shop-ink2)' }}>
              취소
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-[2] py-3 rounded-xl text-sm font-semibold disabled:opacity-60"
              style={{ background: 'var(--shop-ink)', color: 'var(--shop-bg)' }}>
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      )}

      {/* 배송지 목록 */}
      {addresses.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--shop-ink3)' }}>
          <p className="text-4xl mb-3">📍</p>
          <p className="text-sm">등록된 배송지가 없습니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {addresses.map(a => (
            <div key={a.id} className="rounded-2xl p-4" style={{ background: 'var(--shop-bg2)', border: a.is_default ? '1.5px solid var(--shop-accent)' : '1px solid var(--shop-border)' }}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {a.label && <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--shop-bg3)', color: 'var(--shop-ink2)' }}>{a.label}</span>}
                  {a.is_default && <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--shop-accent)', color: 'white' }}>기본</span>}
                </div>
                <div className="flex gap-2">
                  {!a.is_default && (
                    <button onClick={() => setDefault(a.id)} className="text-xs" style={{ color: 'var(--shop-accent)' }}>기본 설정</button>
                  )}
                  <button onClick={() => openEdit(a)} className="text-xs" style={{ color: 'var(--shop-ink3)' }}>수정</button>
                  <button onClick={() => handleDelete(a.id)} className="text-xs" style={{ color: '#ef4444' }}>삭제</button>
                </div>
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--shop-ink)' }}>{a.recipient} {a.phone && <span className="font-normal" style={{ color: 'var(--shop-ink3)' }}>· {a.phone}</span>}</p>
              <p className="text-sm" style={{ color: 'var(--shop-ink2)' }}>{a.postal_code && `(${a.postal_code}) `}{a.address} {a.address_detail}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
