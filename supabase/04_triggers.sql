-- ================================================================
-- 04. 트리거
-- ================================================================

-- ── updated_at 자동 갱신 트리거 ────────────────────────────────────

-- admin_settings
DROP TRIGGER IF EXISTS trg_admin_settings_updated_at ON admin_settings;
CREATE TRIGGER trg_admin_settings_updated_at
  BEFORE UPDATE ON admin_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- members
DROP TRIGGER IF EXISTS trg_members_updated_at ON members;
CREATE TRIGGER trg_members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- products
DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- events
DROP TRIGGER IF EXISTS trg_events_updated_at ON events;
CREATE TRIGGER trg_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- display_items
DROP TRIGGER IF EXISTS trg_display_items_updated_at ON display_items;
CREATE TRIGGER trg_display_items_updated_at
  BEFORE UPDATE ON display_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- orders
DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 상품 serial_no 자동 생성 ───────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_set_serial_no()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.serial_no IS NULL OR NEW.serial_no = '' THEN
    NEW.serial_no := generate_serial_no();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_serial_no ON products;
CREATE TRIGGER trg_products_serial_no
  BEFORE INSERT ON products
  FOR EACH ROW EXECUTE FUNCTION trg_set_serial_no();

-- ── 주문번호 자동 생성 ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_set_order_no()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.order_no IS NULL OR NEW.order_no = '' THEN
    NEW.order_no := generate_order_no();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_order_no ON orders;
CREATE TRIGGER trg_orders_order_no
  BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION trg_set_order_no();

-- ── 주문 금액 자동 합산 ─────────────────────────────────────────────
-- order_items INSERT/UPDATE/DELETE 시 orders.total_amount 자동 갱신
CREATE OR REPLACE FUNCTION trg_recalc_order_total()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_order_id UUID;
BEGIN
  v_order_id := COALESCE(NEW.order_id, OLD.order_id);

  UPDATE orders
  SET total_amount = (
    SELECT COALESCE(SUM(COALESCE(sale_price, unit_price) * quantity), 0)
    FROM order_items
    WHERE order_id = v_order_id
  )
  WHERE id = v_order_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_order_items_total ON order_items;
CREATE TRIGGER trg_order_items_total
  AFTER INSERT OR UPDATE OR DELETE ON order_items
  FOR EACH ROW EXECUTE FUNCTION trg_recalc_order_total();

-- ── 재고 차감 / 복구 (주문 상태 변경 시) ────────────────────────────
DROP TRIGGER IF EXISTS trg_orders_stock ON orders;
CREATE TRIGGER trg_orders_stock
  AFTER UPDATE OF status ON orders
  FOR EACH ROW EXECUTE FUNCTION deduct_stock();

-- ── 재고 0 → 자동 품절 처리 ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_auto_soldout()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.stock = 0 AND NEW.status = 'sale' THEN
    NEW.status := 'soldout';
  END IF;
  -- 재고가 다시 생기면 품절 → 판매중
  IF NEW.stock > 0 AND NEW.status = 'soldout' THEN
    NEW.status := 'sale';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_auto_soldout ON products;
CREATE TRIGGER trg_products_auto_soldout
  BEFORE UPDATE OF stock ON products
  FOR EACH ROW EXECUTE FUNCTION trg_auto_soldout();

-- ── 하위 분류 존재 시 상위 분류 삭제 방지 ──────────────────────────
-- (REFERENCES ... ON DELETE RESTRICT가 이미 처리하지만, 명확한 에러 메시지 제공)
CREATE OR REPLACE FUNCTION trg_prevent_cat_delete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  child_count INT;
BEGIN
  SELECT COUNT(*) INTO child_count
  FROM categories
  WHERE parent_id = OLD.id;

  IF child_count > 0 THEN
    RAISE EXCEPTION '하위 분류가 % 개 있어 삭제할 수 없습니다. 먼저 하위 분류를 삭제해주세요.', child_count;
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_categories_prevent_delete ON categories;
CREATE TRIGGER trg_categories_prevent_delete
  BEFORE DELETE ON categories
  FOR EACH ROW EXECUTE FUNCTION trg_prevent_cat_delete();

-- ── 전시 등록 시 상품 상태 검증 ─────────────────────────────────────
-- 판매중지(stop) 상품은 전시 불가
CREATE OR REPLACE FUNCTION trg_validate_display_product()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_status TEXT;
BEGIN
  SELECT status INTO v_status FROM products WHERE id = NEW.product_id;

  IF v_status = 'stop' THEN
    RAISE EXCEPTION '판매중지 상태인 상품은 전시에 등록할 수 없습니다.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_display_validate_product ON display_items;
CREATE TRIGGER trg_display_validate_product
  BEFORE INSERT OR UPDATE OF product_id ON display_items
  FOR EACH ROW EXECUTE FUNCTION trg_validate_display_product();

-- ── 이벤트 종료 시 해당 전시 자동 비활성화 ─────────────────────────
CREATE OR REPLACE FUNCTION trg_deactivate_display_on_event_end()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- 이벤트가 ended 상태로 변경될 때 연결된 전시 비활성화
  IF NEW.status = 'ended' AND OLD.status <> 'ended' THEN
    UPDATE display_items
    SET is_active = FALSE, updated_at = NOW()
    WHERE event_id = NEW.id AND is_active = TRUE;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_events_deactivate_display ON events;
CREATE TRIGGER trg_events_deactivate_display
  AFTER UPDATE OF status ON events
  FOR EACH ROW EXECUTE FUNCTION trg_deactivate_display_on_event_end();

-- ── last_login 갱신 보조 함수 (Auth hook 또는 API에서 호출) ─────────
-- Supabase Auth의 로그인 이벤트 후 API Route에서 호출
CREATE OR REPLACE FUNCTION update_member_last_login(p_email TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE members
  SET last_login = NOW(), updated_at = NOW()
  WHERE email = p_email AND status = 'active';
END;
$$;

COMMENT ON FUNCTION update_member_last_login(TEXT) IS
  '로그인 시 last_login 갱신. API Route에서 Supabase Auth 로그인 이후 호출합니다.';

SELECT 'Triggers ready' AS status;
