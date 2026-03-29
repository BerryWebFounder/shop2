export default function ShopLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--shop-border)', borderTopColor: 'var(--shop-ink)' }}
        />
        <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--shop-ink3)' }}>
          Loading
        </span>
      </div>
    </div>
  )
}
