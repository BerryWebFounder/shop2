// 관리자 다크 테마 기반 Recharts 공통 스타일

export const CHART_COLORS = {
  primary:  '#4f8ef7',
  secondary:'#34d399',
  accent:   '#f59e0b',
  danger:   '#f87171',
  purple:   '#a78bfa',
  coral:    '#fb923c',
  pink:     '#f472b6',
  teal:     '#2dd4bf',
}

export const PALETTE = [
  CHART_COLORS.primary,
  CHART_COLORS.secondary,
  CHART_COLORS.accent,
  CHART_COLORS.danger,
  CHART_COLORS.purple,
  CHART_COLORS.coral,
  CHART_COLORS.teal,
  CHART_COLORS.pink,
]

export const CHART_STYLE = {
  bg:         '#13161e',
  bgGrid:     'rgba(255,255,255,0.04)',
  axis:       '#6b7280',
  tickFill:   '#9ca3b8',
  tooltipBg:  '#1a1e28',
  tooltipBorder: '#363c50',
}

// Recharts 공통 tooltip 스타일
export const tooltipStyle = {
  backgroundColor: CHART_STYLE.tooltipBg,
  border:          `1px solid ${CHART_STYLE.tooltipBorder}`,
  borderRadius:    8,
  color:           '#e8eaf0',
  fontSize:        12,
  fontFamily:      "'Noto Sans KR', sans-serif",
}

export const tooltipLabelStyle = {
  color:      '#9ca3b8',
  fontFamily: "'JetBrains Mono', monospace",
  fontSize:   11,
}

// 공통 axis 스타일
export const axisStyle = {
  tick:  { fill: CHART_STYLE.tickFill, fontSize: 11 },
  line:  { stroke: 'transparent' },
  style: { fontFamily: "'JetBrains Mono', monospace" },
}

// 원화 포맷
export function fmtKRW(value: number): string {
  if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(1)}억`
  if (value >= 10_000)      return `${(value / 10_000).toFixed(0)}만`
  return value.toLocaleString()
}

export function fmtKRWFull(value: number): string {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(value)
}
