import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // CSS 변수를 Tailwind arbitrary values 없이 사용하기 위해
      // 실제 컴포넌트에서 쓰는 클래스명 그대로 키를 정의
      backgroundColor: {
        'bg':       'var(--bg)',
        'bg-2':     'var(--bg-2)',
        'bg-3':     'var(--bg-3)',
        'bg-bg':    'var(--bg)',
        'bg-bg-2':  'var(--bg-2)',
        'bg-bg-3':  'var(--bg-3)',
        'accent':   'var(--accent)',
        'accent-2': 'var(--accent-2)',
      },
      textColor: {
        'ink':    'var(--text)',
        'ink-2':  'var(--text-2)',
        'ink-3':  'var(--text-3)',
        'accent': 'var(--accent)',
      },
      borderColor: {
        'border':    'var(--border)',
        'border-2':  'var(--border-2)',
        'accent':    'var(--accent)',
        'ink-3':     'var(--text-3)',
        DEFAULT:     'var(--border)',
      },
      ringColor: {
        'accent': 'var(--accent)',
        'border': 'var(--border)',
      },
      accentColor: {
        'accent': 'var(--accent)',
      },
      fontFamily: {
        sans:    ['var(--font-noto)', 'Noto Sans KR', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
        body:    ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      animation: {
        page: 'fadeInUp 0.18s ease both',
      },
      keyframes: {
        fadeInUp: {
          '0%':   { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
