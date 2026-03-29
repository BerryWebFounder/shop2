-- ============================================================
-- Shop V2 | Package 2-6 공용: 소호몰·상품·주문·정산 스키마
-- ============================================================

-- ===== 소호몰 (seller_stores) =====
CREATE TABLE IF NOT EXISTS seller_stores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 기본 정보
  store_name      TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  tagline         TEXT,
  intro           TEXT,
  store_category  TEXT NOT NULL,
  
  -- 비주얼
  logo_url        TEXT,
  banner_url      TEXT,
  theme_color     TEXT DEFAULT '#6366f1',
  
  -- 정책
  shipping_policy TEXT,
  return_policy   TEXT,
  fee_rate        NUMERIC(5,2) NOT NULL DEFAULT 5.00,   -- 플랫폼 수수료율 %
  
  -- 연락처
  contact_email   TEXT,
  contact_phone   TEXT,
  sns_links       JSONB DEFAULT '{}',
  
  -- 상태
  status          TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'closed')),
  
  -- 통계 (비정규화 캐시)
  total_products  INT NOT NULL DEFAULT 0,
  total_orders    INT NOT NULL DEFAULT 0,
  total_revenue   NUMERIC(15,2) NOT NULL DEFAULT 0,
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===== 상품 (products) - store_id 기준 RLS 격리 =====
CREATE TABLE IF NOT EXISTS products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES seller_stores(id) ON DELETE CASCADE,
  
  name            TEXT NOT NULL,
  description     TEXT,
  price           NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  compare_price   NUMERIC(12,2),               -- 정가 (할인 전)
  cost_price      NUMERIC(12,2),               -- 원가 (정산 기준)
  
  category        TEXT,
  tags            TEXT[] DEFAULT '{}',
  images          TEXT[] DEFAULT '{}',         -- Storage URLs
  
  -- 재고
  track_inventory BOOLEAN NOT NULL DEFAULT TRUE,
  stock_quantity  INT NOT NULL DEFAULT 0,
  low_stock_alert INT DEFAULT 5,
  
  -- 옵션 (색상/사이즈 등)
  has_options     BOOLEAN NOT NULL DEFAULT FALSE,
  options         JSONB DEFAULT '[]',          -- [{name:"색상", values:["빨강","파랑"]}]
  variants        JSONB DEFAULT '[]',          -- [{sku, price, stock, options:{색상:"빨강"}}]
  
  -- SEO
  meta_title      TEXT,
  meta_desc       TEXT,
  
  status          TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'draft', 'sold_out', 'hidden')),
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===== 주문 (orders) - 멀티 판매자 지원 =====
CREATE TABLE IF NOT EXISTS orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number    TEXT NOT NULL UNIQUE DEFAULT ('ORD-' || to_char(NOW(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::TEXT, 1, 6)),
  customer_id     UUID REFERENCES auth.users(id),
  
  -- 배송 정보
  shipping_name   TEXT NOT NULL,
  shipping_phone  TEXT NOT NULL,
  shipping_addr   TEXT NOT NULL,
  shipping_detail TEXT,
  postal_code     TEXT,
  
  -- 결제
  payment_method  TEXT,
  payment_key     TEXT,                        -- Toss Payments key
  
  -- 합계 (모든 판매자 합산)
  total_amount    NUMERIC(12,2) NOT NULL,
  shipping_fee    NUMERIC(12,2) NOT NULL DEFAULT 0,
  
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','paid','preparing','shipping','delivered','cancelled','refunded')),
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===== 주문 아이템 (order_items) - 판매자별 분리 단위 =====
CREATE TABLE IF NOT EXISTS order_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  store_id        UUID NOT NULL REFERENCES seller_stores(id),
  product_id      UUID NOT NULL REFERENCES products(id),
  
  product_name    TEXT NOT NULL,               -- 주문 시점 스냅샷
  product_image   TEXT,
  options_snapshot JSONB DEFAULT '{}',         -- 선택 옵션 스냅샷
  
  quantity        INT NOT NULL CHECK (quantity > 0),
  unit_price      NUMERIC(12,2) NOT NULL,
  total_price     NUMERIC(12,2) NOT NULL,
  
  -- 판매자 단위 배송 상태
  item_status     TEXT NOT NULL DEFAULT 'pending'
    CHECK (item_status IN ('pending','preparing','shipping','delivered','cancelled')),
  tracking_number TEXT,
  carrier_code    TEXT,
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===== 정산 (settlements) =====
CREATE TABLE IF NOT EXISTS settlements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES seller_stores(id),
  
  -- 정산 기간
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  
  -- 금액
  gross_amount    NUMERIC(15,2) NOT NULL,      -- 총 매출
  fee_rate        NUMERIC(5,2) NOT NULL,       -- 적용 수수료율
  fee_amount      NUMERIC(15,2) NOT NULL,      -- 수수료 금액
  net_amount      NUMERIC(15,2) NOT NULL,      -- 정산 금액 (gross - fee)
  
  -- 지급 정보
  bank_name       TEXT,
  account_number  TEXT,
  account_holder  TEXT,
  
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  
  paid_at         TIMESTAMPTZ,
  admin_note      TEXT,
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===== 정산 항목 (settlement_items) - 주문 아이템과 연결 =====
CREATE TABLE IF NOT EXISTS settlement_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id   UUID NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
  order_item_id   UUID NOT NULL REFERENCES order_items(id),
  
  order_number    TEXT NOT NULL,
  product_name    TEXT NOT NULL,
  quantity        INT NOT NULL,
  gross_amount    NUMERIC(12,2) NOT NULL,
  fee_amount      NUMERIC(12,2) NOT NULL,
  net_amount      NUMERIC(12,2) NOT NULL,
  
  delivered_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===== 인덱스 =====
CREATE INDEX IF NOT EXISTS idx_seller_stores_owner  ON seller_stores(owner_id);
CREATE INDEX IF NOT EXISTS idx_seller_stores_slug   ON seller_stores(slug);
CREATE INDEX IF NOT EXISTS idx_products_store       ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_status      ON products(status);
CREATE INDEX IF NOT EXISTS idx_order_items_store    ON order_items(store_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order    ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer      ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_settlements_store    ON settlements(store_id);
CREATE INDEX IF NOT EXISTS idx_settlements_status   ON settlements(status);

-- ===== 트리거 =====
DROP TRIGGER IF EXISTS trg_seller_stores_updated_at ON seller_stores;
CREATE TRIGGER trg_seller_stores_updated_at BEFORE UPDATE ON seller_stores FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_order_items_updated_at ON order_items;
CREATE TRIGGER trg_order_items_updated_at BEFORE UPDATE ON order_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_settlements_updated_at ON settlements;
CREATE TRIGGER trg_settlements_updated_at BEFORE UPDATE ON settlements FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===== RLS =====
ALTER TABLE seller_stores  ENABLE ROW LEVEL SECURITY;
ALTER TABLE products        ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders          ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements     ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_items ENABLE ROW LEVEL SECURITY;

-- seller_stores
CREATE POLICY "본인 소호몰 관리" ON seller_stores
  FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "활성 소호몰 공개 조회" ON seller_stores
  FOR SELECT USING (status = 'active');

-- products
CREATE POLICY "판매자 본인 상품 관리" ON products
  FOR ALL USING (
    EXISTS (SELECT 1 FROM seller_stores WHERE id = store_id AND owner_id = auth.uid())
  );
CREATE POLICY "활성 상품 공개 조회" ON products
  FOR SELECT USING (status IN ('active', 'sold_out'));

-- orders: 고객 본인 조회
CREATE POLICY "고객 본인 주문 조회" ON orders
  FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "고객 주문 생성" ON orders
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

-- order_items: 판매자는 본인 소호몰 아이템만
CREATE POLICY "판매자 본인 아이템 조회" ON order_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM seller_stores WHERE id = store_id AND owner_id = auth.uid())
  );
CREATE POLICY "판매자 배송 상태 업데이트" ON order_items
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM seller_stores WHERE id = store_id AND owner_id = auth.uid())
  );
CREATE POLICY "고객 본인 아이템 조회" ON order_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders WHERE id = order_id AND customer_id = auth.uid())
  );

-- settlements
CREATE POLICY "판매자 본인 정산 조회" ON settlements
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM seller_stores WHERE id = store_id AND owner_id = auth.uid())
  );

-- 관리자 전체 권한
CREATE POLICY "관리자 전체 seller_stores"   ON seller_stores  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "관리자 전체 products"         ON products        FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "관리자 전체 orders"           ON orders          FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "관리자 전체 order_items"      ON order_items     FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "관리자 전체 settlements"      ON settlements     FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "관리자 전체 settlement_items" ON settlement_items FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ===== 정산 생성 함수 =====
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

  -- 배송완료된 아이템 합산 (이미 정산 처리된 것 제외)
  SELECT COALESCE(SUM(oi.total_price), 0) INTO v_gross
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE oi.store_id = p_store_id
    AND oi.item_status = 'delivered'
    AND o.created_at::DATE BETWEEN p_period_start AND p_period_end
    AND NOT EXISTS (
      SELECT 1 FROM settlement_items si WHERE si.order_item_id = oi.id
    );

  IF v_gross = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', '정산 가능한 매출이 없습니다');
  END IF;

  v_fee_amt := ROUND(v_gross * v_store.fee_rate / 100, 2);
  v_net     := v_gross - v_fee_amt;

  -- 정산 레코드 생성
  INSERT INTO settlements (store_id, period_start, period_end, gross_amount, fee_rate, fee_amount, net_amount)
  VALUES (p_store_id, p_period_start, p_period_end, v_gross, v_store.fee_rate, v_fee_amt, v_net)
  RETURNING id INTO v_settle_id;

  -- 정산 아이템 연결
  INSERT INTO settlement_items (settlement_id, order_item_id, order_number, product_name, quantity, gross_amount, fee_amount, net_amount, delivered_at)
  SELECT
    v_settle_id, oi.id, o.order_number, oi.product_name, oi.quantity,
    oi.total_price,
    ROUND(oi.total_price * v_store.fee_rate / 100, 2),
    oi.total_price - ROUND(oi.total_price * v_store.fee_rate / 100, 2),
    oi.updated_at
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE oi.store_id = p_store_id
    AND oi.item_status = 'delivered'
    AND o.created_at::DATE BETWEEN p_period_start AND p_period_end
    AND NOT EXISTS (SELECT 1 FROM settlement_items si WHERE si.order_item_id = oi.id);

  -- 판매자 알림
  INSERT INTO seller_notifications (user_id, type, title, message)
  SELECT v_store.owner_id, 'settlement_completed',
    format('%s 정산 내역이 생성되었습니다', to_char(p_period_end, 'YYYY년 MM월')),
    format('매출 %s원 | 수수료 %s원 | 정산 예정액 %s원',
      to_char(v_gross, 'FM999,999,999'), to_char(v_fee_amt, 'FM999,999,999'), to_char(v_net, 'FM999,999,999'));

  RETURN jsonb_build_object('success', true, 'settlement_id', v_settle_id, 'gross', v_gross, 'fee', v_fee_amt, 'net', v_net);
END;
$$;
