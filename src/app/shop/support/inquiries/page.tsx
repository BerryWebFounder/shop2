import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  INQUIRY_CATEGORY_LABEL, INQUIRY_STATUS_LABEL, INQUIRY_STATUS_VARIANT,
  type InquiryStatus,
  type InquiryCategory
} from '@/types/cs'
import { formatDateTime } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'

export default async function MyInquiriesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/shop/auth/login?redirect=/shop/support/inquiries')

  const { data: member } = await supabase
    .from('members').select('id').eq('email', user.email ?? '').single()

  const { data: inquiries } = await supabase
    .from('inquiries')
    .select('id, category, title, status, created_at, admin_replied_at')
    .eq('member_id', member?.id ?? '')
    .order('created_at', { ascending: false })

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }} className="px-4 sm:px-6 md:px-8 py-8 md:py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl" style={{ fontFamily: 'var(--font-display)', color: 'var(--shop-ink)' }}>
          내 문의 내역
        </h1>
        <Link href="/shop/support"
          className="px-5 py-2.5 rounded-full text-sm font-semibold transition-all"
          style={{ background: 'var(--shop-ink)', color: 'white' }}>
          + 문의하기
        </Link>
      </div>

      {!inquiries || inquiries.length === 0 ? (
        <div className="text-center py-20" style={{ color: 'var(--shop-ink3)' }}>
          <p className="text-5xl mb-4">💬</p>
          <p className="text-base mb-2" style={{ color: 'var(--shop-ink2)' }}>문의 내역이 없습니다</p>
          <Link href="/shop/support"
            className="inline-block mt-4 px-6 py-2.5 rounded-full text-sm font-semibold"
            style={{ background: 'var(--shop-ink)', color: 'white' }}>
            문의하기
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {inquiries.map(q => (
            <Link key={q.id} href={`/shop/support/inquiries/${q.id}`}
              className="flex items-start justify-between p-5 rounded-2xl transition-colors hover:opacity-90"
              style={{ border: '1.5px solid var(--shop-border)', background: 'var(--shop-bg)', display: 'flex' }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{ background: 'var(--shop-bg2)', color: 'var(--shop-ink3)' }}>
                    {INQUIRY_CATEGORY_LABEL[q.category as InquiryCategory] ?? q.category}
                  </span>
                  <Badge variant={INQUIRY_STATUS_VARIANT[q.status as InquiryStatus]}>
                    {INQUIRY_STATUS_LABEL[q.status as InquiryStatus]}
                  </Badge>
                </div>
                <p className="text-sm font-medium line-clamp-1 mb-1" style={{ color: 'var(--shop-ink)' }}>
                  {q.title}
                </p>
                <p className="text-xs" style={{ color: 'var(--shop-ink3)' }}>
                  {formatDateTime(q.created_at)}
                  {q.admin_replied_at && (
                    <span className="ml-2" style={{ color: '#34d399' }}>· 답변 완료</span>
                  )}
                </p>
              </div>
              <span className="text-ink-3 ml-4 mt-1 flex-shrink-0">›</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
