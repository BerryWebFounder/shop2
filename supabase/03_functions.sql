-- ================================================================
-- 03. 함수 & 프로시저
-- ================================================================

-- ── updated_at 자동 갱신 ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ── 이메일 첫 글자 추출 (마스킹용) ───────────────────────────────────
CREATE OR REPLACE FUNCTION first_char(s TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT SUBSTRING(s, 1, 1);
$$;

-- ── 주문번호 자동 생성 ──────────────────────────────────────────────
-- 형식: ORD-YYYYMMDD-XXXXX (5자리 시퀀스)
CREATE SEQUENCE IF NOT EXISTS order_seq START 1 INCREMENT 1;

CREATE OR REPLACE FUNCTION generate_order_no()
RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
  RETURN 'ORD-' ||
         TO_CHAR(NOW() AT TIME ZONE 'Asia/Seoul', 'YYYYMMDD') ||
         '-' ||
         LPAD(NEXTVAL('order_seq')::TEXT, 5, '0');
END;
$$;

-- ── 상품 일련번호 자동 생성 ─────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS product_seq START 1 INCREMENT 1;

CREATE OR REPLACE FUNCTION generate_serial_no()
RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
  RETURN 'P' || LPAD(NEXTVAL('product_seq')::TEXT, 4, '0');
END;
$$;

-- ── 재고 자동 차감 (주문 확정 시) ──────────────────────────────────
CREATE OR REPLACE FUNCTION deduct_stock()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  item RECORD;
BEGIN
  -- 상태가 pending → paid 로 변경될 때만 재고 차감
  IF OLD.status = 'pending' AND NEW.status = 'paid' THEN
    FOR item IN
      SELECT product_id, quantity FROM order_items WHERE order_id = NEW.id
    LOOP
      UPDATE products
      SET
        stock  = GREATEST(stock - item.quantity, 0),
        status = CASE
                   WHEN GREATEST(stock - item.quantity, 0) = 0 THEN 'soldout'
                   ELSE status
                 END
      WHERE id = item.product_id;
    END LOOP;
  END IF;

  -- 주문 취소/반품 → 재고 복구
  IF OLD.status IN ('paid', 'shipping') AND NEW.status IN ('cancelled', 'returned') THEN
    FOR item IN
      SELECT product_id, quantity FROM order_items WHERE order_id = NEW.id
    LOOP
      UPDATE products
      SET
        stock  = stock + item.quantity,
        -- 재고가 다시 생기면 판매중으로 복귀 (stop은 유지)
        status = CASE
                   WHEN status = 'soldout' THEN 'sale'
                   ELSE status
                 END
      WHERE id = item.product_id;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- ── 휴면 자동 전환 ──────────────────────────────────────────────────
-- Vercel Cron Job (API Route /api/cron/dormant) 에서도 호출하지만
-- Supabase Pro의 pg_cron을 사용할 경우 직접 스케줄링 가능
CREATE OR REPLACE FUNCTION auto_dormant()
RETURNS TABLE (converted_count INT, cutoff_date TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_dormant_days INT;
  v_cutoff       TIMESTAMPTZ;
  v_count        INT;
BEGIN
  -- 설정에서 기준일 조회
  SELECT COALESCE(dormant_days, 365)
    INTO v_dormant_days
    FROM admin_settings
   LIMIT 1;

  v_cutoff := NOW() - (v_dormant_days || ' days')::INTERVAL;

  -- 기준일 이상 미접속 활성 회원 → 휴면 전환
  WITH updated AS (
    UPDATE members
    SET
      status       = 'dormant',
      dormant_date = NOW()
    WHERE
      status     = 'active'
      AND last_login < v_cutoff
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM updated;

  RETURN QUERY SELECT v_count, v_cutoff;
END;
$$;

COMMENT ON FUNCTION auto_dormant() IS
  'KISA 기준 휴면 전환 함수. 설정된 기준일 이상 미접속 활성 회원을 휴면으로 일괄 전환합니다.';

-- ── 이벤트 상태 자동 갱신 ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION sync_event_status()
RETURNS TABLE (activated INT, ended INT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_today    DATE := CURRENT_DATE;
  v_activated INT;
  v_ended     INT;
BEGIN
  -- 시작일 도래 → scheduled → active
  WITH upd AS (
    UPDATE events
    SET status = 'active', updated_at = NOW()
    WHERE status = 'scheduled'
      AND start_date <= v_today
      AND end_date   >= v_today
    RETURNING id
  ) SELECT COUNT(*) INTO v_activated FROM upd;

  -- 종료일 지남 → ended
  WITH upd AS (
    UPDATE events
    SET status = 'ended', updated_at = NOW()
    WHERE status IN ('active', 'scheduled')
      AND end_date < v_today
    RETURNING id
  ) SELECT COUNT(*) INTO v_ended FROM upd;

  RETURN QUERY SELECT v_activated, v_ended;
END;
$$;

COMMENT ON FUNCTION sync_event_status() IS
  '이벤트 상태 자동 갱신. 시작일 도래 시 active, 종료일 초과 시 ended로 전환합니다.';

-- ── 회원 탈퇴 처리 (PII 파기) ──────────────────────────────────────
-- 전자상거래법: 주문 정보는 별도 보관, 개인정보(이름·전화·주소)만 파기
CREATE OR REPLACE FUNCTION withdraw_member(p_member_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE members
  SET
    status        = 'withdrawn',
    withdraw_date = NOW(),
    -- PII 즉시 파기 (전화, 주소)
    phone         = NULL,
    address       = NULL,
    -- 이름은 '탈퇴회원'으로 대체 (주문 내역 연결 유지)
    name          = '탈퇴회원',
    updated_at    = NOW()
  WHERE id = p_member_id
    AND status <> 'withdrawn';  -- 이미 탈퇴한 경우 무시

  IF NOT FOUND THEN
    RAISE EXCEPTION '유효하지 않은 회원 ID이거나 이미 탈퇴 처리된 회원입니다.';
  END IF;
END;
$$;

COMMENT ON FUNCTION withdraw_member(UUID) IS
  '회원 탈퇴 처리. 개인정보보호법에 따라 PII(전화, 주소)를 즉시 파기하고 이름을 탈퇴회원으로 대체합니다.';

-- ── 주간 매출 집계 함수 (API Route용) ──────────────────────────────
CREATE OR REPLACE FUNCTION weekly_sales()
RETURNS TABLE (
  sale_date   DATE,
  revenue     BIGINT,
  order_count BIGINT
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    created_at::DATE          AS sale_date,
    SUM(total_amount)::BIGINT AS revenue,
    COUNT(*)::BIGINT          AS order_count
  FROM orders
  WHERE
    created_at >= NOW() - INTERVAL '7 days'
    AND status  <> 'cancelled'
  GROUP BY created_at::DATE
  ORDER BY sale_date;
$$;

-- ── 전시 가능 상품 목록 (전시 등록 모달용) ─────────────────────────
CREATE OR REPLACE FUNCTION available_products_for_display(p_event_id UUID DEFAULT NULL)
RETURNS TABLE (
  id         UUID,
  serial_no  TEXT,
  name       TEXT,
  price      INT,
  sale_price INT,
  stock      INT,
  status     TEXT,
  cat1_name  TEXT,
  already_displayed BOOLEAN
) LANGUAGE sql STABLE AS $$
  SELECT
    p.id,
    p.serial_no,
    p.name,
    p.price,
    p.sale_price,
    p.stock,
    p.status,
    c1.name AS cat1_name,
    EXISTS (
      SELECT 1 FROM display_items d
      WHERE d.product_id = p.id
        AND (
          (p_event_id IS NULL AND d.display_type = 'default') OR
          (p_event_id IS NOT NULL AND d.event_id = p_event_id)
        )
    ) AS already_displayed
  FROM products p
  LEFT JOIN categories c1 ON c1.id = p.cat1_id
  WHERE p.status <> 'stop'
  ORDER BY p.created_at DESC;
$$;

SELECT 'Functions ready' AS status;
