'use client'
import { cn } from '@/lib/utils'
import { type ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md' | 'xs'

const variants: Record<Variant, string> = {
  primary:   'bg-accent text-white hover:bg-accent-2 active:scale-[0.98]',
  secondary: 'bg-bg-3 text-ink border border-border-2 hover:bg-bg-3/80',
  danger:    'bg-red-500/10 text-red-400 border border-red-500/25 hover:bg-red-500/20',
  ghost:     'text-ink-2 hover:text-ink hover:bg-bg-3',
}

const sizes: Record<Size, string> = {
  xs: 'px-2 py-1 text-[11px] rounded-md',
  sm: 'px-3 py-1.5 text-xs rounded-md',
  md: 'px-4 py-2 text-sm rounded-lg',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: React.ReactNode
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center gap-1.5 font-medium transition-all whitespace-nowrap',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : icon}
      {children}
    </button>
  )
}
