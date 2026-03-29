import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import {
  INQUIRY_CATEGORY_LABEL, INQUIRY_STATUS_LABEL, INQUIRY_STATUS_VARIANT,
  type InquiryStatus,
  type InquiryCategory
} from '@/types/cs'
import { formatDateTime } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'

export default async function InquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: inquiry }, { data: replies }] = await Promise.all([
    supabase.from('inquiries').select('*, order:orders!order_id(order_no)').eq('id', id).single(),
    supabase.from('inquiry_replies').select('*').eq('inquiry_id', id).order('created_at'),
  ])

  if (!inquiry) notFound()

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }} className="px-6 md:px-8 py-10">
      {/* 뒤로가기 */}
      <Link href="/shop/support/inquiries"
        className="flex items-center gap-1.5 text-sm mb-6 transition-colors"
        style={{ color: 'var(--shop-ink3)' }}>
        ← 문의 내역
      </Link>

      {/* 문의 헤더 */}
      <div className="rounded-2xl p-6 mb-4" style={{ background: 'var(--shop-bg2)' }}>
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{ background: 'var(--shop-bg3)', color: 'var(--shop-ink3)' }}>
              {INQUIRY_CATEGORY_LABEL[inquiry.category as InquiryCategory] ?? inquiry.category}
            </span>
            <Badge variant={INQUIRY_STATUS_VARIANT[inquiry.status as InquiryStatus]}>
              {INQUIRY_STATUS_LABEL[inquiry.status as InquiryStatus]}
            </Badge>
          </div>
          <span className="text-xs font-mono flex-shrink-0" style={{ color: 'var(--shop-ink3)' }}>
            {formatDateTime(inquiry.created_at)}
          </span>
        </div>
        <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--shop-ink)' }}>
          {inquiry.title}
        </h2>
        {inquiry.order && (
          <div className="text-xs mb-3 font-mono" style={{ color: 'var(--shop-ink3)' }}>
            관련 주문: {(inquiry.order as { order_no?: string }).order_no}
          </div>
        )}
        <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--shop-ink2)' }}>
          {inquiry.body}
        </p>
        {inquiry.attachments?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {inquiry.attachments.map((url: string, i: number) => (
              <a key={i} href={url} target="_blank" rel="noopener"
                className="text-xs px-2 py-1 rounded-lg flex items-center gap-1"
                style={{ background: 'var(--shop-bg3)', color: 'var(--shop-ink2)', border: '1px solid var(--shop-border)' }}>
                📎 첨부파일 {i + 1}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* 답변 스레드 */}
      {replies && replies.length > 0 && (
        <div className="space-y-3 mb-6">
          {(replies as Array<{
            id: string; is_admin: boolean; author_name: string
            body: string; attachments: string[]; created_at: string
          }>).map(reply => (
            <div
              key={reply.id}
              className="rounded-2xl p-5"
              style={{
                background: reply.is_admin ? 'rgba(79,142,247,0.06)' : 'var(--shop-bg)',
                border: `1.5px solid ${reply.is_admin ? 'rgba(79,142,247,0.2)' : 'var(--shop-border)'}`,
                marginLeft: reply.is_admin ? 0 : '10%',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {reply.is_admin ? (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: 'var(--shop-accent)', color: 'white' }}>
                      판매자 답변
                    </span>
                  ) : (
                    <span className="text-xs" style={{ color: 'var(--shop-ink3)' }}>{reply.author_name}</span>
                  )}
                </div>
                <span className="text-xs font-mono" style={{ color: 'var(--shop-ink3)' }}>
                  {formatDateTime(reply.created_at)}
                </span>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--shop-ink2)' }}>
                {reply.body}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* 접수 대기 안내 */}
      {inquiry.status === 'pending' && (
        <div className="text-center py-8 rounded-2xl" style={{ background: 'var(--shop-bg2)' }}>
          <p className="text-sm" style={{ color: 'var(--shop-ink3)' }}>
            문의를 검토 중입니다. 1–2 영업일 내에 답변 드리겠습니다.
          </p>
        </div>
      )}
    </div>
  )
}
