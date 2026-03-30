-- ================================================================
-- 04_triggers.sql
-- 전체 트리거 정의
-- ================================================================

-- ================================================================
-- A. updated_at 자동 갱신 (모든 테이블)
-- ================================================================

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'admin_settings','members','products','events','display_items',
    'orders','order_items','order_shipments','payments',
    'coupons','inquiries','faqs','product_reviews','product_skus',
    'display_slides','display_banners','display_popups','display_promo_bars',
    'push_subscriptions',
    'seller_stores','seller_applications','settlements'
  ] LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_%s_updated_at ON %s;
      CREATE TRIGGER trg_%s_updated_at
        BEFORE UPDATE ON %s
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    ', tbl, tbl, tbl, tbl);
  END LOOP;
END $$;

-- ================================================================
-- B. 상품 관련 트리거
-- ================================================================

-- ── 상품 일련번호 자동 생성 ───────────────────────────────────────
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
  BEFORE INSERT ON products FOR EACH ROW EXECUTE FUNCTION trg_set_serial_no();

-- ── 재고 0 → 품절 자동 처리 ──────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_auto_soldout()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.stock = 0 AND NEW.status = 'sale' THEN NEW.status := 'soldout'; END IF;
  IF NEW.stock > 0 AND NEW.status = 'soldout' THEN NEW.status := 'sale'; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_products_auto_soldout ON products;
CREATE TRIGGER trg_products_auto_soldout
  BEFORE UPDATE OF stock ON products FOR EACH ROW EXECUTE FUNCTION trg_auto_soldout();

-- ── 태그 use_count 자동 동기화 ───────────────────────────────────
CREATE OR REPLACE FUNCTION trg_sync_tag_use_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE product_tags SET use_count = use_count + 1 WHERE id = NEW.tag_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE product_tags SET use_count = GREATEST(use_count - 1, 0) WHERE id = OLD.tag_id;
  END IF;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_tag_map_count ON product_tag_map;
CREATE TRIGGER trg_tag_map_count
  AFTER INSERT OR DELETE ON product_tag_map FOR EACH ROW EXECUTE FUNCTION trg_sync_tag_use_count();

-- ── 분류 삭제 방지 (하위 분류 존재 시) ───────────────────────────
CREATE OR REPLACE FUNCTION trg_prevent_cat_delete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE child_count INT;
BEGIN
  SELECT COUNT(*) INTO child_count FROM categories WHERE parent_id = OLD.id;
  IF child_count > 0 THEN
    RAISE EXCEPTION '하위 분류가 %개 있어 삭제할 수 없습니다.', child_count;
  END IF;
  RETURN OLD;
END;
$$;
DROP TRIGGER IF EXISTS trg_categories_prevent_delete ON categories;
CREATE TRIGGER trg_categories_prevent_delete
  BEFORE DELETE ON categories FOR EACH ROW EXECUTE FUNCTION trg_prevent_cat_delete();

-- ── 전시 등록 시 상품 상태 검증 ──────────────────────────────────
CREATE OR REPLACE FUNCTION trg_validate_display_product()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_status TEXT;
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
  BEFORE INSERT OR UPDATE OF product_id ON display_items FOR EACH ROW EXECUTE FUNCTION trg_validate_display_product();

-- ================================================================
-- C. 주문 관련 트리거
-- ================================================================

-- ── 주문번호 자동 생성 ───────────────────────────────────────────
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
  BEFORE INSERT ON orders FOR EACH ROW EXECUTE FUNCTION trg_set_order_no();

-- ── 주문 금액 자동 합산 ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_recalc_order_total()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_order_id UUID;
BEGIN
  v_order_id := COALESCE(NEW.order_id, OLD.order_id);
  UPDATE orders SET total_amount = (
    SELECT COALESCE(SUM(COALESCE(sale_price, unit_price) * quantity), 0)
    FROM order_items WHERE order_id = v_order_id
  ) WHERE id = v_order_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS trg_order_items_total ON order_items;
CREATE TRIGGER trg_order_items_total
  AFTER INSERT OR UPDATE OR DELETE ON order_items FOR EACH ROW EXECUTE FUNCTION trg_recalc_order_total();

-- ── 재고 차감/복구 ───────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_orders_stock ON orders;
CREATE TRIGGER trg_orders_stock
  AFTER UPDATE OF status ON orders FOR EACH ROW EXECUTE FUNCTION deduct_stock();

-- ── 주문 상태 이력 자동 기록 ─────────────────────────────────────
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
  AFTER UPDATE OF status ON orders FOR EACH ROW EXECUTE FUNCTION trg_record_order_status_change();

-- ── 회원 통계 자동 업데이트 ──────────────────────────────────────
DROP TRIGGER IF EXISTS trg_member_stats_update ON orders;
CREATE TRIGGER trg_member_stats_update
  AFTER UPDATE OF status ON orders FOR EACH ROW EXECUTE FUNCTION trg_update_member_stats_on_order();

-- ================================================================
-- D. 결제 관련 트리거
-- ================================================================

-- ── 결제 완료 시 주문 상태 자동 변경 ─────────────────────────────
CREATE OR REPLACE FUNCTION trg_payment_done_update_order()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'done' AND OLD.status <> 'done' THEN
    UPDATE orders SET status='paid', updated_at=NOW() WHERE id=NEW.order_id AND status='pending';
  END IF;
  IF NEW.status IN ('canceled','aborted','expired') AND OLD.status NOT IN ('canceled','aborted','expired') THEN
    UPDATE orders SET status='cancelled', updated_at=NOW() WHERE id=NEW.order_id AND status IN ('pending','paid');
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_payments_order_status ON payments;
CREATE TRIGGER trg_payments_order_status
  AFTER UPDATE OF status ON payments FOR EACH ROW EXECUTE FUNCTION trg_payment_done_update_order();

-- ================================================================
-- E. 쿠폰 & 고객센터 트리거
-- ================================================================

-- ── 쿠폰 사용 시 usage_count 증가 ────────────────────────────────
CREATE OR REPLACE FUNCTION trg_increment_coupon_usage()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE coupons SET usage_count = usage_count + 1 WHERE id = NEW.coupon_id;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_coupon_usage_count ON coupon_usages;
CREATE TRIGGER trg_coupon_usage_count
  AFTER INSERT ON coupon_usages FOR EACH ROW EXECUTE FUNCTION trg_increment_coupon_usage();

-- ── 답변 완료 시 문의 상태 자동 변경 ─────────────────────────────
CREATE OR REPLACE FUNCTION trg_auto_status_on_reply()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_admin THEN
    UPDATE inquiries SET status='answered', admin_replied_at=NOW() WHERE id=NEW.inquiry_id;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_inquiry_reply_status ON inquiry_replies;
CREATE TRIGGER trg_inquiry_reply_status
  AFTER INSERT ON inquiry_replies FOR EACH ROW EXECUTE FUNCTION trg_auto_status_on_reply();

-- ── 이벤트 종료 시 전시 자동 비활성화 ────────────────────────────
CREATE OR REPLACE FUNCTION trg_deactivate_display_on_event_end()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'ended' AND OLD.status <> 'ended' THEN
    UPDATE display_items SET is_active=FALSE, updated_at=NOW()
    WHERE event_id=NEW.id AND is_active=TRUE;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_events_deactivate_display ON events;
CREATE TRIGGER trg_events_deactivate_display
  AFTER UPDATE OF status ON events FOR EACH ROW EXECUTE FUNCTION trg_deactivate_display_on_event_end();

SELECT 'Triggers ready' AS status;
