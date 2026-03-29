-- ================================================================
-- 결제 스키마 (토스페이먼츠 기반)
-- ================================================================

-- ── 결제 수단 타입 ────────────────────────────────────────────────
CREATE TYPE payment_method AS ENUM (
  'card',          -- 신용/체크카드
  'virtual_account', -- 가상계좌 (무통장입금)
  'account_transfer', -- 계좌이체
  'mobile',        -- 휴대폰 소액결제
  'kakaopay',      -- 카카오페이
  'naverpay',      -- 네이버페이
  'tosspay'        -- 토스페이
);

CREATE TYPE payment_status AS ENUM (
  'ready',         -- 결제 준비
  'in_progress',   -- 결제 진행 중
  'waiting_for_deposit', -- 가상계좌 입금 대기
  'done',          -- 결제 완료
  'canceled',      -- 취소
  'partial_canceled', -- 부분 취소
  'aborted',       -- 결제 중단
  'expired'        -- 만료
);

-- ── 결제 테이블 ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id               UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id         UUID           NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  -- 토스페이먼츠 식별자
  payment_key      TEXT,                    -- 토스 paymentKey (결제 성공 후 확정)
  order_id_toss    TEXT           NOT NULL, -- 토스에 전달하는 orderId (UUID)

  -- 결제 정보
  amount           INT            NOT NULL CHECK (amount > 0),
  method           payment_method,
  status           payment_status NOT NULL DEFAULT 'ready',
  currency         TEXT           NOT NULL DEFAULT 'KRW',

  -- 가상계좌 정보
  virtual_account_number TEXT,
  virtual_account_bank   TEXT,
  virtual_account_due    TIMESTAMPTZ,

  -- 카드 정보 (마스킹)
  card_number      TEXT,          -- 마지막 4자리만 저장
  card_company     TEXT,

  -- 취소 정보
  cancel_amount    INT            NOT NULL DEFAULT 0,
  cancel_reason    TEXT,
  canceled_at      TIMESTAMPTZ,

  -- 토스 응답 원본 (디버깅용)
  toss_response    JSONB,

  -- 쿠폰/포인트 (orders 테이블과 중복이지만 결제 스냅샷용)
  coupon_discount  INT            NOT NULL DEFAULT 0,
  point_used       INT            NOT NULL DEFAULT 0,

  approved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  CONSTRAINT payments_payment_key_key UNIQUE (payment_key),
  CONSTRAINT payments_order_id_toss_key UNIQUE (order_id_toss)
);

CREATE INDEX IF NOT EXISTS idx_payments_order     ON payments (order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status    ON payments (status);
CREATE INDEX IF NOT EXISTS idx_payments_method    ON payments (method);
CREATE INDEX IF NOT EXISTS idx_payments_key       ON payments (payment_key);
CREATE INDEX IF NOT EXISTS idx_payments_created   ON payments (created_at DESC);

-- ── updated_at 트리거 ─────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_payments_updated_at ON payments;
CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 결제 완료 시 주문 상태 → paid 자동 변경 ──────────────────────
CREATE OR REPLACE FUNCTION trg_payment_done_update_order()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'done' AND OLD.status <> 'done' THEN
    UPDATE orders
    SET status = 'paid', updated_at = NOW()
    WHERE id = NEW.order_id AND status = 'pending';
  END IF;

  IF NEW.status IN ('canceled', 'aborted', 'expired')
     AND OLD.status NOT IN ('canceled', 'aborted', 'expired') THEN
    UPDATE orders
    SET status = 'cancelled', updated_at = NOW()
    WHERE id = NEW.order_id AND status IN ('pending', 'paid');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payments_order_status ON payments;
CREATE TRIGGER trg_payments_order_status
  AFTER UPDATE OF status ON payments
  FOR EACH ROW EXECUTE FUNCTION trg_payment_done_update_order();

-- ── orders 테이블에 결제 컬럼 추가 ───────────────────────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS paid_at        TIMESTAMPTZ;

-- ── 대시보드용 결제 통계 뷰 ──────────────────────────────────────
DROP VIEW IF EXISTS payment_stats_view CASCADE;
CREATE VIEW payment_stats_view AS
SELECT
  DATE_TRUNC('day', created_at AT TIME ZONE 'Asia/Seoul')::DATE AS date,
  method,
  COUNT(*) FILTER (WHERE status = 'done')::INT                  AS success_count,
  COUNT(*) FILTER (WHERE status IN ('canceled','aborted'))::INT  AS fail_count,
  SUM(amount - cancel_amount) FILTER (WHERE status = 'done')::BIGINT AS net_revenue
FROM payments
GROUP BY DATE_TRUNC('day', created_at AT TIME ZONE 'Asia/Seoul')::DATE, method
ORDER BY date DESC;

-- ── RLS ──────────────────────────────────────────────────────────
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments: admin all" ON payments FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 결제 생성은 서버사이드(service_role)에서 처리
CREATE POLICY "payments: server insert" ON payments FOR INSERT
  WITH CHECK (TRUE);

SELECT 'Payment schema ready' AS status;
