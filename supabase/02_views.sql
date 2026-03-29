-- ================================================================
-- 02. 뷰 (Views)
-- ================================================================

-- ── 회원 안전 뷰 (개인정보 마스킹) ─────────────────────────────────
-- 휴면/탈퇴 회원의 PII를 마스킹하여 노출
-- API Routes에서 이 뷰를 조회하면 실수로 원본을 노출하는 일이 없음
DROP VIEW IF EXISTS member_safe_view CASCADE;

CREATE VIEW member_safe_view AS
SELECT
  id,
  -- 이름: 휴면/탈퇴는 첫 글자 + ***
  CASE
    WHEN status IN ('dormant', 'withdrawn')
      THEN SUBSTRING(name, 1, 1) || REPEAT('*', GREATEST(LENGTH(name) - 1, 1))
    ELSE name
  END AS name,
  -- 이메일: 휴면/탈퇴는 아이디 첫 글자 + ***@도메인
  CASE
    WHEN status IN ('dormant', 'withdrawn')
      THEN SPLIT_PART(email, '@', 1)::TEXT::TEXT[1:1] || -- 첫 글자
           REPEAT('*', 3) || '@' ||
           SPLIT_PART(email, '@', 2)
    ELSE email
  END AS email,
  -- 전화: 휴면/탈퇴는 마스킹
  CASE
    WHEN status IN ('dormant', 'withdrawn') THEN '010-****-****'
    ELSE phone
  END AS phone,
  -- 주소: 휴면/탈퇴는 숨김
  CASE
    WHEN status IN ('dormant', 'withdrawn') THEN '*** (개인정보 보호)'
    ELSE address
  END AS address,
  status,
  join_date,
  last_login,
  withdraw_date,
  dormant_date,
  created_at,
  updated_at
FROM members;

COMMENT ON VIEW member_safe_view IS
  'KISA 기준 개인정보 마스킹 뷰. 휴면/탈퇴 회원의 이름·이메일·전화·주소를 자동 마스킹합니다.';

-- ── 회원 목록 뷰 (최근 주문 포함) ───────────────────────────────────
DROP VIEW IF EXISTS member_list_view CASCADE;

CREATE VIEW member_list_view AS
SELECT
  m.id,
  m.name,
  m.email,
  m.phone,
  m.address,
  m.status,
  m.join_date,
  m.last_login,
  m.withdraw_date,
  m.dormant_date,
  -- 최근 주문 정보
  lo.order_no   AS last_order_no,
  lo.total_amount AS last_order_amount,
  lo.created_at AS last_order_date,
  lo.status     AS last_order_status
FROM member_safe_view m
LEFT JOIN LATERAL (
  SELECT order_no, total_amount, created_at, status
  FROM orders
  WHERE member_id = m.id
  ORDER BY created_at DESC
  LIMIT 1
) lo ON TRUE;

COMMENT ON VIEW member_list_view IS
  '회원 목록 페이지용 뷰. 마스킹 처리된 회원 정보와 최근 주문 1건을 포함합니다.';

-- ── 상품 목록 뷰 (분류명 포함) ───────────────────────────────────────
DROP VIEW IF EXISTS product_list_view CASCADE;

CREATE VIEW product_list_view AS
SELECT
  p.id,
  p.serial_no,
  p.name,
  p.summary,
  p.price,
  p.sale_price,
  p.stock,
  p.status,
  p.created_at,
  p.updated_at,
  c1.id   AS cat1_id,
  c1.name AS cat1_name,
  c2.id   AS cat2_id,
  c2.name AS cat2_name,
  c3.id   AS cat3_id,
  c3.name AS cat3_name,
  -- 할인율 (sale_price가 있을 때만)
  CASE
    WHEN p.sale_price IS NOT NULL AND p.price > 0
      THEN ROUND((1 - p.sale_price::NUMERIC / p.price) * 100, 1)
    ELSE NULL
  END AS discount_rate
FROM products p
LEFT JOIN categories c1 ON c1.id = p.cat1_id
LEFT JOIN categories c2 ON c2.id = p.cat2_id
LEFT JOIN categories c3 ON c3.id = p.cat3_id;

COMMENT ON VIEW product_list_view IS
  '상품 목록 페이지용 뷰. 분류명과 할인율을 포함합니다.';

-- ── 전시 목록 뷰 (상품 + 이벤트 join) ───────────────────────────────
DROP VIEW IF EXISTS display_list_view CASCADE;

CREATE VIEW display_list_view AS
SELECT
  d.id,
  d.display_type,
  d.start_date,
  d.end_date,
  d.sort_order,
  d.is_active,
  d.created_at,
  d.updated_at,
  -- 상품 정보
  p.id         AS product_id,
  p.serial_no  AS product_serial_no,
  p.name       AS product_name,
  p.price      AS product_price,
  p.sale_price AS product_sale_price,
  p.stock      AS product_stock,
  p.status     AS product_status,
  -- 이벤트 정보
  e.id         AS event_id,
  e.name       AS event_name,
  e.start_date AS event_start_date,
  e.end_date   AS event_end_date,
  e.status     AS event_status
FROM display_items d
JOIN products p      ON p.id = d.product_id
LEFT JOIN events e   ON e.id = d.event_id;

COMMENT ON VIEW display_list_view IS
  '전시 관리 목록 뷰. 상품과 이벤트 정보를 포함합니다.';

-- ── 대시보드 통계 뷰 ─────────────────────────────────────────────
DROP VIEW IF EXISTS dashboard_stats_view CASCADE;

CREATE VIEW dashboard_stats_view AS
WITH
  today_range AS (
    SELECT
      DATE_TRUNC('day', NOW() AT TIME ZONE 'Asia/Seoul') AS start_of_today,
      DATE_TRUNC('month', NOW() AT TIME ZONE 'Asia/Seoul') AS start_of_month
  )
SELECT
  -- 회원
  (SELECT COUNT(*) FROM members WHERE status <> 'withdrawn')                        AS total_members,
  (SELECT COUNT(*) FROM members WHERE join_date >= (SELECT start_of_month FROM today_range)) AS new_members_this_month,
  (SELECT COUNT(*) FROM members WHERE status = 'active')                            AS active_members,
  (SELECT COUNT(*) FROM members WHERE status = 'dormant')                           AS dormant_members,
  -- 주문
  (SELECT COUNT(*) FROM orders WHERE created_at >= (SELECT start_of_today FROM today_range))       AS today_orders,
  (SELECT COALESCE(SUM(total_amount), 0) FROM orders
   WHERE created_at >= (SELECT start_of_today FROM today_range) AND status <> 'cancelled')          AS today_revenue,
  -- 상품
  (SELECT COUNT(*) FROM products)                                                   AS total_products,
  (SELECT COUNT(*) FROM products WHERE status = 'sale')                             AS on_sale_products,
  (SELECT COUNT(*) FROM display_items WHERE is_active = TRUE)                       AS displayed_products,
  -- 재고 부족 (5개 이하, 판매중지 제외)
  (SELECT COUNT(*) FROM products WHERE stock <= 5 AND status <> 'stop')             AS low_stock_count;

COMMENT ON VIEW dashboard_stats_view IS
  '대시보드 핵심 통계 뷰. 매 조회마다 실시간으로 계산됩니다.';

-- ── 주간 매출 집계 뷰 ───────────────────────────────────────────────
DROP VIEW IF EXISTS weekly_sales_view CASCADE;

CREATE VIEW weekly_sales_view AS
SELECT
  created_at::DATE          AS sale_date,
  COUNT(*)::BIGINT          AS order_count,
  SUM(total_amount)::BIGINT AS revenue
FROM orders
WHERE
  created_at >= NOW() - INTERVAL '7 days'
  AND status <> 'cancelled'
GROUP BY created_at::DATE
ORDER BY sale_date;

COMMENT ON VIEW weekly_sales_view IS
  '최근 7일 매출 집계 뷰.';

-- ── 재고 부족 상품 뷰 ──────────────────────────────────────────────
DROP VIEW IF EXISTS low_stock_view CASCADE;

CREATE VIEW low_stock_view AS
SELECT
  p.id,
  p.serial_no,
  p.name,
  p.stock,
  p.status,
  c1.name AS cat1_name,
  c2.name AS cat2_name,
  CASE
    WHEN p.stock = 0 THEN 'out'
    WHEN p.stock <= 3 THEN 'critical'
    WHEN p.stock <= 10 THEN 'warning'
    ELSE 'ok'
  END AS stock_level
FROM products p
LEFT JOIN categories c1 ON c1.id = p.cat1_id
LEFT JOIN categories c2 ON c2.id = p.cat2_id
WHERE p.stock <= 10 AND p.status <> 'stop'
ORDER BY p.stock ASC, p.name;

COMMENT ON VIEW low_stock_view IS
  '재고 부족 상품 뷰. 재고 10개 이하 상품을 재고 수 기준 오름차순으로 반환합니다.';

SELECT 'Views ready' AS status;
