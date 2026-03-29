-- ================================================================
-- 대시보드 통계 함수 모음
-- ================================================================

-- ── 실시간 오늘 KPI ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION dashboard_today_kpi()
RETURNS TABLE (
  today_revenue     BIGINT,
  today_orders      BIGINT,
  today_members     BIGINT,
  yesterday_revenue BIGINT,
  yesterday_orders  BIGINT,
  yesterday_members BIGINT,
  -- 대기 처리 건수
  pending_orders    BIGINT,
  pending_reviews   BIGINT,
  pending_inquiries BIGINT,
  low_stock_count   BIGINT,
  -- 전체 누계
  total_members     BIGINT,
  total_revenue     BIGINT
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    -- 오늘 매출 (취소/반품 제외)
    COALESCE(SUM(total_amount) FILTER (
      WHERE created_at::DATE = CURRENT_DATE
        AND status NOT IN ('cancelled','returned')
    ), 0)::BIGINT,
    -- 오늘 주문
    COUNT(*) FILTER (WHERE created_at::DATE = CURRENT_DATE)::BIGINT,
    -- 오늘 신규 회원 (subquery)
    (SELECT COUNT(*) FROM members WHERE join_date::DATE = CURRENT_DATE)::BIGINT,
    -- 어제 매출
    COALESCE(SUM(total_amount) FILTER (
      WHERE created_at::DATE = CURRENT_DATE - 1
        AND status NOT IN ('cancelled','returned')
    ), 0)::BIGINT,
    -- 어제 주문
    COUNT(*) FILTER (WHERE created_at::DATE = CURRENT_DATE - 1)::BIGINT,
    -- 어제 신규 회원
    (SELECT COUNT(*) FROM members WHERE join_date::DATE = CURRENT_DATE - 1)::BIGINT,
    -- 결제 대기 주문
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT,
    -- 검토 대기 리뷰
    (SELECT COUNT(*) FROM product_reviews WHERE status = 'pending')::BIGINT,
    -- 미답변 문의
    (SELECT COUNT(*) FROM inquiries WHERE status IN ('pending','in_progress'))::BIGINT,
    -- 재고 부족 상품 (5개 이하)
    (SELECT COUNT(*) FROM products WHERE stock <= 5 AND status = 'sale')::BIGINT,
    -- 전체 회원
    (SELECT COUNT(*) FROM members WHERE status <> 'withdrawn')::BIGINT,
    -- 전체 누적 매출
    COALESCE(SUM(total_amount) FILTER (WHERE status NOT IN ('cancelled','returned')), 0)::BIGINT
  FROM orders;
$$;

-- ── 최근 7일 일별 통계 ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION dashboard_weekly_stats()
RETURNS TABLE (
  date          DATE,
  revenue       BIGINT,
  orders        BIGINT,
  new_members   BIGINT,
  avg_order_amt NUMERIC
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    gs::DATE AS date,
    COALESCE(SUM(o.total_amount) FILTER (WHERE o.status NOT IN ('cancelled','returned')), 0)::BIGINT,
    COUNT(DISTINCT o.id)::BIGINT,
    COUNT(DISTINCT m.id)::BIGINT,
    COALESCE(AVG(o.total_amount) FILTER (WHERE o.status NOT IN ('cancelled','returned')), 0)::NUMERIC
  FROM generate_series(CURRENT_DATE - 6, CURRENT_DATE, '1 day') gs
  LEFT JOIN orders  o ON o.created_at::DATE = gs::DATE
  LEFT JOIN members m ON m.join_date::DATE  = gs::DATE AND m.status <> 'withdrawn'
  GROUP BY gs::DATE
  ORDER BY date;
$$;

-- ── 실시간 주문 현황 (최근 10건) ─────────────────────────────────
CREATE OR REPLACE FUNCTION dashboard_recent_orders(p_limit INT DEFAULT 10)
RETURNS TABLE (
  id            UUID,
  order_no      TEXT,
  status        TEXT,
  total_amount  BIGINT,
  member_name   TEXT,
  created_at    TIMESTAMPTZ
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    o.id, o.order_no, o.status, o.total_amount::BIGINT,
    m.name AS member_name, o.created_at
  FROM orders o
  LEFT JOIN members m ON m.id = o.member_id
  ORDER BY o.created_at DESC
  LIMIT p_limit;
$$;

-- ── 재고 위험 상품 ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION dashboard_low_stock(p_limit INT DEFAULT 10)
RETURNS TABLE (
  id       UUID,
  name     TEXT,
  stock    INT,
  status   TEXT,
  cat_name TEXT
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    p.id, p.name, p.stock, p.status,
    c.name AS cat_name
  FROM products p
  LEFT JOIN categories c ON c.id = p.cat1_id
  WHERE p.status = 'sale'
  ORDER BY p.stock ASC
  LIMIT p_limit;
$$;

-- ── 인기 상품 Top 5 (오늘) ────────────────────────────────────────
CREATE OR REPLACE FUNCTION dashboard_top_products_today(p_limit INT DEFAULT 5)
RETURNS TABLE (
  product_id   UUID,
  product_name TEXT,
  qty_sold     BIGINT,
  revenue      BIGINT
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    oi.product_id,
    oi.product_name,
    SUM(oi.quantity)::BIGINT AS qty_sold,
    SUM(COALESCE(oi.sale_price, oi.unit_price) * oi.quantity)::BIGINT AS revenue
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE o.created_at::DATE = CURRENT_DATE
    AND o.status NOT IN ('cancelled','returned')
  GROUP BY oi.product_id, oi.product_name
  ORDER BY revenue DESC
  LIMIT p_limit;
$$;

-- ── 등급별 회원 분포 ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION dashboard_member_grade_dist()
RETURNS TABLE (
  grade TEXT,
  count BIGINT
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT grade, COUNT(*)::BIGINT
  FROM members
  WHERE status = 'active'
  GROUP BY grade
  ORDER BY
    CASE grade WHEN 'bronze' THEN 1 WHEN 'silver' THEN 2
               WHEN 'gold'   THEN 3 WHEN 'vip'    THEN 4 ELSE 5 END;
$$;

SELECT 'Dashboard functions ready' AS status;
