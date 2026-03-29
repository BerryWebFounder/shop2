-- ================================================================
-- 주문 관리 고도화 스키마
-- - 주문 상태 변경 이력 (타임라인)
-- - 송장 정보
-- ================================================================

-- ── 주문 상태 변경 이력 테이블 ───────────────────────────────────
CREATE TABLE IF NOT EXISTS order_status_history (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status TEXT,                        -- 변경 전 상태 (NULL = 최초)
  to_status   TEXT        NOT NULL,        -- 변경 후 상태
  memo        TEXT,                        -- 변경 메모 (관리자 입력)
  changed_by  TEXT        NOT NULL DEFAULT 'system',  -- 변경자 (admin/system/customer)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_history_order
  ON order_status_history (order_id, created_at DESC);

-- ── 송장 정보 테이블 ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_shipments (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  carrier_code    TEXT        NOT NULL,   -- 택배사 코드 (cj, lotte, hanjin 등)
  carrier_name    TEXT        NOT NULL,   -- 택배사 이름
  tracking_number TEXT        NOT NULL,   -- 운송장 번호
  tracking_url    TEXT,                   -- 택배사 추적 URL
  shipped_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at    TIMESTAMPTZ,
  memo            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT shipments_order_key UNIQUE (order_id)  -- 주문당 1개 송장
);

CREATE INDEX IF NOT EXISTS idx_shipments_order    ON order_shipments (order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking ON order_shipments (carrier_code, tracking_number);

-- ── updated_at 트리거 ─────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_shipments_updated_at ON order_shipments;
CREATE TRIGGER trg_shipments_updated_at
  BEFORE UPDATE ON order_shipments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 주문 상태 변경 시 자동 이력 기록 트리거 ──────────────────────
CREATE OR REPLACE FUNCTION trg_record_order_status_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_status_history (order_id, from_status, to_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, 'system');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_status_history ON orders;
CREATE TRIGGER trg_order_status_history
  AFTER UPDATE OF status ON orders
  FOR EACH ROW EXECUTE FUNCTION trg_record_order_status_change();

-- ── 주문 상세 뷰 (송장 포함) ─────────────────────────────────────
DROP VIEW IF EXISTS order_detail_view CASCADE;
CREATE VIEW order_detail_view AS
SELECT
  o.*,
  -- 회원 정보
  m.name        AS member_name,
  m.email       AS member_email,
  m.phone       AS member_phone,
  -- 쿠폰 정보
  c.code        AS coupon_code,
  c.name        AS coupon_name,
  -- 송장 정보
  s.carrier_code,
  s.carrier_name,
  s.tracking_number,
  s.tracking_url,
  s.shipped_at,
  s.delivered_at AS shipment_delivered_at
FROM orders o
LEFT JOIN members         m ON m.id = o.member_id
LEFT JOIN coupons         c ON c.id = o.coupon_id
LEFT JOIN order_shipments s ON s.order_id = o.id;

-- ── 주문 통계 함수 (상태별) ───────────────────────────────────────
CREATE OR REPLACE FUNCTION order_stats_by_status(
  p_from DATE DEFAULT CURRENT_DATE - 29,
  p_to   DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  status      TEXT,
  count       BIGINT,
  total_amount BIGINT
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    status,
    COUNT(*)::BIGINT,
    SUM(total_amount)::BIGINT
  FROM orders
  WHERE created_at::DATE BETWEEN p_from AND p_to
  GROUP BY status
  ORDER BY count DESC;
$$;

-- ── orders 테이블에 송장 관련 컬럼 추가 ─────────────────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS carrier_code    TEXT,
  ADD COLUMN IF NOT EXISTS shipped_at      TIMESTAMPTZ;

-- ── RLS ──────────────────────────────────────────────────────────
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_shipments      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "history: admin all" ON order_status_history FOR ALL
  USING (auth.role() = 'authenticated');
CREATE POLICY "history: insert" ON order_status_history FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "shipments: admin all" ON order_shipments FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "shipments: member select" ON order_shipments FOR SELECT
  USING (TRUE);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER TABLE orders REPLICA IDENTITY FULL;

SELECT 'Order management schema ready' AS status;
