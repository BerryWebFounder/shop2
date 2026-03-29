import { cn } from '@/lib/utils'

type Variant = 'green' | 'yellow' | 'red' | 'blue' | 'purple' | 'indigo' | 'gray'

const variants: Record<Variant, string> = {
  green:  'bg-green-500/15 text-green-400 border border-green-500/20',
  yellow: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20',
  red:    'bg-red-500/15 text-red-400 border border-red-500/20',
  blue:   'bg-blue-500/15 text-blue-400 border border-blue-500/20',
  purple: 'bg-purple-500/15 text-purple-400 border border-purple-500/20',
  indigo: 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20',
  gray:   'bg-zinc-500/15 text-zinc-400 border border-zinc-500/20',
}

interface BadgeProps {
  variant: Variant
  children: React.ReactNode
  className?: string
}

export function Badge({ variant, children, className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium',
      variants[variant],
      className
    )}>
      {children}
    </span>
  )
}

// 편의 컴포넌트들
export function MemberStatusBadge({ status }: { status: string }) {
  if (status === 'active')   return <Badge variant="green">● 활성</Badge>
  if (status === 'dormant')  return <Badge variant="yellow">◐ 휴면</Badge>
  if (status === 'withdrawn') return <Badge variant="gray">○ 탈퇴</Badge>
  return <Badge variant="gray">{status}</Badge>
}

export function ProductStatusBadge({ status }: { status: string }) {
  if (status === 'sale')    return <Badge variant="green">판매중</Badge>
  if (status === 'soldout') return <Badge variant="red">품절</Badge>
  if (status === 'stop')    return <Badge variant="gray">판매중지</Badge>
  return <Badge variant="gray">{status}</Badge>
}

export function EventStatusBadge({ status }: { status: string }) {
  if (status === 'active')    return <Badge variant="green">진행중</Badge>
  if (status === 'scheduled') return <Badge variant="blue">예정</Badge>
  if (status === 'ended')     return <Badge variant="gray">종료</Badge>
  return <Badge variant="gray">{status}</Badge>
}
