export default function ProductDetailLoading() {
  return (
    <div style={{ maxWidth: 'var(--shop-max-w)', margin: '0 auto' }} className="px-6 md:px-8 py-10">
      {/* 브레드크럼 */}
      <div className="flex gap-2 mb-8">
        {[60, 20, 80, 20, 120].map((w, i) => (
          <div key={i} className="h-3 rounded animate-pulse" style={{ width: w, background: 'var(--shop-bg2)' }} />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16">
        {/* 이미지 스켈레톤 */}
        <div>
          <div className="rounded-2xl mb-3 animate-pulse" style={{ aspectRatio: '3/4', background: 'var(--shop-bg2)' }} />
          <div className="flex gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-xl animate-pulse" style={{ width: 72, height: 90, background: 'var(--shop-bg2)' }} />
            ))}
          </div>
        </div>

        {/* 정보 스켈레톤 */}
        <div className="space-y-4">
          <div className="h-3 w-24 rounded animate-pulse" style={{ background: 'var(--shop-bg2)' }} />
          <div className="h-10 w-3/4 rounded-xl animate-pulse" style={{ background: 'var(--shop-bg2)' }} />
          <div className="h-8 w-32 rounded animate-pulse" style={{ background: 'var(--shop-bg2)' }} />
          <div className="space-y-2">
            <div className="h-4 w-full rounded animate-pulse" style={{ background: 'var(--shop-bg2)' }} />
            <div className="h-4 w-5/6 rounded animate-pulse" style={{ background: 'var(--shop-bg2)' }} />
          </div>
          <div className="h-14 w-full rounded-2xl animate-pulse" style={{ background: 'var(--shop-bg2)' }} />
        </div>
      </div>
    </div>
  )
}
