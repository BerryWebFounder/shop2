export default function ProductsLoading() {
  return (
    <div style={{ maxWidth: 'var(--shop-max-w)', margin: '0 auto' }} className="px-6 md:px-8 py-10">
      {/* 헤더 스켈레톤 */}
      <div className="mb-8">
        <div className="h-10 w-48 rounded-xl mb-2 animate-pulse" style={{ background: 'var(--shop-bg2)' }} />
        <div className="h-4 w-24 rounded-lg animate-pulse" style={{ background: 'var(--shop-bg2)' }} />
      </div>

      {/* 그리드 스켈레톤 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="animate-pulse" style={{ animationDelay: `${i * 40}ms` }}>
            <div
              className="rounded-2xl mb-3"
              style={{ aspectRatio: '3/4', background: 'var(--shop-bg2)' }}
            />
            <div className="h-3 w-16 rounded mb-2" style={{ background: 'var(--shop-bg2)' }} />
            <div className="h-4 w-full rounded mb-1" style={{ background: 'var(--shop-bg2)' }} />
            <div className="h-4 w-3/4 rounded mb-2" style={{ background: 'var(--shop-bg2)' }} />
            <div className="h-4 w-24 rounded" style={{ background: 'var(--shop-bg2)' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
