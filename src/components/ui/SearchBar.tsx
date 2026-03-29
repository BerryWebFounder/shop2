'use client'
import { useCallback, useState } from 'react'
import { cn } from '@/lib/utils'

interface SearchBarProps {
  placeholder?: string
  defaultValue?: string
  onSearch: (q: string) => void
  className?: string
}

export function SearchBar({ placeholder = '검색...', defaultValue = '', onSearch, className }: SearchBarProps) {
  const [value, setValue] = useState(defaultValue)

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value)
    onSearch(e.target.value)
  }, [onSearch])

  return (
    <div className={cn(
      'flex items-center gap-2 bg-bg-3 border border-border rounded-lg px-3 py-2 w-64',
      'focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/15 transition-all',
      className
    )}>
      <span className="text-ink-3 text-sm shrink-0">🔍</span>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="bg-transparent outline-none text-sm text-ink placeholder-[var(--text-3)] flex-1 min-w-0"
      />
      {value && (
        <button
          onClick={() => { setValue(''); onSearch('') }}
          className="text-ink-3 hover:text-ink text-sm"
        >
          ×
        </button>
      )}
    </div>
  )
}
