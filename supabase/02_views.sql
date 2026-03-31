-- ================================================================
-- 02_views.sql
-- 전체 뷰 정의
-- ================================================================

-- ── 회원 안전 뷰 (PII 마스킹) ────────────────────────────────────
DROP VIEW IF EXISTS member_safe_view CASCADE;
CREATE VIEW member_safe_view AS
SELECT
  id,
  CASE WHEN status IN ('dormant','withdrawn')
    THEN SUBSTRING(name,1,1) || REPEAT('*', GREATEST(LENGTH(name)-1, 1))
    ELSE name END                                          AS name,
  CASE WHEN status IN ('dormant','withdrawn')
    THEN SUBSTRING(SPLIT_PART(email,'@',1),1,1) || '***@' || SPLIT_PART(email,'@',2)
    ELSE email END                                         AS email,
  CASE WHEN status IN ('dormant','withdrawn') THEN '010-****-****' ELSE phone END AS phone,
  CASE WHEN status IN ('dormant','withdrawn') THEN '*** (개인정보 보호)' ELSE address END AS address,
  status, grade, join_date, last_login, withdraw_date, dormant_date, created_at, updated_at
FROM members;

-- ── 회원 목록 뷰 (최근 주문 + 포인트 포함) ────────────────────────
DROP VIEW IF EXISTS member_list_view CASCADE;
CREATE VIEW member_list_view AS
SELECT
  m.*,
  lo.order_no AS last_order_no, lo.total_amount AS last_order_amount,
  lo.created_at AS last_order_date, lo.status AS last_order_status
FROM member_safe_view m
LEFT JOIN LATERAL (
  SELECT order_no, total_amount, created_at, status
  FROM orders WHERE member_id = m.id ORDER BY created_at DESC LIMIT 1
) lo ON TRUE;

-- ── 회원 통계 뷰 (등급 + 포인트) ────────────────────────────────
DROP VIEW IF EXISTS member_point_balance CASCADE;
CREATE VIEW member_point_balance AS
SELECT
  member_id,
  SUM(amount)::INT                                     AS balance,
  SUM(amount) FILTER (WHERE amount > 0)::INT           AS total_earned,
  ABS(SUM(amount) FILTER (WHERE amount < 0))::INT      AS total_used,
  COUNT(*) FILTER (WHERE type = 'earn')::INT           AS earn_count,
  MAX(created_at)                                      AS last_activity
FROM member_points GROUP BY member_id;

DROP VIEW IF EXISTS member_stats_view CASCADE;
CREATE VIEW member_stats_view AS
SELECT
  m.id, m.name, m.email, m.phone, m.status, m.grade,
  m.total_purchase, m.annual_purchase, m.order_count, m.join_date, m.last_login, m.notes,
  gc.label AS grade_label, gc.badge_color AS grade_color,
  gc.point_rate, gc.discount_rate,
  CASE
    WHEN m.grade = 'bronze' THEN (SELECT min_annual_amount FROM member_grade_config WHERE grade='silver')
    WHEN m.grade = 'silver' THEN (SELECT min_annual_amount FROM member_grade_config WHERE grade='gold')
    WHEN m.grade = 'gold'   THEN (SELECT min_annual_amount FROM member_grade_config WHERE grade='vip')
    ELSE NULL
  END AS next_grade_amount,
  COALESCE(pb.balance, 0)::INT AS point_balance
FROM members m
JOIN member_grade_config gc ON gc.grade = m.grade
LEFT JOIN member_point_balance pb ON pb.member_id = m.id;

-- ── 상품 목록 뷰 (분류명 + 할인율 + 대표 이미지) ─────────────────
DROP VIEW IF EXISTS product_list_view CASCADE;
CREATE VIEW product_list_view AS
SELECT
  p.id, p.serial_no, p.name, p.summary, p.price, p.sale_price, p.stock, p.status,
  p.created_at, p.updated_at,
  c1.id AS cat1_id, c1.name AS cat1_name,
  c2.id AS cat2_id, c2.name AS cat2_name,
  c3.id AS cat3_id, c3.name AS cat3_name,
  CASE WHEN p.sale_price IS NOT NULL AND p.price > 0
    THEN ROUND((1 - p.sale_price::NUMERIC / p.price) * 100, 1)
    ELSE NULL END AS discount_rate,
  pi.public_url AS primary_image_url
FROM products p
LEFT JOIN categories c1 ON c1.id = p.cat1_id
LEFT JOIN categories c2 ON c2.id = p.cat2_id
LEFT JOIN categories c3 ON c3.id = p.cat3_id
LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = TRUE;

-- ── 전시 목록 뷰 ────────────────────────────────────────────────
DROP VIEW IF EXISTS display_list_view CASCADE;
CREATE VIEW display_list_view AS
SELECT
  d.id, d.display_type, d.start_date, d.end_date, d.sort_order, d.is_active,
  p.id AS product_id, p.serial_no AS product_serial_no, p.name AS product_name,
  p.price AS product_price, p.sale_price AS product_sale_price,
  p.stock AS product_stock, p.status AS product_status,
  e.id AS event_id, e.name AS event_name,
  e.start_date AS event_start_date, e.end_date AS event_end_date, e.status AS event_status
FROM display_items d
JOIN products p    ON p.id = d.product_id
LEFT JOIN events e ON e.id = d.event_id;

-- ── 주문 상세 뷰 (회원 + 쿠폰 + 송장) ────────────────────────────
-- o.* 에 tracking_number/carrier_code/shipped_at 이미 포함 → shipments는 별칭 사용
DROP VIEW IF EXISTS order_detail_view CASCADE;
CREATE VIEW order_detail_view AS
SELECT
  o.*,
  m.name AS member_name, m.email AS member_email, m.phone AS member_phone,
  c.code AS coupon_code, c.name AS coupon_name,
  s.carrier_code    AS shipment_carrier_code,
  s.carrier_name    AS shipment_carrier_name,
  s.tracking_number AS shipment_tracking_number,
  s.tracking_url    AS shipment_tracking_url,
  s.shipped_at      AS shipment_shipped_at,
  s.delivered_at    AS shipment_delivered_at
FROM orders o
LEFT JOIN members m         ON m.id = o.member_id
LEFT JOIN coupons c         ON c.id = o.coupon_id
LEFT JOIN order_shipments s ON s.order_id = o.id;

-- ── 쿠폰 통계 뷰 ────────────────────────────────────────────────
DROP VIEW IF EXISTS coupon_stats_view CASCADE;
CREATE VIEW coupon_stats_view AS
SELECT
  c.*,
  COUNT(cu.id)::INT                      AS actual_usage_count,
  COALESCE(SUM(cu.discount_amt), 0)::INT AS total_discount_given,
  CASE
    WHEN c.valid_until IS NULL THEN 'active'
    WHEN c.valid_until < NOW() THEN 'expired'
    WHEN NOT c.is_active       THEN 'inactive'
    ELSE 'active'
  END AS computed_status
FROM coupons c
LEFT JOIN coupon_usages cu ON cu.coupon_id = c.id
GROUP BY c.id;

-- ── 상품 평점 집계 뷰 ────────────────────────────────────────────
DROP VIEW IF EXISTS product_rating_summary CASCADE;
CREATE VIEW product_rating_summary AS
SELECT
  product_id,
  COUNT(*)::INT                           AS review_count,
  ROUND(AVG(rating)::NUMERIC, 1)          AS avg_rating,
  COUNT(*) FILTER (WHERE rating = 5)::INT AS star5,
  COUNT(*) FILTER (WHERE rating = 4)::INT AS star4,
  COUNT(*) FILTER (WHERE rating = 3)::INT AS star3,
  COUNT(*) FILTER (WHERE rating = 2)::INT AS star2,
  COUNT(*) FILTER (WHERE rating = 1)::INT AS star1
FROM product_reviews WHERE status = 'approved'
GROUP BY product_id;

-- ── 대시보드 통계 뷰 ────────────────────────────────────────────
DROP VIEW IF EXISTS dashboard_stats_view CASCADE;
CREATE VIEW dashboard_stats_view AS
WITH today_range AS (
  SELECT
    DATE_TRUNC('day',   NOW() AT TIME ZONE 'Asia/Seoul') AS start_of_today,
    DATE_TRUNC('month', NOW() AT TIME ZONE 'Asia/Seoul') AS start_of_month
)
SELECT
  (SELECT COUNT(*)   FROM members WHERE status <> 'withdrawn')                       AS total_members,
  (SELECT COUNT(*)   FROM members WHERE join_date >= (SELECT start_of_month FROM today_range)) AS new_members_this_month,
  (SELECT COUNT(*)   FROM members WHERE status = 'active')                           AS active_members,
  (SELECT COUNT(*)   FROM members WHERE status = 'dormant')                          AS dormant_members,
  (SELECT COUNT(*)   FROM orders  WHERE created_at >= (SELECT start_of_today FROM today_range)) AS today_orders,
  (SELECT COALESCE(SUM(total_amount),0) FROM orders
   WHERE  created_at >= (SELECT start_of_today FROM today_range) AND status <> 'cancelled') AS today_revenue,
  (SELECT COUNT(*)   FROM products)                                                  AS total_products,
  (SELECT COUNT(*)   FROM products WHERE status = 'sale')                            AS on_sale_products,
  (SELECT COUNT(*)   FROM display_items WHERE is_active = TRUE)                      AS displayed_products,
  (SELECT COUNT(*)   FROM products WHERE stock <= 5 AND status <> 'stop')            AS low_stock_count;

-- ── 결제 통계 뷰 ────────────────────────────────────────────────
DROP VIEW IF EXISTS payment_stats_view CASCADE;
CREATE VIEW payment_stats_view AS
SELECT
  DATE_TRUNC('day', created_at AT TIME ZONE 'Asia/Seoul')::DATE AS date,
  method,
  COUNT(*) FILTER (WHERE status = 'done')::INT                  AS success_count,
  COUNT(*) FILTER (WHERE status IN ('canceled','aborted'))::INT AS fail_count,
  SUM(amount - cancel_amount) FILTER (WHERE status = 'done')::BIGINT AS net_revenue
FROM payments
GROUP BY DATE_TRUNC('day', created_at AT TIME ZONE 'Asia/Seoul')::DATE, method
ORDER BY DATE_TRUNC('day', created_at AT TIME ZONE 'Asia/Seoul')::DATE DESC;

-- ── 재고 부족 뷰 ────────────────────────────────────────────────
DROP VIEW IF EXISTS low_stock_view CASCADE;
CREATE VIEW low_stock_view AS
SELECT
  p.id, p.serial_no, p.name, p.stock, p.status,
  c1.name AS cat1_name, c2.name AS cat2_name,
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

SELECT 'Views ready' AS status;
