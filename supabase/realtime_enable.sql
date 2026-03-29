-- ================================================================
-- Supabase Realtime 설정 확인 & 활성화
-- Supabase Dashboard → SQL Editor에서 실행
-- ================================================================

-- ── 현재 publication 확인 ────────────────────────────────────────
SELECT
  schemaname,
  tablename,
  pubname
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- ── 필요한 테이블이 없으면 아래를 실행 ──────────────────────────
-- (기존 08_realtime.sql에서 이미 설정했다면 생략)

ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE members;

-- ── Realtime RLS 확인 ────────────────────────────────────────────
-- Supabase Realtime은 RLS를 따릅니다.
-- 관리자(authenticated)만 구독할 수 있도록 설정이 되어 있는지 확인:

SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('orders', 'products', 'members');

-- ── 테이블 REPLICA IDENTITY 확인 ────────────────────────────────
-- UPDATE/DELETE 이벤트에서 OLD 값을 받으려면 FULL이 필요합니다.
ALTER TABLE orders   REPLICA IDENTITY FULL;
ALTER TABLE products REPLICA IDENTITY FULL;
ALTER TABLE members  REPLICA IDENTITY FULL;

SELECT 'Realtime setup complete' AS status;
