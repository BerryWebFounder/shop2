-- ================================================================
-- 분석 대시보드용 SQL 함수
-- Supabase SQL Editor에서 실행하세요
-- ================================================================

-- ── 일별 매출 집계 (기간 지정) ──────────────────────────────────
CREATE OR REPLACE FUNCTION analytics_daily_revenue(
  p_from DATE DEFAULT CURRENT_DATE - 29,
  p_to   DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  date        DATE,
  revenue     BIGINT,
  order_count BIGINT,
  avg_order   NUMERIC
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    gs::DATE                                     AS date,
    COALESCE(SUM(o.total_amount), 0)::BIGINT     AS revenue,
    COUNT(o.id)::BIGINT                          AS order_count,
    COALESCE(AVG(o.total_amount), 0)::NUMERIC    AS avg_order
  FROM generate_series(p_from::TIMESTAMPTZ, p_to::TIMESTAMPTZ, '1 day') gs
  LEFT JOIN orders o
    ON  o.created_at::DATE = gs::DATE
    AND o.status NOT IN ('cancelled', 'returned')
  GROUP BY gs::DATE
  ORDER BY date;
$$;

-- ── 월별 매출 집계 (최근 12개월) ────────────────────────────────
CREATE OR REPLACE FUNCTION analytics_monthly_revenue(
  p_months INT DEFAULT 12
)
RETURNS TABLE (
  month       TEXT,    -- 'YYYY-MM'
  revenue     BIGINT,
  order_count BIGINT,
  new_members BIGINT
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    TO_CHAR(gs, 'YYYY-MM')                       AS month,
    COALESCE(SUM(o.total_amount), 0)::BIGINT     AS revenue,
    COUNT(DISTINCT o.id)::BIGINT                 AS order_count,
    COUNT(DISTINCT m.id)::BIGINT                 AS new_members
  FROM generate_series(
    DATE_TRUNC('month', NOW()) - ((p_months - 1) || ' months')::INTERVAL,
    DATE_TRUNC('month', NOW()),
    '1 month'
  ) gs
  LEFT JOIN orders o
    ON  DATE_TRUNC('month', o.created_at) = gs
    AND o.status NOT IN ('cancelled', 'returned')
  LEFT JOIN members m
    ON  DATE_TRUNC('month', m.join_date) = gs
  GROUP BY gs
  ORDER BY gs;
$$;

-- ── 요일별 매출 패턴 ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION analytics_by_weekday(
  p_from DATE DEFAULT CURRENT_DATE - 89,
  p_to   DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  weekday      INT,     -- 0=일, 1=월, ..., 6=토
  weekday_name TEXT,
  revenue      BIGINT,
  order_count  BIGINT
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    EXTRACT(DOW FROM created_at)::INT            AS weekday,
    CASE EXTRACT(DOW FROM created_at)::INT
      WHEN 0 THEN '일'
      WHEN 1 THEN '월'
      WHEN 2 THEN '화'
      WHEN 3 THEN '수'
      WHEN 4 THEN '목'
      WHEN 5 THEN '금'
      WHEN 6 THEN '토'
    END                                          AS weekday_name,
    SUM(total_amount)::BIGINT                    AS revenue,
    COUNT(*)::BIGINT                             AS order_count
  FROM orders
  WHERE
    created_at::DATE BETWEEN p_from AND p_to
    AND status NOT IN ('cancelled', 'returned')
  GROUP BY EXTRACT(DOW FROM created_at)::INT
  ORDER BY weekday;
$$;

-- ── 시간대별 주문 패턴 ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION analytics_by_hour(
  p_from DATE DEFAULT CURRENT_DATE - 29,
  p_to   DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  hour        INT,
  order_count BIGINT,
  revenue     BIGINT
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Seoul')::INT AS hour,
    COUNT(*)::BIGINT                                              AS order_count,
    SUM(total_amount)::BIGINT                                     AS revenue
  FROM orders
  WHERE
    created_at::DATE BETWEEN p_from AND p_to
    AND status NOT IN ('cancelled', 'returned')
  GROUP BY EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Seoul')::INT
  ORDER BY hour;
$$;

-- ── 카테고리별 매출 ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION analytics_by_category(
  p_from DATE DEFAULT CURRENT_DATE - 29,
  p_to   DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  cat_name    TEXT,
  revenue     BIGINT,
  order_count BIGINT,
  qty_sold    BIGINT
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    COALESCE(c.name, '미분류')                   AS cat_name,
    SUM(COALESCE(oi.sale_price, oi.unit_price) * oi.quantity)::BIGINT AS revenue,
    COUNT(DISTINCT o.id)::BIGINT                 AS order_count,
    SUM(oi.quantity)::BIGINT                     AS qty_sold
  FROM order_items oi
  JOIN orders o  ON o.id = oi.order_id
  JOIN products p ON p.id = oi.product_id
  LEFT JOIN categories c ON c.id = p.cat1_id
  WHERE
    o.created_at::DATE BETWEEN p_from AND p_to
    AND o.status NOT IN ('cancelled', 'returned')
  GROUP BY COALESCE(c.name, '미분류')
  ORDER BY revenue DESC
  LIMIT 8;
$$;

-- ── 주문 상태 분포 ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION analytics_order_status_dist(
  p_from DATE DEFAULT CURRENT_DATE - 29,
  p_to   DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  status      TEXT,
  count       BIGINT,
  revenue     BIGINT
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    status,
    COUNT(*)::BIGINT          AS count,
    SUM(total_amount)::BIGINT AS revenue
  FROM orders
  WHERE created_at::DATE BETWEEN p_from AND p_to
  GROUP BY status
  ORDER BY count DESC;
$$;

-- ── 회원 가입 추이 ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION analytics_member_growth(
  p_from DATE DEFAULT CURRENT_DATE - 89,
  p_to   DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  date         DATE,
  new_members  BIGINT,
  total_members BIGINT
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    gs::DATE                                             AS date,
    COUNT(m.id)::BIGINT                                  AS new_members,
    SUM(COUNT(m.id)) OVER (ORDER BY gs::DATE)::BIGINT    AS total_members
  FROM generate_series(p_from::TIMESTAMPTZ, p_to::TIMESTAMPTZ, '1 day') gs
  LEFT JOIN members m ON m.join_date::DATE = gs::DATE AND m.status <> 'withdrawn'
  GROUP BY gs::DATE
  ORDER BY date;
$$;

-- ── 회원 상태 분포 ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION analytics_member_status_dist()
RETURNS TABLE (
  status TEXT,
  count  BIGINT
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT status, COUNT(*)::BIGINT AS count
  FROM members
  GROUP BY status
  ORDER BY count DESC;
$$;

-- ── 상품 재고 현황 ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION analytics_stock_status()
RETURNS TABLE (
  category    TEXT,
  count       BIGINT
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    CASE
      WHEN stock = 0          THEN '품절'
      WHEN stock <= 5         THEN '재고부족(5개↓)'
      WHEN stock <= 20        THEN '주의(20개↓)'
      ELSE '정상'
    END AS category,
    COUNT(*)::BIGINT AS count
  FROM products
  WHERE status <> 'stop'
  GROUP BY 1
  ORDER BY
    CASE
      WHEN stock = 0     THEN 1
      WHEN stock <= 5    THEN 2
      WHEN stock <= 20   THEN 3
      ELSE 4
    END;
$$;

-- ── 인기 상품 Top 10 (기간) ─────────────────────────────────────
CREATE OR REPLACE FUNCTION analytics_top_products(
  p_from  DATE DEFAULT CURRENT_DATE - 29,
  p_to    DATE DEFAULT CURRENT_DATE,
  p_limit INT  DEFAULT 10
)
RETURNS TABLE (
  product_id   UUID,
  product_name TEXT,
  qty_sold     BIGINT,
  revenue      BIGINT,
  order_count  BIGINT
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    oi.product_id,
    oi.product_name,
    SUM(oi.quantity)::BIGINT                                           AS qty_sold,
    SUM(COALESCE(oi.sale_price, oi.unit_price) * oi.quantity)::BIGINT AS revenue,
    COUNT(DISTINCT oi.order_id)::BIGINT                                AS order_count
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE
    o.created_at::DATE BETWEEN p_from AND p_to
    AND o.status NOT IN ('cancelled', 'returned')
  GROUP BY oi.product_id, oi.product_name
  ORDER BY revenue DESC
  LIMIT p_limit;
$$;

SELECT 'Analytics functions ready' AS status;
