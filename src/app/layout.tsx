import type { Metadata } from 'next'
import { Noto_Sans_KR, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const noto = Noto_Sans_KR({
  subsets:  ['latin'],
  weight:   ['300', '400', '500', '600', '700'],
  variable: '--font-noto',
  display:  'swap',
})

const jetbrains = JetBrains_Mono({
  subsets:  ['latin'],
  weight:   ['400', '500'],
  variable: '--font-mono',
  display:  'swap',
})

export const metadata: Metadata = {
  title:       { template: '%s | 쇼핑몰', default: '쇼핑몰' },
  description: '쇼핑몰 관리 및 쇼핑',
  manifest:    '/manifest.json',
  appleWebApp: {
    capable:         true,
    statusBarStyle:  'default',
    title:           '쇼핑몰',
  },
  formatDetection: { telephone: false },
  other: {
    'mobile-web-app-capable':        'yes',
    'theme-color':                   '#1A1A18',
    'apple-mobile-web-app-capable':  'yes',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${noto.variable} ${jetbrains.variable}`}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body>{children}</body>
    </html>
  )
}
