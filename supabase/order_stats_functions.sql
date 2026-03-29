-- ================================================================
-- 주문 통계 RPC 함수 (Supabase SQL Editor에서 실행)
-- /api/orders/stats 에서 호출됩니다
-- ================================================================

-- ── 상태별 주문 수 / 금액 ────────────────────────────────────────
CREATE OR REPLACE FUNCTION order_stats_by_status(
  p_from TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_to   TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  status        TEXT,
  order_count   BIGINT,
  total_revenue BIGINT
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    status,
    COUNT(*)::BIGINT          AS order_count,
    SUM(total_amount)::BIGINT AS total_revenue
  FROM orders
  WHERE created_at BETWEEN p_from AND p_to
  GROUP BY status
  ORDER BY
    CASE status
      WHEN 'pending'   THEN 1
      WHEN 'paid'      THEN 2
      WHEN 'shipping'  THEN 3
      WHEN 'delivered' THEN 4
      WHEN 'returned'  THEN 5
      WHEN 'cancelled' THEN 6
    END;
$$;

-- ── 일별 매출 집계 ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION order_stats_daily(
  p_from TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_to   TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  sale_date   DATE,
  order_count BIGINT,
  revenue     BIGINT
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    created_at::DATE          AS sale_date,
    COUNT(*)::BIGINT          AS order_count,
    SUM(total_amount)::BIGINT AS revenue
  FROM orders
  WHERE
    created_at BETWEEN p_from AND p_to
    AND status NOT IN ('cancelled', 'returned')
  GROUP BY created_at::DATE
  ORDER BY sale_date;
$$;

-- ── 인기 상품 Top N ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION order_top_products(
  p_from  TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_to    TIMESTAMPTZ DEFAULT NOW(),
  p_limit INT         DEFAULT 5
)
RETURNS TABLE (
  product_id    UUID,
  product_name  TEXT,
  total_qty     BIGINT,
  total_revenue BIGINT
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    oi.product_id,
    oi.product_name,
    SUM(oi.quantity)::BIGINT                                AS total_qty,
    SUM((COALESCE(oi.sale_price, oi.unit_price)) * oi.quantity)::BIGINT AS total_revenue
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE
    o.created_at BETWEEN p_from AND p_to
    AND o.status NOT IN ('cancelled', 'returned')
  GROUP BY oi.product_id, oi.product_name
  ORDER BY total_qty DESC
  LIMIT p_limit;
$$;

-- ── 회원별 구매 현황 ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION member_purchase_summary(p_member_id UUID)
RETURNS TABLE (
  total_orders  BIGINT,
  total_spent   BIGINT,
  avg_order_amt NUMERIC,
  first_order   TIMESTAMPTZ,
  last_order    TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    COUNT(*)::BIGINT                    AS total_orders,
    SUM(total_amount)::BIGINT           AS total_spent,
    AVG(total_amount)::NUMERIC(12,0)    AS avg_order_amt,
    MIN(created_at)                     AS first_order,
    MAX(created_at)                     AS last_order
  FROM orders
  WHERE
    member_id = p_member_id
    AND status NOT IN ('cancelled', 'returned');
$$;

SELECT 'Order stats functions ready' AS status;
