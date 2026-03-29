import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// ── Tailwind 클래스 병합 ──────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── 가격 포맷 ─────────────────────────────────────────────────────
export function formatPrice(amount: number): string {
  return amount.toLocaleString('ko-KR') + '원'
}

// ── 날짜/시간 포맷 (null 허용) ────────────────────────────────────
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  })
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  const diff  = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)

  if (mins  <  1) return '방금 전'
  if (mins  < 60) return `${mins}분 전`
  if (hours < 24) return `${hours}시간 전`
  if (days  <  7) return `${days}일 전`
  return formatDate(dateStr)
}

// ── 파일 크기 포맷 ───────────────────────────────────────────────
export function formatFileSize(bytes: number): string {
  if (bytes < 1024)        return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

// ── 문자열 유틸 ─────────────────────────────────────────────────
export function truncate(str: string, maxLen: number): string {
  return str.length <= maxLen ? str : str.slice(0, maxLen) + '...'
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9가-힣-]/g, '')
}
