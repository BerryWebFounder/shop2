import { cn } from '@/lib/utils'

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full border-collapse">{children}</table>
    </div>
  )
}

export function Thead({ children }: { children: React.ReactNode }) {
  return <thead>{children}</thead>
}

export function Th({ children, className, onClick }: {
  children: React.ReactNode
  className?: string
  onClick?: (e: React.MouseEvent) => void
}) {
  return (
    <th
      onClick={onClick}
      className={cn(
        'text-left text-[11px] font-semibold text-ink-3 uppercase tracking-wide',
        'px-4 py-3 border-b border-border whitespace-nowrap',
        onClick ? 'cursor-pointer select-none hover:text-ink-2' : '',
        className
      )}
    >
      {children}
    </th>
  )
}

export function Tbody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>
}

export function Tr({ children, className, onClick }: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}) {
  return (
    <tr
      className={cn(
        'border-b border-border last:border-0 transition-colors',
        onClick ? 'cursor-pointer hover:bg-white/[0.02]' : 'hover:bg-white/[0.015]',
        className
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  )
}

export function Td({ children, className, colSpan, onClick }: {
  children: React.ReactNode
  className?: string
  colSpan?: number
  onClick?: (e: React.MouseEvent) => void
}) {
  return (
    <td colSpan={colSpan} onClick={onClick} className={cn('px-4 py-3 text-sm text-ink', className)}>
      {children}
    </td>
  )
}

export function EmptyRow({ colSpan, message = '데이터가 없습니다' }: { colSpan: number; message?: string }) {
  return (
    <tr>
      <td colSpan={colSpan}>
        <div className="flex flex-col items-center justify-center py-16 text-ink-3">
          <div className="text-4xl mb-3">📭</div>
          <div className="text-sm">{message}</div>
        </div>
      </td>
    </tr>
  )
}
