-- ================================================================
-- 08. Supabase Realtime 설정
-- 대시보드 실시간 주문·재고 알림용
-- ================================================================

-- Supabase Realtime Publication에 테이블 추가
-- Dashboard → Database → Replication → supabase_realtime publication에서도 설정 가능

ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE members;

-- ================================================================
-- 실시간 구독 예시 (Next.js 클라이언트 코드 참고용 — SQL 아님)
-- ================================================================
-- // 대시보드에서 신규 주문 실시간 알림
-- const channel = supabase
--   .channel('new-orders')
--   .on('postgres_changes', {
--     event: 'INSERT',
--     schema: 'public',
--     table: 'orders',
--   }, (payload) => {
--     console.log('새 주문:', payload.new)
--     // 대시보드 통계 갱신
--   })
--   .subscribe()
--
-- // 재고 부족 알림
-- const stockChannel = supabase
--   .channel('low-stock')
--   .on('postgres_changes', {
--     event: 'UPDATE',
--     schema: 'public',
--     table: 'products',
--     filter: 'stock=lte.5',
--   }, (payload) => {
--     console.log('재고 부족:', payload.new.name, payload.new.stock)
--   })
--   .subscribe()

SELECT 'Realtime ready' AS status;
