'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function ProfilePage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', phone: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [email, setEmail] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/shop/auth/login?redirect=/shop/account/profile'); return }
      setEmail(user.email ?? '')
      const { data: m } = await supabase.from('members')
        .select('name, phone').eq('email', user.email ?? '').single()
      if (m) setForm({ name: m.name ?? '', phone: m.phone ?? '' })
      setLoading(false)
    })
  }, [router])

  async function handleSave() {
    setSaving(true); setMsg('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('members')
      .update({ name: form.name, phone: form.phone })
      .eq('email', user.email ?? '')
    setMsg(error ? '저장 실패: ' + error.message : '저장됐습니다.')
    setSaving(false)
  }

  const inputCls = `w-full px-4 py-3 rounded-xl text-sm outline-none transition-all`

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><span className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--shop-accent)' }} /></div>

  return (
    <div style={{ maxWidth: 480, margin: '0 auto' }} className="px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/shop/account" className="text-sm" style={{ color: 'var(--shop-ink3)' }}>← 마이페이지</Link>
      </div>
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--shop-ink)', fontFamily: 'var(--font-display)' }}>회원 정보</h1>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--shop-ink2)' }}>이메일 (변경 불가)</label>
          <input value={email} disabled className={inputCls} style={{ background: 'var(--shop-bg2)', color: 'var(--shop-ink3)', border: '1px solid var(--shop-border)' }} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--shop-ink2)' }}>이름</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className={inputCls} style={{ background: 'var(--shop-bg2)', color: 'var(--shop-ink)', border: '1px solid var(--shop-border)' }} placeholder="이름" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--shop-ink2)' }}>연락처</label>
          <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            className={inputCls} style={{ background: 'var(--shop-bg2)', color: 'var(--shop-ink)', border: '1px solid var(--shop-border)' }} placeholder="010-0000-0000" />
        </div>

        {msg && <p className="text-sm text-center py-2 rounded-xl" style={{ background: msg.includes('실패') ? '#fee2e2' : '#d1fae5', color: msg.includes('실패') ? '#dc2626' : '#065f46' }}>{msg}</p>}

        <button onClick={handleSave} disabled={saving}
          className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
          style={{ background: 'var(--shop-ink)', color: 'var(--shop-bg)' }}>
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>
    </div>
  )
}
