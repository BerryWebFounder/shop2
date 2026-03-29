// 오프라인 상태일 때 Service Worker가 이 페이지를 표시합니다
export default function OfflinePage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: 'var(--shop-bg)' }}
    >
      <div className="text-6xl mb-6">📡</div>
      <h1
        className="text-3xl mb-3"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--shop-ink)' }}
      >
        오프라인 상태입니다
      </h1>
      <p className="text-sm mb-8 leading-relaxed" style={{ color: 'var(--shop-ink3)' }}>
        인터넷 연결을 확인해 주세요.<br />
        연결이 복구되면 자동으로 새로고침됩니다.
      </p>

      <button
        onClick={() => window.location.reload()}
        className="px-8 py-3.5 rounded-full text-sm font-semibold transition-all hover:opacity-90"
        style={{ background: 'var(--shop-ink)', color: 'white' }}
      >
        다시 시도
      </button>

      {/* 오프라인 자동 복구 */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.addEventListener('online', () => window.location.reload());
          `,
        }}
      />
    </div>
  )
}
