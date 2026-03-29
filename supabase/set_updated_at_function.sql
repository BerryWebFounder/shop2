-- ================================================================
-- set_updated_at() 트리거 함수
-- 이미 03_functions.sql에 있다면 생략해도 됩니다
-- ================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ── generate_order_no() — 주문번호 생성 ──────────────────────────
CREATE OR REPLACE FUNCTION generate_order_no()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  v_date TEXT := TO_CHAR(NOW() AT TIME ZONE 'Asia/Seoul', 'YYYYMMDD');
  v_seq  INT;
BEGIN
  SELECT COUNT(*) + 1 INTO v_seq
  FROM orders
  WHERE created_at::DATE = CURRENT_DATE;
  RETURN 'ORD-' || v_date || '-' || LPAD(v_seq::TEXT, 5, '0');
END;
$$;

-- ── generate_serial_no() — 상품 일련번호 ─────────────────────────
CREATE OR REPLACE FUNCTION generate_serial_no()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE v_seq INT;
BEGIN
  SELECT COUNT(*) + 1 INTO v_seq FROM products;
  RETURN 'P-' || LPAD(v_seq::TEXT, 6, '0');
END;
$$;

-- ── update_member_last_login() — 마지막 로그인 갱신 ──────────────
CREATE OR REPLACE FUNCTION update_member_last_login(p_email TEXT)
RETURNS VOID LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE members SET last_login = NOW() WHERE email = p_email;
$$;

SELECT 'Common functions ready' AS status;
