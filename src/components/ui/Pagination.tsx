'use client'
import { cn } from '@/lib/utils'

interface PaginationProps {
  page: number
  total: number
  limit: number
  onChange: (page: number) => void
}

export function Pagination({ page, total, limit, onChange }: PaginationProps) {
  const totalPages = Math.ceil(total / limit)
  if (totalPages <= 1) return null

  const pages = Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
    if (totalPages <= 7) return i + 1
    if (page <= 4) return i + 1
    if (page >= totalPages - 3) return totalPages - 6 + i
    return page - 3 + i
  })

  return (
    <div className="flex items-center justify-center gap-1 py-4">
      <PageBtn disabled={page === 1} onClick={() => onChange(page - 1)}>‹</PageBtn>
      {pages.map((p) => (
        <PageBtn key={p} active={p === page} onClick={() => onChange(p)}>
          {p}
        </PageBtn>
      ))}
      <PageBtn disabled={page === totalPages} onClick={() => onChange(page + 1)}>›</PageBtn>
    </div>
  )
}

function PageBtn({ children, active, disabled, onClick }: {
  children: React.ReactNode
  active?: boolean
  disabled?: boolean
  onClick?: () => void
}) {
  return (
    <button
      className={cn(
        'w-8 h-8 flex items-center justify-center rounded-md text-xs font-mono',
        'border transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
        active
          ? 'bg-accent border-accent text-white'
          : 'bg-bg-3 border-border text-ink-2 hover:border-accent hover:text-accent'
      )}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
