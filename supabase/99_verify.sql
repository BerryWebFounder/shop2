-- ================================================================
-- 99. 검증 쿼리
-- 모든 파일 실행 후 이 쿼리들로 정상 설치를 확인하세요
-- ================================================================

-- ── 테이블 목록 확인 ────────────────────────────────────────────────
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(quote_ident(tablename))) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ── 뷰 목록 확인 ────────────────────────────────────────────────────
SELECT viewname, definition
FROM pg_views
WHERE schemaname = 'public'
ORDER BY viewname;

-- ── 함수 목록 확인 ──────────────────────────────────────────────────
SELECT
  routine_name,
  routine_type,
  data_type AS return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- ── 트리거 목록 확인 ────────────────────────────────────────────────
SELECT
  trigger_name,
  event_object_table AS table_name,
  event_manipulation AS event,
  action_timing      AS timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- ── RLS 정책 확인 ────────────────────────────────────────────────────
SELECT
  tablename,
  policyname,
  cmd,
  qual     AS using_expr,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ── 인덱스 목록 확인 ────────────────────────────────────────────────
SELECT
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ── RLS 활성화 여부 확인 ─────────────────────────────────────────────
SELECT
  relname AS table_name,
  relrowsecurity AS rls_enabled,
  relforcerowsecurity AS rls_forced
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relkind = 'r'
ORDER BY relname;

-- ── 분류 트리 구조 확인 ──────────────────────────────────────────────
SELECT
  CASE c.level
    WHEN 1 THEN c.name
    WHEN 2 THEN '  └ ' || c.name
    WHEN 3 THEN '    └ ' || c.name
  END AS category_tree,
  c.level,
  c.sort_order,
  p.name AS parent_name
FROM categories c
LEFT JOIN categories p ON p.id = c.parent_id
ORDER BY
  COALESCE(p.sort_order, c.sort_order),
  c.level,
  c.sort_order;

-- ── 함수 동작 테스트 ────────────────────────────────────────────────
-- 주문번호 생성 테스트
SELECT generate_order_no() AS sample_order_no;

-- 상품번호 생성 테스트 (시퀀스 소비 주의 — 실제 운영 전에만 실행)
-- SELECT generate_serial_no() AS sample_serial_no;

-- 대시보드 통계 뷰 테스트
SELECT * FROM dashboard_stats_view;

-- ── Storage 버킷 확인 ────────────────────────────────────────────────
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets;

SELECT 'Schema verification complete' AS status;
