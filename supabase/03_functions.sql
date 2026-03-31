-- ================================================================
-- 03_functions.sql
-- 전체 함수 정의
--
-- 중복 제거:
--   weekly_sales()      — weekly_sales_function.sql과 03_functions.sql 중복 → 통합
--   set_updated_at()    — set_updated_at_function.sql과 03_functions.sql 중복 → 통합
--   order_stats_by_status() — order_stats_functions.sql과 order_management_schema.sql 중복 → 통합
-- ================================================================

-- ================================================================
-- A. 공용 유틸
-- ================================================================

-- ── updated_at 자동 갱신 (단일 정의) ────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

-- ── 이메일 첫 글자 추출 (마스킹용) ───────────────────────────────
CREATE OR REPLACE FUNCTION first_char(s TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT SUBSTRING(s, 1, 1);
$$;

-- ── 주문번호 자동 생성 ── ORD-YYYYMMDD-XXXXX ─────────────────────
CREATE SEQUENCE IF NOT EXISTS order_seq START 1 INCREMENT 1;

CREATE OR REPLACE FUNCTION generate_order_no()
RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
  RETURN 'ORD-' ||
         TO_CHAR(NOW() AT TIME ZONE 'Asia/Seoul', 'YYYYMMDD') ||
         '-' || LPAD(NEXTVAL('order_seq')::TEXT, 5, '0');
END;
$$;

-- ── 상품 일련번호 자동 생성 ── P0001 ─────────────────────────────
CREATE SEQUENCE IF NOT EXISTS product_seq START 1 INCREMENT 1;

CREATE OR REPLACE FUNCTION generate_serial_no()
RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
  RETURN 'P' || LPAD(NEXTVAL('product_seq')::TEXT, 4, '0');
END;
$$;

-- ================================================================
-- B. 회원 관련
-- ================================================================

-- ── 휴면 자동 전환 ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION auto_dormant()
RETURNS TABLE (converted_count INT, cutoff_date TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_dormant_days INT;
  v_cutoff       TIMESTAMPTZ;
  v_count        INT;
BEGIN
  SELECT COALESCE(dormant_days, 365) INTO v_dormant_days FROM admin_settings LIMIT 1;
  v_cutoff := NOW() - (v_dormant_days || ' days')::INTERVAL;
  WITH updated AS (
    UPDATE members
    SET status = 'dormant', dormant_date = NOW()
    WHERE status = 'active' AND last_login < v_cutoff
    RETURNING id
  ) SELECT COUNT(*) INTO v_count FROM updated;
  RETURN QUERY SELECT v_count, v_cutoff;
END;
$$;

-- ── 회원 탈퇴 처리 (PII 파기) ────────────────────────────────────
CREATE OR REPLACE FUNCTION withdraw_member(p_member_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE members SET
    status = 'withdrawn', withdraw_date = NOW(),
    phone = NULL, address = NULL, name = '탈퇴회원', updated_at = NOW()
  WHERE id = p_member_id AND status <> 'withdrawn';
  IF NOT FOUND THEN
    RAISE EXCEPTION '유효하지 않은 회원 ID이거나 이미 탈퇴 처리된 회원입니다.';
  END IF;
END;
$$;

-- ── last_login 갱신 ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_member_last_login(p_email TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE members SET last_login = NOW(), updated_at = NOW()
  WHERE email = p_email AND status = 'active';
END;
$$;

-- ── 회원 등급 업데이트 ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_member_grade(p_member_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_member    RECORD;
  v_new_grade TEXT;
  v_old_grade TEXT;
  v_annual    BIGINT;
BEGIN
  SELECT m.grade,
    COALESCE(SUM(o.total_amount) FILTER (
      WHERE EXTRACT(YEAR FROM o.created_at) = EXTRACT(YEAR FROM NOW())
        AND o.status NOT IN ('cancelled','returned')
    ), 0)::BIGINT AS annual
  INTO v_member
  FROM members m LEFT JOIN orders o ON o.member_id = m.id
  WHERE m.id = p_member_id GROUP BY m.grade;
  IF NOT FOUND THEN RETURN NULL; END IF;
  v_old_grade := v_member.grade; v_annual := v_member.annual;

  SELECT grade INTO v_new_grade FROM member_grade_config
  WHERE min_annual_amount <= v_annual ORDER BY min_annual_amount DESC LIMIT 1;
  IF v_new_grade IS NULL THEN v_new_grade := 'bronze'; END IF;

  IF v_new_grade <> v_old_grade THEN
    UPDATE members SET grade = v_new_grade, annual_purchase = v_annual, grade_updated_at = NOW()
    WHERE id = p_member_id;
    INSERT INTO member_grade_history (member_id, from_grade, to_grade, reason, annual_amount)
    VALUES (p_member_id, v_old_grade, v_new_grade, 'auto', v_annual);
  ELSE
    UPDATE members SET annual_purchase = v_annual WHERE id = p_member_id;
  END IF;
  RETURN v_new_grade;
END;
$$;

-- ── 전체 회원 등급 일괄 업데이트 (Cron) ─────────────────────────
CREATE OR REPLACE FUNCTION update_all_member_grades()
RETURNS TABLE (member_id UUID, old_grade TEXT, new_grade TEXT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM members WHERE status = 'active' LOOP
    PERFORM update_member_grade(r.id);
  END LOOP;
  RETURN QUERY
    SELECT h.member_id, h.from_grade, h.to_grade FROM member_grade_history h
    WHERE h.created_at >= NOW() - INTERVAL '5 minutes' AND h.reason = 'auto';
END;
$$;

-- ================================================================
-- C. 주문 & 재고
-- ================================================================

-- ── 재고 자동 차감/복구 ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION deduct_stock()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE item RECORD;
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'paid' THEN
    FOR item IN SELECT product_id, quantity FROM order_items WHERE order_id = NEW.id LOOP
      UPDATE products SET
        stock = GREATEST(stock - item.quantity, 0),
        status = CASE WHEN GREATEST(stock - item.quantity, 0) = 0 THEN 'soldout' ELSE status END
      WHERE id = item.product_id;
    END LOOP;
  END IF;
  IF OLD.status IN ('paid','shipping') AND NEW.status IN ('cancelled','returned') THEN
    FOR item IN SELECT product_id, quantity FROM order_items WHERE order_id = NEW.id LOOP
      UPDATE products SET
        stock = stock + item.quantity,
        status = CASE WHEN status = 'soldout' THEN 'sale' ELSE status END
      WHERE id = item.product_id;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

-- ── 주문 완료 시 회원 통계 자동 업데이트 ─────────────────────────
CREATE OR REPLACE FUNCTION trg_update_member_stats_on_order()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW.status IN ('paid','delivered') AND OLD.status NOT IN ('paid','delivered'))
     OR (NEW.status IN ('cancelled','returned') AND OLD.status NOT IN ('cancelled','returned'))
  THEN
    IF NEW.member_id IS NOT NULL THEN
      UPDATE members SET
        total_purchase = (SELECT COALESCE(SUM(total_amount),0) FROM orders
                          WHERE member_id = NEW.member_id AND status NOT IN ('cancelled','returned')),
        order_count    = (SELECT COUNT(*) FROM orders
                          WHERE member_id = NEW.member_id AND status NOT IN ('cancelled','pending'))
      WHERE id = NEW.member_id;
      PERFORM update_member_grade(NEW.member_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ================================================================
-- D. 이벤트 & 전시
-- ================================================================

-- ── 이벤트 상태 자동 갱신 ────────────────────────────────────────
CREATE OR REPLACE FUNCTION sync_event_status()
RETURNS TABLE (activated INT, ended INT) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_today DATE := CURRENT_DATE; v_activated INT; v_ended INT;
BEGIN
  WITH upd AS (UPDATE events SET status='active', updated_at=NOW()
    WHERE status='scheduled' AND start_date <= v_today AND end_date >= v_today RETURNING id)
  SELECT COUNT(*) INTO v_activated FROM upd;

  WITH upd AS (UPDATE events SET status='ended', updated_at=NOW()
    WHERE status IN ('active','scheduled') AND end_date < v_today RETURNING id)
  SELECT COUNT(*) INTO v_ended FROM upd;

  RETURN QUERY SELECT v_activated, v_ended;
END;
$$;

-- ── 전시 가능 상품 목록 (전시 등록 모달용) ────────────────────────
CREATE OR REPLACE FUNCTION available_products_for_display(p_event_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID, serial_no TEXT, name TEXT, price INT, sale_price INT,
  stock INT, status TEXT, cat1_name TEXT, already_displayed BOOLEAN
) LANGUAGE sql STABLE AS $$
  SELECT p.id, p.serial_no, p.name, p.price, p.sale_price, p.stock, p.status,
    c1.name AS cat1_name,
    EXISTS (
      SELECT 1 FROM display_items d
      WHERE d.product_id = p.id AND (
        (p_event_id IS NULL AND d.display_type = 'default') OR
        (p_event_id IS NOT NULL AND d.event_id = p_event_id)
      )
    ) AS already_displayed
  FROM products p LEFT JOIN categories c1 ON c1.id = p.cat1_id
  WHERE p.status <> 'stop' ORDER BY p.created_at DESC;
$$;

-- ================================================================
-- E. 포인트 & 쿠폰
-- ================================================================

-- ── 주문 취소 시 포인트 복구 ─────────────────────────────────────
CREATE OR REPLACE FUNCTION refund_points_on_cancel(p_order_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_used_points INT; v_member_id UUID;
BEGIN
  SELECT ABS(SUM(amount)), member_id INTO v_used_points, v_member_id
  FROM member_points WHERE order_id = p_order_id AND type = 'use' GROUP BY member_id;
  IF v_used_points > 0 THEN
    INSERT INTO member_points (member_id, amount, type, reason, order_id)
    VALUES (v_member_id, v_used_points, 'cancel', '주문 취소 포인트 복구', p_order_id);
  END IF;
END;
$$;

-- ── 주문 포인트 적립 ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION earn_order_points(p_order_id UUID, p_rate NUMERIC DEFAULT 0.01)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_order RECORD; v_earn_amount INT;
BEGIN
  SELECT o.*, m.id AS mid INTO v_order
  FROM orders o LEFT JOIN members m ON m.id = o.member_id
  WHERE o.id = p_order_id AND o.status = 'delivered';
  IF NOT FOUND OR v_order.mid IS NULL THEN RETURN; END IF;
  v_earn_amount := GREATEST(FLOOR(v_order.total_amount * p_rate)::INT, 0);
  IF v_earn_amount <= 0 THEN RETURN; END IF;
  INSERT INTO member_points (member_id, amount, type, reason, order_id, expires_at)
  VALUES (v_order.mid, v_earn_amount, 'earn', '구매 적립 (' || v_order.order_no || ')',
          p_order_id, NOW() + INTERVAL '1 year');
END;
$$;

-- ── 만료 포인트 소멸 처리 ────────────────────────────────────────
CREATE OR REPLACE FUNCTION expire_points()
RETURNS TABLE (expired_member_id UUID, expired_amount INT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT mp.member_id, SUM(mp.amount)::INT AS amt FROM member_points mp
    WHERE mp.expires_at < NOW() AND mp.type = 'earn'
      AND NOT EXISTS (
        SELECT 1 FROM member_points
        WHERE member_id = mp.member_id AND type = 'expire'
          AND created_at::DATE = CURRENT_DATE
      )
    GROUP BY mp.member_id HAVING SUM(mp.amount) > 0
  LOOP
    DECLARE bal INT;
    BEGIN
      SELECT balance INTO bal FROM member_point_balance WHERE member_id = r.member_id;
      IF bal > 0 THEN
        INSERT INTO member_points (member_id, amount, type, reason)
        VALUES (r.member_id, -LEAST(bal, r.amt), 'expire', '포인트 유효기간 만료 소멸');
        expired_member_id := r.member_id; expired_amount := LEAST(bal, r.amt);
        RETURN NEXT;
      END IF;
    END;
  END LOOP;
END;
$$;

-- ================================================================
-- F. 분석 & 통계 함수
-- ================================================================

-- ── 주간 매출 (단일 정의 — 기존 03_functions.sql + weekly_sales_function.sql 중복 제거) ──
CREATE OR REPLACE FUNCTION weekly_sales()
RETURNS TABLE (sale_date DATE, revenue BIGINT, order_count BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    created_at::DATE          AS sale_date,
    SUM(total_amount)::BIGINT AS revenue,
    COUNT(*)::BIGINT          AS order_count
  FROM orders
  WHERE created_at >= NOW() - INTERVAL '7 days' AND status <> 'cancelled'
  GROUP BY created_at::DATE ORDER BY created_at::DATE;
$$;

-- ── 일별 매출 집계 (기간 지정) ──────────────────────────────────
CREATE OR REPLACE FUNCTION analytics_daily_revenue(
  p_from DATE DEFAULT CURRENT_DATE - 29,
  p_to   DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (date DATE, revenue BIGINT, order_count BIGINT, avg_order NUMERIC)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT gs::DATE, COALESCE(SUM(o.total_amount),0)::BIGINT,
    COUNT(o.id)::BIGINT, COALESCE(AVG(o.total_amount),0)::NUMERIC
  FROM generate_series(p_from::TIMESTAMPTZ, p_to::TIMESTAMPTZ, '1 day') gs
  LEFT JOIN orders o ON o.created_at::DATE = gs::DATE AND o.status NOT IN ('cancelled','returned')
  GROUP BY gs::DATE ORDER BY gs::DATE;
$$;

-- ── 월별 매출 집계 ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION analytics_monthly_revenue(p_months INT DEFAULT 12)
RETURNS TABLE (month TEXT, revenue BIGINT, order_count BIGINT, new_members BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT TO_CHAR(gs, 'YYYY-MM'),
    COALESCE(SUM(o.total_amount),0)::BIGINT, COUNT(DISTINCT o.id)::BIGINT,
    COUNT(DISTINCT m.id)::BIGINT
  FROM generate_series(
    DATE_TRUNC('month', NOW()) - ((p_months-1) || ' months')::INTERVAL,
    DATE_TRUNC('month', NOW()), '1 month') gs
  LEFT JOIN orders o  ON DATE_TRUNC('month', o.created_at) = gs AND o.status NOT IN ('cancelled','returned')
  LEFT JOIN members m ON DATE_TRUNC('month', m.join_date) = gs
  GROUP BY gs ORDER BY gs;
$$;

-- ── 요일별 매출 패턴 ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION analytics_by_weekday(
  p_from DATE DEFAULT CURRENT_DATE - 89,
  p_to   DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (weekday INT, weekday_name TEXT, revenue BIGINT, order_count BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXTRACT(DOW FROM created_at)::INT,
    CASE EXTRACT(DOW FROM created_at)::INT
      WHEN 0 THEN '일' WHEN 1 THEN '월' WHEN 2 THEN '화' WHEN 3 THEN '수'
      WHEN 4 THEN '목' WHEN 5 THEN '금' WHEN 6 THEN '토' END,
    SUM(total_amount)::BIGINT, COUNT(*)::BIGINT
  FROM orders WHERE created_at::DATE BETWEEN p_from AND p_to AND status NOT IN ('cancelled','returned')
  GROUP BY EXTRACT(DOW FROM created_at)::INT ORDER BY EXTRACT(DOW FROM created_at)::INT;
$$;

-- ── 상태별 주문 통계 (단일 정의 — order_stats_functions.sql + order_management_schema.sql 중복 제거) ──
CREATE OR REPLACE FUNCTION order_stats_by_status(
  p_from DATE DEFAULT CURRENT_DATE - 29,
  p_to   DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (status TEXT, count BIGINT, total_amount BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT status, COUNT(*)::BIGINT, SUM(total_amount)::BIGINT
  FROM orders WHERE created_at::DATE BETWEEN p_from AND p_to
  GROUP BY status ORDER BY COUNT(*) DESC;
$$;

-- ── 대시보드 오늘 KPI ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION dashboard_today_kpi()
RETURNS TABLE (
  today_revenue BIGINT, today_orders BIGINT, today_new_members BIGINT,
  pending_orders BIGINT, low_stock_products BIGINT
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    COALESCE(SUM(CASE WHEN status NOT IN ('cancelled','returned') THEN total_amount END), 0)::BIGINT,
    COUNT(*)::BIGINT,
    (SELECT COUNT(*) FROM members WHERE join_date::DATE = CURRENT_DATE)::BIGINT,
    (SELECT COUNT(*) FROM orders WHERE status = 'pending')::BIGINT,
    (SELECT COUNT(*) FROM products WHERE stock <= 5 AND status <> 'stop')::BIGINT
  FROM orders WHERE created_at::DATE = CURRENT_DATE;
$$;

-- ── 리뷰 도움이 됐어요 ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_helpful(p_review_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE product_reviews SET helpful_count = helpful_count + 1 WHERE id = p_review_id;
END;
$$;

-- ── 문의 통계 ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION inquiry_stats()
RETURNS TABLE (total BIGINT, pending BIGINT, in_progress BIGINT, answered BIGINT, closed BIGINT, avg_response_hours NUMERIC)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'in_progress')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'answered')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'closed')::BIGINT,
    ROUND(AVG(EXTRACT(EPOCH FROM (admin_replied_at - created_at)) / 3600) FILTER (WHERE admin_replied_at IS NOT NULL), 1)::NUMERIC
  FROM inquiries;
$$;

-- ================================================================
-- G. V2 소호몰 전용 함수
-- ================================================================

-- ── 판매자 승인 (원자적 트랜잭션) ────────────────────────────────
CREATE OR REPLACE FUNCTION approve_seller_application(
  p_application_id UUID,
  p_admin_note     TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_app seller_applications; v_store_id UUID;
BEGIN
  SELECT * INTO v_app FROM seller_applications
  WHERE id = p_application_id AND status = 'pending' FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', '대기 중인 신청서를 찾을 수 없습니다');
  END IF;
  IF EXISTS (SELECT 1 FROM seller_stores WHERE slug = v_app.store_slug) THEN
    RETURN jsonb_build_object('success', false, 'error', '이미 사용 중인 URL입니다. 신청자에게 변경 요청하세요.');
  END IF;

  UPDATE seller_applications SET status='approved', admin_note=p_admin_note,
    reviewed_by=auth.uid(), reviewed_at=NOW() WHERE id = p_application_id;

  UPDATE profiles SET role='seller', seller_status='approved' WHERE id = v_app.user_id;

  INSERT INTO seller_stores (owner_id, store_name, slug, store_category, intro, status)
  VALUES (v_app.user_id, v_app.store_name, v_app.store_slug, v_app.store_category, v_app.store_intro, 'active')
  RETURNING id INTO v_store_id;

  INSERT INTO seller_notifications (user_id, type, title, message) VALUES (
    v_app.user_id, 'application_approved', '소호몰 개설이 승인되었습니다!',
    format('"%s" 소호몰이 개설되었습니다. 지금 바로 상품을 등록해 보세요. URL: /stores/%s', v_app.store_name, v_app.store_slug)
  );

  RETURN jsonb_build_object('success', true, 'store_id', v_store_id, 'slug', v_app.store_slug);
END;
$$;

-- ── 판매자 거절 ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION reject_seller_application(
  p_application_id UUID,
  p_admin_note     TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_app seller_applications;
BEGIN
  SELECT * INTO v_app FROM seller_applications
  WHERE id = p_application_id AND status = 'pending' FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', '대기 중인 신청서를 찾을 수 없습니다');
  END IF;

  UPDATE seller_applications SET status='rejected', admin_note=p_admin_note,
    reviewed_by=auth.uid(), reviewed_at=NOW() WHERE id = p_application_id;
  UPDATE profiles SET seller_status='rejected' WHERE id = v_app.user_id;

  INSERT INTO seller_notifications (user_id, type, title, message) VALUES (
    v_app.user_id, 'application_rejected', '소호몰 신청이 검토되었습니다',
    format('안타깝게도 이번 신청은 승인되지 않았습니다. 사유: %s', COALESCE(p_admin_note, '기재되지 않음'))
  );
  RETURN jsonb_build_object('success', true);
END;
$$;

-- ── 정산 생성 ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_settlement(
  p_store_id     UUID,
  p_period_start DATE,
  p_period_end   DATE
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_store     seller_stores;
  v_gross     NUMERIC := 0;
  v_fee_amt   NUMERIC := 0;
  v_net       NUMERIC := 0;
  v_settle_id UUID;
BEGIN
  SELECT * INTO v_store FROM seller_stores WHERE id = p_store_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', '소호몰을 찾을 수 없습니다');
  END IF;

  SELECT COALESCE(SUM(oi.total_price), 0) INTO v_gross
  FROM order_items oi JOIN orders o ON o.id = oi.order_id
  WHERE oi.store_id = p_store_id AND oi.item_status = 'delivered'
    AND o.created_at::DATE BETWEEN p_period_start AND p_period_end
    AND NOT EXISTS (SELECT 1 FROM settlement_items si WHERE si.order_item_id = oi.id);

  IF v_gross = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', '정산 가능한 매출이 없습니다');
  END IF;

  v_fee_amt := ROUND(v_gross * v_store.fee_rate / 100, 2);
  v_net     := v_gross - v_fee_amt;

  INSERT INTO settlements (store_id, period_start, period_end, gross_amount, fee_rate, fee_amount, net_amount)
  VALUES (p_store_id, p_period_start, p_period_end, v_gross, v_store.fee_rate, v_fee_amt, v_net)
  RETURNING id INTO v_settle_id;

  INSERT INTO settlement_items (settlement_id, order_item_id, order_number, product_name, quantity, gross_amount, fee_amount, net_amount, delivered_at)
  SELECT v_settle_id, oi.id, o.order_number, oi.product_name, oi.quantity,
    oi.total_price, ROUND(oi.total_price * v_store.fee_rate / 100, 2),
    oi.total_price - ROUND(oi.total_price * v_store.fee_rate / 100, 2), oi.updated_at
  FROM order_items oi JOIN orders o ON o.id = oi.order_id
  WHERE oi.store_id = p_store_id AND oi.item_status = 'delivered'
    AND o.created_at::DATE BETWEEN p_period_start AND p_period_end
    AND NOT EXISTS (SELECT 1 FROM settlement_items si WHERE si.order_item_id = oi.id);

  INSERT INTO seller_notifications (user_id, type, title, message)
  SELECT v_store.owner_id, 'settlement_completed',
    format('%s 정산 내역이 생성되었습니다', to_char(p_period_end, 'YYYY년 MM월')),
    format('매출 %s원 | 수수료 %s원 | 정산 예정액 %s원',
      to_char(v_gross,'FM999,999,999'), to_char(v_fee_amt,'FM999,999,999'), to_char(v_net,'FM999,999,999'));

  RETURN jsonb_build_object('success', true, 'settlement_id', v_settle_id, 'gross', v_gross, 'fee', v_fee_amt, 'net', v_net);
END;
$$;

SELECT 'Functions ready' AS status;
