-- ================================================================
-- 01. 테이블 정의
-- ================================================================

-- ── 관리자 설정 ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_settings (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_name       TEXT        NOT NULL DEFAULT '내 쇼핑몰',
  biz_no           TEXT,                           -- 사업자등록번호
  address          TEXT,                           -- 사업장 소재지
  phone            TEXT,                           -- 대표 연락처
  email            TEXT,                           -- 대표 이메일
  dormant_days     INT         NOT NULL DEFAULT 365,   -- KISA 권장: 365일
  data_keep_years  INT         NOT NULL DEFAULT 4,     -- 전자상거래법: 4년
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 설정은 단일 행만 존재
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_settings_single
  ON admin_settings ((TRUE));

-- ── 회원 ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS members (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- 기본 정보 (휴면/탈퇴 시 pgcrypto로 암호화 보관 또는 null 처리)
  name           TEXT        NOT NULL,
  email          TEXT        NOT NULL,
  -- 민감 정보: 탈퇴 시 null, 휴면 시 암호화 보관
  phone          TEXT,
  address        TEXT,
  -- 상태
  status         TEXT        NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'dormant', 'withdrawn')),
  -- 날짜
  join_date      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login     TIMESTAMPTZ,
  withdraw_date  TIMESTAMPTZ,
  dormant_date   TIMESTAMPTZ,
  -- 메타
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT members_email_key UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_members_status     ON members (status);
CREATE INDEX IF NOT EXISTS idx_members_last_login ON members (last_login);
CREATE INDEX IF NOT EXISTS idx_members_join_date  ON members (join_date DESC);

-- ── 상품 분류 ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id   UUID REFERENCES categories (id) ON DELETE RESTRICT,
  name        TEXT NOT NULL,
  level       INT  NOT NULL CHECK (level IN (1, 2, 3)),  -- 1:대 2:중 3:소
  sort_order  INT  NOT NULL DEFAULT 0,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT categories_parent_level_check CHECK (
    (level = 1 AND parent_id IS NULL) OR
    (level IN (2, 3) AND parent_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_categories_parent     ON categories (parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_level      ON categories (level);
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON categories (sort_order);

-- ── 상품 ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  serial_no    TEXT        NOT NULL,                  -- 관리용 일련번호 (P0001)
  name         TEXT        NOT NULL,
  summary      TEXT,                                  -- 목록 요약
  description  TEXT,                                  -- WYSIWYG HTML
  cat1_id      UUID        REFERENCES categories (id) ON DELETE SET NULL,
  cat2_id      UUID        REFERENCES categories (id) ON DELETE SET NULL,
  cat3_id      UUID        REFERENCES categories (id) ON DELETE SET NULL,
  price        INT         NOT NULL DEFAULT 0 CHECK (price >= 0),
  sale_price   INT         CHECK (sale_price IS NULL OR (sale_price >= 0 AND sale_price <= price)),
  stock        INT         NOT NULL DEFAULT 0 CHECK (stock >= 0),
  status       TEXT        NOT NULL DEFAULT 'stop'
                 CHECK (status IN ('sale', 'soldout', 'stop')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT products_serial_no_key UNIQUE (serial_no)
);

CREATE INDEX IF NOT EXISTS idx_products_status     ON products (status);
CREATE INDEX IF NOT EXISTS idx_products_cat1       ON products (cat1_id);
CREATE INDEX IF NOT EXISTS idx_products_cat2       ON products (cat2_id);
CREATE INDEX IF NOT EXISTS idx_products_stock      ON products (stock);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products (created_at DESC);
-- 상품명 전문 검색 (한국어 포함)
CREATE INDEX IF NOT EXISTS idx_products_name_gin
  ON products USING gin (to_tsvector('simple', name));

-- ── 이벤트 ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  description  TEXT,
  start_date   DATE NOT NULL,
  end_date     DATE NOT NULL,
  status       TEXT NOT NULL DEFAULT 'scheduled'
                 CHECK (status IN ('active', 'scheduled', 'ended')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT events_date_check CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_events_status     ON events (status);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events (start_date);
CREATE INDEX IF NOT EXISTS idx_events_end_date   ON events (end_date);

-- ── 전시 상품 ─────────────────────────────────────────────────────
-- 상품 등록 ≠ 전시. display_items에서만 전시 여부 결정.
CREATE TABLE IF NOT EXISTS display_items (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id   UUID        NOT NULL REFERENCES products (id)  ON DELETE CASCADE,
  event_id     UUID        REFERENCES events (id)             ON DELETE CASCADE,
  display_type TEXT        NOT NULL DEFAULT 'default'
                 CHECK (display_type IN ('default', 'event')),
  start_date   DATE        NOT NULL,
  end_date     DATE        NOT NULL,
  sort_order   INT         NOT NULL DEFAULT 0,
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 이벤트 전시면 event_id 필수; 기본 전시면 event_id null
  CONSTRAINT display_type_event_check CHECK (
    (display_type = 'default' AND event_id IS NULL) OR
    (display_type = 'event'   AND event_id IS NOT NULL)
  ),
  -- 날짜 순서
  CONSTRAINT display_date_check CHECK (end_date >= start_date),
  -- 같은 상품을 같은 이벤트에 중복 등록 방지
  CONSTRAINT display_unique_product_event UNIQUE (product_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_display_product    ON display_items (product_id);
CREATE INDEX IF NOT EXISTS idx_display_event      ON display_items (event_id);
CREATE INDEX IF NOT EXISTS idx_display_active     ON display_items (is_active, display_type);
CREATE INDEX IF NOT EXISTS idx_display_sort       ON display_items (sort_order);

-- ── 주문 ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_no      TEXT        NOT NULL,
  member_id     UUID        REFERENCES members (id) ON DELETE SET NULL,
  total_amount  INT         NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  status        TEXT        NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','paid','shipping','delivered','returned','cancelled')),
  shipping_name    TEXT,               -- 배송지 정보 (주문 시 스냅샷)
  shipping_phone   TEXT,
  shipping_address TEXT,
  memo             TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT orders_order_no_key UNIQUE (order_no)
);

CREATE INDEX IF NOT EXISTS idx_orders_member_id  ON orders (member_id);
CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);

-- ── 주문 상품 ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id     UUID NOT NULL REFERENCES orders (id)   ON DELETE CASCADE,
  product_id   UUID NOT NULL REFERENCES products (id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,           -- 주문 시점 상품명 스냅샷
  unit_price   INT  NOT NULL CHECK (unit_price >= 0),
  sale_price   INT  CHECK (sale_price IS NULL OR sale_price >= 0),
  quantity     INT  NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id   ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items (product_id);

SELECT 'Tables ready' AS status;
