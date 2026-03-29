-- 대시보드용 주간 매출 집계 함수
CREATE OR REPLACE FUNCTION weekly_sales()
RETURNS TABLE (
  sale_date  DATE,
  revenue    BIGINT,
  order_cnt  BIGINT
) LANGUAGE sql STABLE AS $$
  SELECT
    created_at::DATE          AS sale_date,
    SUM(total_amount)::BIGINT AS revenue,
    COUNT(*)::BIGINT          AS order_cnt
  FROM orders
  WHERE
    created_at >= NOW() - INTERVAL '7 days'
    AND status <> 'cancelled'
  GROUP BY created_at::DATE
  ORDER BY sale_date;
$$;
