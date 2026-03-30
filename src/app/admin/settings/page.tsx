'use client'
import { useState, useEffect } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { PageHeader, Card, CardTitle, Notice } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { FormField, Input, Select } from '@/components/ui/Input'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const [store, setStore] = useState({ store_name: '', biz_no: '', address: '', phone: '', email: '', dormant_days: 365, data_keep_years: 4 })
  const [saving, setSaving]       = useState(false)
  const [storeMsg, setStoreMsg]   = useState('')
  const [storeErr, setStoreErr]   = useState('')

  const [pwForm, setPwForm] = useState({ new_password: '', confirm_password: '' })
  const [pwLoading, setPwLoading] = useState(false)
  const [pwMsg, setPwMsg]         = useState('')
  const [pwErr, setPwErr]         = useState('')

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(j => {
      if (j.data) setStore({
        store_name: j.data.store_name ?? '',
        biz_no: j.data.biz_no ?? '',
        address: j.data.address ?? '',
        phone: j.data.phone ?? '',
        email: j.data.email ?? '',
        dormant_days: j.data.dormant_days ?? 365,
        data_keep_years: j.data.data_keep_years ?? 4,
      })
    })
  }, [])

  async function saveStore() {
    setSaving(true); setStoreMsg(''); setStoreErr('')
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(store),
    })
    const json = await res.json()
    if (!res.ok) { setStoreErr(json.error ?? '저장 실패') } else { setStoreMsg('저장되었습니다.') }
    setSaving(false)
  }

  async function changePassword() {
    setPwErr(''); setPwMsg('')
    if (!pwForm.new_password || pwForm.new_password.length < 8) { setPwErr('새 비밀번호는 8자 이상이어야 합니다.'); return }
    if (pwForm.new_password !== pwForm.confirm_password) { setPwErr('비밀번호가 일치하지 않습니다.'); return }
    setPwLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: pwForm.new_password })
    if (error) { setPwErr(error.message) } else { setPwMsg('비밀번호가 변경되었습니다.'); setPwForm({ new_password: '', confirm_password: '' }) }
    setPwLoading(false)
  }

  return (
    <>
      <Topbar title="설정 관리" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 animate-page">
        <PageHeader title="설정 관리" subtitle="쇼핑몰 기본 정보 및 관리자 계정을 관리합니다" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* 쇼핑몰 정보 */}
          <Card>
            <CardTitle>🏪 쇼핑몰 정보</CardTitle>
            <div className="space-y-3">
              <FormField label="상호명" required>
                <Input value={store.store_name} onChange={e => setStore(s => ({ ...s, store_name: e.target.value }))} placeholder="상호명 입력" />
              </FormField>
              <FormField label="사업자등록번호">
                <Input value={store.biz_no} onChange={e => setStore(s => ({ ...s, biz_no: e.target.value }))} placeholder="000-00-00000" />
              </FormField>
              <FormField label="사업장 소재지">
                <Input value={store.address} onChange={e => setStore(s => ({ ...s, address: e.target.value }))} placeholder="주소 입력" />
              </FormField>
              <FormField label="대표 연락처">
                <Input value={store.phone} onChange={e => setStore(s => ({ ...s, phone: e.target.value }))} placeholder="02-0000-0000" />
              </FormField>
              <FormField label="대표 이메일">
                <Input type="email" value={store.email} onChange={e => setStore(s => ({ ...s, email: e.target.value }))} placeholder="admin@shop.com" />
              </FormField>
              {storeMsg && <p className="text-xs text-green-400">{storeMsg}</p>}
              {storeErr && <p className="text-xs text-red-400">{storeErr}</p>}
              <Button variant="primary" loading={saving} onClick={saveStore}>저장</Button>
            </div>
          </Card>

          {/* 관리자 계정 */}
          <Card>
            <CardTitle>🔐 관리자 비밀번호 변경</CardTitle>
            <p className="text-xs text-ink-3 mb-4">Supabase Auth를 통해 비밀번호를 변경합니다.</p>
            <div className="space-y-3">
              <FormField label="새 비밀번호">
                <Input type="password" value={pwForm.new_password} onChange={e => setPwForm(f => ({ ...f, new_password: e.target.value }))} placeholder="8자 이상" />
              </FormField>
              <FormField label="새 비밀번호 확인">
                <Input type="password" value={pwForm.confirm_password} onChange={e => setPwForm(f => ({ ...f, confirm_password: e.target.value }))} placeholder="새 비밀번호 재입력" />
              </FormField>
              {pwMsg && <p className="text-xs text-green-400">{pwMsg}</p>}
              {pwErr && <p className="text-xs text-red-400">{pwErr}</p>}
              <Button variant="primary" loading={pwLoading} onClick={changePassword}>비밀번호 변경</Button>
            </div>
          </Card>
        </div>

        {/* 개인정보 정책 */}
        <Card>
          <CardTitle>📋 개인정보 보호 정책</CardTitle>
          <Notice variant="info">
            개인정보보호법 및 KISA(한국인터넷진흥원) 기준에 따라 아래 설정이 적용됩니다.
            Supabase RLS와 연동하여 휴면 회원 정보를 별도 처리하며, Vercel Cron Jobs로 매일 자정 자동 전환됩니다.
          </Notice>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="휴면 전환 기준 (미접속 일수)">
              <Select value={store.dormant_days} onChange={e => setStore(s => ({ ...s, dormant_days: parseInt(e.target.value) }))}>
                <option value={365}>365일 (1년, KISA 권장)</option>
                <option value={180}>180일 (6개월)</option>
              </Select>
            </FormField>
            <FormField label="개인정보 보존 기간 (휴면 후)">
              <Select value={store.data_keep_years} onChange={e => setStore(s => ({ ...s, data_keep_years: parseInt(e.target.value) }))}>
                <option value={4}>4년 (전자상거래법 기준)</option>
                <option value={5}>5년</option>
                <option value={3}>3년</option>
              </Select>
            </FormField>
          </div>
          <Button variant="secondary" loading={saving} onClick={saveStore} className="mt-4">정책 저장</Button>
        </Card>

        {/* Supabase 연동 안내 */}
        <Card className="mt-4">
          <CardTitle>🔗 Supabase / Vercel 연동 안내</CardTitle>
          <div className="space-y-2 text-xs text-ink-2 leading-relaxed">
            <p>환경 변수는 <span className="font-mono bg-bg-3 px-1 py-0.5 rounded">.env.local</span> 또는 Vercel Dashboard → Settings → Environment Variables에서 설정하세요.</p>
            <div className="grid grid-cols-1 gap-1 mt-3 font-mono text-[11px]">
              {[
                ['NEXT_PUBLIC_SUPABASE_URL', 'https://xxxx.supabase.co'],
                ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'eyJ... (anon key)'],
                ['SUPABASE_SERVICE_ROLE_KEY', 'eyJ... (service role, 서버 전용)'],
                ['CRON_SECRET', '임의의 보안 문자열 (Cron 인증용)'],
              ].map(([key, val]) => (
                <div key={key} className="flex gap-2 bg-bg-3 rounded px-3 py-2">
                  <span className="text-accent shrink-0">{key}</span>
                  <span className="text-ink-3">=</span>
                  <span className="text-ink-2">{val}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </>
  )
}
