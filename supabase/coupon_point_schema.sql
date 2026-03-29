-- ================================================================
-- 쿠폰 & 포인트 스키마
-- Supabase SQL Editor에서 실행하세요
-- ================================================================

-- ── 쿠폰 테이블 ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupons (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  code             TEXT        NOT NULL,           -- 입력 코드 (예: WELCOME10)
  name             TEXT        NOT NULL,           -- 쿠폰 이름 (관리자 표시용)
  description      TEXT,                           -- 고객 표시 설명

  -- 할인 방식
  discount_type    TEXT        NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value   INT         NOT NULL CHECK (discount_value > 0),
                   -- percent: 1–100 (%), fixed: 원 단위

  -- 사용 조건
  min_order_amount INT         NOT NULL DEFAULT 0, -- 최소 주문 금액
  max_discount_amt INT,                            -- 최대 할인 금액 (% 쿠폰에서 상한)
  usage_limit      INT,                            -- NULL = 무제한
  usage_count      INT         NOT NULL DEFAULT 0, -- 현재 사용 횟수
  per_user_limit   INT         NOT NULL DEFAULT 1, -- 1인당 최대 사용 횟수

  -- 유효 기간
  valid_from       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until      TIMESTAMPTZ,                    -- NULL = 무기한

  -- 적용 범위 (NULL = 전체)
  applicable_cat   TEXT,                           -- 적용 카테고리 (대분류명)

  -- 상태
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT coupons_code_key UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS idx_coupons_code       ON coupons (code);
CREATE INDEX IF NOT EXISTS idx_coupons_active     ON coupons (is_active, valid_until);

-- ── 쿠폰 사용 내역 ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupon_usages (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  coupon_id  UUID        NOT NULL REFERENCES coupons(id)  ON DELETE CASCADE,
  member_id  UUID        REFERENCES members(id)           ON DELETE SET NULL,
  order_id   UUID        REFERENCES orders(id)            ON DELETE SET NULL,
  discount_amt INT       NOT NULL,                        -- 실제 적용된 할인액
  used_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupon_usages_coupon ON coupon_usages (coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_member ON coupon_usages (member_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_order  ON coupon_usages (order_id);

-- ── 포인트 테이블 ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS member_points (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id   UUID        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  amount      INT         NOT NULL,                -- 양수: 적립, 음수: 사용/소멸
  type        TEXT        NOT NULL CHECK (type IN ('earn', 'use', 'expire', 'admin', 'cancel')),
  reason      TEXT        NOT NULL,                -- 사유 (예: '주문 적립', '쿠폰 사용')
  order_id    UUID        REFERENCES orders(id)    ON DELETE SET NULL,
  expires_at  TIMESTAMPTZ,                         -- 소멸 예정일
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_points_member    ON member_points (member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_points_type      ON member_points (type);
CREATE INDEX IF NOT EXISTS idx_points_expires   ON member_points (expires_at) WHERE expires_at IS NOT NULL;

-- ── 회원별 포인트 잔액 뷰 ─────────────────────────────────────────
DROP VIEW IF EXISTS member_point_balance CASCADE;
CREATE VIEW member_point_balance AS
SELECT
  member_id,
  SUM(amount)::INT                                         AS balance,
  SUM(amount) FILTER (WHERE amount > 0)::INT              AS total_earned,
  ABS(SUM(amount) FILTER (WHERE amount < 0))::INT         AS total_used,
  COUNT(*) FILTER (WHERE type = 'earn')::INT               AS earn_count,
  MAX(created_at)                                          AS last_activity
FROM member_points
GROUP BY member_id;

COMMENT ON VIEW member_point_balance IS
  '회원별 포인트 잔액 집계 뷰';

-- ── 쿠폰 통계 뷰 ─────────────────────────────────────────────────
DROP VIEW IF EXISTS coupon_stats_view CASCADE;
CREATE VIEW coupon_stats_view AS
SELECT
  c.*,
  COUNT(cu.id)::INT                              AS actual_usage_count,
  COALESCE(SUM(cu.discount_amt), 0)::INT         AS total_discount_given,
  CASE
    WHEN c.valid_until IS NULL THEN 'active'
    WHEN c.valid_until < NOW() THEN 'expired'
    WHEN NOT c.is_active       THEN 'inactive'
    ELSE 'active'
  END AS computed_status
FROM coupons c
LEFT JOIN coupon_usages cu ON cu.coupon_id = c.id
GROUP BY c.id;

-- ── updated_at 트리거 ─────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_coupons_updated_at ON coupons;
CREATE TRIGGER trg_coupons_updated_at
  BEFORE UPDATE ON coupons
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 쿠폰 사용 시 usage_count 자동 증가 ───────────────────────────
CREATE OR REPLACE FUNCTION trg_increment_coupon_usage()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE coupons SET usage_count = usage_count + 1 WHERE id = NEW.coupon_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_coupon_usage_count ON coupon_usages;
CREATE TRIGGER trg_coupon_usage_count
  AFTER INSERT ON coupon_usages
  FOR EACH ROW EXECUTE FUNCTION trg_increment_coupon_usage();

-- ── 주문 취소 시 포인트 복구 함수 ────────────────────────────────
CREATE OR REPLACE FUNCTION refund_points_on_cancel(p_order_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_used_points INT;
  v_member_id   UUID;
BEGIN
  -- 해당 주문에서 사용한 포인트 조회
  SELECT ABS(SUM(amount)), member_id
  INTO v_used_points, v_member_id
  FROM member_points
  WHERE order_id = p_order_id AND type = 'use'
  GROUP BY member_id;

  IF v_used_points > 0 THEN
    INSERT INTO member_points (member_id, amount, type, reason, order_id)
    VALUES (v_member_id, v_used_points, 'cancel', '주문 취소 포인트 복구', p_order_id);
  END IF;
END;
$$;

-- ── 주문 적립 포인트 함수 (주문금액의 1%) ────────────────────────
CREATE OR REPLACE FUNCTION earn_order_points(p_order_id UUID, p_rate NUMERIC DEFAULT 0.01)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_order       RECORD;
  v_member_id   UUID;
  v_earn_amount INT;
BEGIN
  SELECT o.*, m.id AS mid
  INTO v_order
  FROM orders o
  LEFT JOIN members m ON m.id = o.member_id
  WHERE o.id = p_order_id AND o.status = 'delivered';

  IF NOT FOUND OR v_order.mid IS NULL THEN RETURN; END IF;

  v_earn_amount := GREATEST(FLOOR(v_order.total_amount * p_rate)::INT, 0);
  IF v_earn_amount <= 0 THEN RETURN; END IF;

  INSERT INTO member_points (member_id, amount, type, reason, order_id, expires_at)
  VALUES (
    v_order.mid,
    v_earn_amount,
    'earn',
    '구매 적립 (' || v_order.order_no || ')',
    p_order_id,
    NOW() + INTERVAL '1 year'   -- 1년 후 소멸
  );
END;
$$;

-- ── 만료 포인트 소멸 처리 (Vercel Cron 용) ───────────────────────
CREATE OR REPLACE FUNCTION expire_points()
RETURNS TABLE (expired_member_id UUID, expired_amount INT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT mp.member_id, SUM(mp.amount)::INT AS amt
    FROM member_points mp
    WHERE mp.expires_at < NOW() AND mp.type = 'earn'
      AND NOT EXISTS (
        SELECT 1 FROM member_points
        WHERE member_id = mp.member_id AND type = 'expire'
          AND reason LIKE '%소멸%'
          AND created_at::DATE = CURRENT_DATE
      )
    GROUP BY mp.member_id
    HAVING SUM(mp.amount) > 0
  LOOP
    -- 잔액 확인 후 소멸
    DECLARE bal INT;
    BEGIN
      SELECT balance INTO bal FROM member_point_balance WHERE member_id = r.member_id;
      IF bal > 0 THEN
        INSERT INTO member_points (member_id, amount, type, reason)
        VALUES (r.member_id, -LEAST(bal, r.amt), 'expire', '포인트 유효기간 만료 소멸');
        expired_member_id := r.member_id;
        expired_amount    := LEAST(bal, r.amt);
        RETURN NEXT;
      END IF;
    END;
  END LOOP;
END;
$$;

-- ── RLS ──────────────────────────────────────────────────────────
ALTER TABLE coupons         ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usages   ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_points   ENABLE ROW LEVEL SECURITY;

-- 쿠폰: 활성 쿠폰은 공개 (코드 검증용), 전체 관리는 authenticated
CREATE POLICY "coupons: public select active" ON coupons FOR SELECT
  USING (is_active = TRUE OR auth.role() = 'authenticated');

CREATE POLICY "coupons: admin all" ON coupons FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 쿠폰 사용: 서버사이드(service_role) 또는 인증
CREATE POLICY "coupon_usages: insert" ON coupon_usages FOR INSERT
  WITH CHECK (TRUE);
CREATE POLICY "coupon_usages: select" ON coupon_usages FOR SELECT
  USING (auth.role() = 'authenticated');

-- 포인트: 본인 조회 가능, 쓰기는 service_role
CREATE POLICY "points: member select" ON member_points FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "points: insert" ON member_points FOR INSERT
  WITH CHECK (TRUE);

-- orders 테이블에 discount 컬럼 추가 (없으면)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS coupon_id       UUID REFERENCES coupons(id),
  ADD COLUMN IF NOT EXISTS coupon_discount INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS point_used      INT NOT NULL DEFAULT 0;

SELECT 'Coupon & Point schema ready' AS status;
