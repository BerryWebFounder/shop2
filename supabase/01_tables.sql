-- ================================================================
-- 01_tables.sql
-- 전체 테이블 정의 (의존 순서대로)
--
-- 포함 파일 (기존):
--   01_tables.sql, 01_schema.sql, 02_schema_all_tables.sql,
--   coupon_point_schema.sql, cs_schema.sql, member_grade_schema.sql,
--   display_schema.sql, reviews_schema.sql, product_advanced_schema.sql,
--   product_images_table.sql, payment_schema.sql,
--   order_management_schema.sql, push_schema.sql
-- ================================================================

-- ================================================================
-- A. 플랫폼 설정 & 회원
-- ================================================================

-- ── 관리자 설정 ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_settings (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_name       TEXT        NOT NULL DEFAULT '내 쇼핑몰',
  biz_no           TEXT,
  address          TEXT,
  phone            TEXT,
  email            TEXT,
  dormant_days     INT         NOT NULL DEFAULT 365,
  data_keep_years  INT         NOT NULL DEFAULT 4,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_settings_single ON admin_settings ((TRUE));

-- ── 회원 ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS members (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             TEXT        NOT NULL,
  email            TEXT        NOT NULL,
  phone            TEXT,
  address          TEXT,
  status           TEXT        NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active','dormant','withdrawn')),
  grade            TEXT        NOT NULL DEFAULT 'bronze'
                     CHECK (grade IN ('bronze','silver','gold','vip')),
  grade_updated_at TIMESTAMPTZ,
  total_purchase   BIGINT      NOT NULL DEFAULT 0,
  annual_purchase  BIGINT      NOT NULL DEFAULT 0,
  order_count      INT         NOT NULL DEFAULT 0,
  notes            TEXT,
  join_date        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login       TIMESTAMPTZ,
  withdraw_date    TIMESTAMPTZ,
  dormant_date     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT members_email_key UNIQUE (email)
);
CREATE INDEX IF NOT EXISTS idx_members_status     ON members (status);
CREATE INDEX IF NOT EXISTS idx_members_last_login ON members (last_login);
CREATE INDEX IF NOT EXISTS idx_members_join_date  ON members (join_date DESC);
CREATE INDEX IF NOT EXISTS idx_members_grade      ON members (grade);

-- ── 회원 등급 기준 ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS member_grade_config (
  grade             TEXT    PRIMARY KEY,
  label             TEXT    NOT NULL,
  min_annual_amount BIGINT  NOT NULL,
  point_rate        NUMERIC NOT NULL DEFAULT 0.01,
  discount_rate     NUMERIC NOT NULL DEFAULT 0,
  badge_color       TEXT    NOT NULL DEFAULT '#cd7f32',
  description       TEXT,
  sort_order        INT     NOT NULL DEFAULT 0
);

-- ── 회원 등급 변경 이력 ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS member_grade_history (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id     UUID        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  from_grade    TEXT,
  to_grade      TEXT        NOT NULL,
  reason        TEXT        NOT NULL DEFAULT 'auto',
  annual_amount BIGINT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_grade_history_member ON member_grade_history (member_id, created_at DESC);

-- ── 포인트 ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS member_points (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id  UUID        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  amount     INT         NOT NULL,
  type       TEXT        NOT NULL CHECK (type IN ('earn','use','expire','admin','cancel')),
  reason     TEXT        NOT NULL,
  order_id   UUID,                                -- 아래 orders 테이블 생성 후 FK 추가
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_points_member  ON member_points (member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_points_type    ON member_points (type);
CREATE INDEX IF NOT EXISTS idx_points_expires ON member_points (expires_at) WHERE expires_at IS NOT NULL;

-- ── 플랫폼 Auth 프로필 (V2 소호몰 역할 관리) ─────────────────────
-- Supabase Auth users 테이블을 확장하는 profiles 테이블
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'customer'
    CHECK (role IN ('customer','seller','admin')),
  ADD COLUMN IF NOT EXISTS seller_status TEXT DEFAULT NULL
    CHECK (seller_status IN ('pending','approved','rejected','suspended'));
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- ================================================================
-- B. 상품 & 카테고리
-- ================================================================

-- ── 상품 분류 ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id   UUID REFERENCES categories(id) ON DELETE RESTRICT,
  name        TEXT NOT NULL,
  level       INT  NOT NULL CHECK (level IN (1,2,3)),
  sort_order  INT  NOT NULL DEFAULT 0,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT categories_parent_level_check CHECK (
    (level = 1 AND parent_id IS NULL) OR (level IN (2,3) AND parent_id IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS idx_categories_parent     ON categories (parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_level      ON categories (level);
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON categories (sort_order);

-- ── 상품 (기존 단일몰 + V2 소호몰 공용) ──────────────────────────
-- V2에서는 store_id가 있으면 소호몰 상품, NULL이면 플랫폼 직영 상품
CREATE TABLE IF NOT EXISTS products (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- 단일몰 필드 (store_id=NULL일 때 사용)
  serial_no     TEXT        UNIQUE,
  summary       TEXT,
  cat1_id       UUID        REFERENCES categories(id) ON DELETE SET NULL,
  cat2_id       UUID        REFERENCES categories(id) ON DELETE SET NULL,
  cat3_id       UUID        REFERENCES categories(id) ON DELETE SET NULL,
  sale_price    INT,
  -- 공통 필드
  name          TEXT        NOT NULL,
  description   TEXT,
  price         INT         NOT NULL DEFAULT 0 CHECK (price >= 0),
  stock         INT         NOT NULL DEFAULT 0 CHECK (stock >= 0),
  status        TEXT        NOT NULL DEFAULT 'stop'
                  CHECK (status IN ('sale','soldout','stop','active','draft','sold_out','hidden')),
  -- V2 소호몰 필드 (store_id IS NOT NULL일 때 사용)
  store_id      UUID        REFERENCES seller_stores(id) ON DELETE CASCADE,
  compare_price INT,
  cost_price    INT,
  category      TEXT,
  tags          TEXT[]      DEFAULT '{}',
  images        TEXT[]      DEFAULT '{}',
  track_inventory BOOLEAN   NOT NULL DEFAULT TRUE,
  stock_quantity  INT       NOT NULL DEFAULT 0,
  low_stock_alert INT       DEFAULT 5,
  has_options   BOOLEAN     NOT NULL DEFAULT FALSE,
  options       JSONB       DEFAULT '[]',
  variants      JSONB       DEFAULT '[]',
  meta_title    TEXT,
  meta_desc     TEXT,
  -- 고급 기능 (product_advanced_schema)
  is_pinned     BOOLEAN     NOT NULL DEFAULT FALSE,
  pinned_at     TIMESTAMPTZ,
  pinned_order  INT         NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_products_status     ON products (status);
CREATE INDEX IF NOT EXISTS idx_products_store      ON products (store_id);
CREATE INDEX IF NOT EXISTS idx_products_cat1       ON products (cat1_id);
CREATE INDEX IF NOT EXISTS idx_products_stock      ON products (stock);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_name_gin   ON products USING gin (to_tsvector('simple', name));

-- ── 상품 이미지 ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_images (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id   UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  storage_path TEXT        NOT NULL,
  public_url   TEXT        NOT NULL,
  sort_order   INT         NOT NULL DEFAULT 0,
  is_primary   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images (product_id, sort_order);
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_images_primary ON product_images (product_id) WHERE is_primary = TRUE;

-- ── 상품 옵션 그룹 / 값 / SKU ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_option_groups (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  sort_order INT  NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_option_groups_product ON product_option_groups (product_id, sort_order);

CREATE TABLE IF NOT EXISTS product_option_values (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id   UUID NOT NULL REFERENCES product_option_groups(id) ON DELETE CASCADE,
  value      TEXT NOT NULL,
  sort_order INT  NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_option_values_group ON product_option_values (group_id, sort_order);

CREATE TABLE IF NOT EXISTS product_skus (
  id               UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id       UUID    NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku_code         TEXT,
  option_combo     JSONB   NOT NULL,
  option_combo_text TEXT   NOT NULL,
  price_offset     INT     NOT NULL DEFAULT 0,
  stock            INT     NOT NULL DEFAULT 0,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_skus_product ON product_skus (product_id, is_active);

-- ── 상품 태그 ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_tags (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#4f8ef7',
  use_count  INT  NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT product_tags_slug_key UNIQUE (slug),
  CONSTRAINT product_tags_name_key UNIQUE (name)
);
CREATE INDEX IF NOT EXISTS idx_tags_use_count ON product_tags (use_count DESC);

CREATE TABLE IF NOT EXISTS product_tag_map (
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tag_id     UUID NOT NULL REFERENCES product_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_tag_map_tag     ON product_tag_map (tag_id);
CREATE INDEX IF NOT EXISTS idx_tag_map_product ON product_tag_map (product_id);

-- ── 연관 상품 ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_related (
  product_id   UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  related_id   UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sort_order   INT  NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, related_id),
  CONSTRAINT no_self_related CHECK (product_id <> related_id)
);

-- ================================================================
-- C. 전시 관리
-- ================================================================

-- ── 이벤트 ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  description TEXT,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  status      TEXT NOT NULL DEFAULT 'scheduled'
                CHECK (status IN ('active','scheduled','ended')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT events_date_check CHECK (end_date >= start_date)
);
CREATE INDEX IF NOT EXISTS idx_events_status     ON events (status);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events (start_date);

-- ── 전시 상품 ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS display_items (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id   UUID        NOT NULL REFERENCES products(id)  ON DELETE CASCADE,
  event_id     UUID        REFERENCES events(id)             ON DELETE CASCADE,
  display_type TEXT        NOT NULL DEFAULT 'default'
                 CHECK (display_type IN ('default','event')),
  start_date   DATE        NOT NULL,
  end_date     DATE        NOT NULL,
  sort_order   INT         NOT NULL DEFAULT 0,
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT display_type_event_check CHECK (
    (display_type = 'default' AND event_id IS NULL) OR
    (display_type = 'event'   AND event_id IS NOT NULL)
  ),
  CONSTRAINT display_date_check CHECK (end_date >= start_date),
  CONSTRAINT display_unique_product_event UNIQUE (product_id, event_id)
);
CREATE INDEX IF NOT EXISTS idx_display_product ON display_items (product_id);
CREATE INDEX IF NOT EXISTS idx_display_active  ON display_items (is_active, display_type);
CREATE INDEX IF NOT EXISTS idx_display_sort    ON display_items (sort_order);

-- ── 슬라이더 / 배너 / 팝업 / 프로모 바 ──────────────────────────
CREATE TABLE IF NOT EXISTS display_slides (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  title         TEXT,
  subtitle      TEXT,
  description   TEXT,
  image_url     TEXT        NOT NULL,
  image_mobile  TEXT,
  overlay_color TEXT        NOT NULL DEFAULT 'rgba(0,0,0,0.35)',
  cta_text      TEXT,
  cta_url       TEXT,
  cta_style     TEXT        NOT NULL DEFAULT 'light',
  text_align    TEXT        NOT NULL DEFAULT 'center',
  text_color    TEXT        NOT NULL DEFAULT '#ffffff',
  starts_at     TIMESTAMPTZ,
  ends_at       TIMESTAMPTZ,
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order    INT         NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_slides_active ON display_slides (is_active, sort_order);

CREATE TABLE IF NOT EXISTS display_banners (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  zone          TEXT        NOT NULL DEFAULT 'main',
  position      TEXT        NOT NULL DEFAULT 'full',
  title         TEXT,
  subtitle      TEXT,
  image_url     TEXT        NOT NULL,
  image_mobile  TEXT,
  link_url      TEXT,
  badge_text    TEXT,
  badge_color   TEXT        NOT NULL DEFAULT '#c4503a',
  overlay_color TEXT        NOT NULL DEFAULT 'rgba(0,0,0,0)',
  text_position TEXT        NOT NULL DEFAULT 'bottom-left',
  text_color    TEXT        NOT NULL DEFAULT '#ffffff',
  starts_at     TIMESTAMPTZ,
  ends_at       TIMESTAMPTZ,
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order    INT         NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_banners_zone ON display_banners (zone, is_active, sort_order);

CREATE TABLE IF NOT EXISTS display_popups (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  title         TEXT,
  body          TEXT,
  image_url     TEXT,
  link_url      TEXT,
  link_text     TEXT        NOT NULL DEFAULT '자세히 보기',
  width         INT         NOT NULL DEFAULT 480,
  position      TEXT        NOT NULL DEFAULT 'center',
  show_close    BOOLEAN     NOT NULL DEFAULT TRUE,
  close_text    TEXT        NOT NULL DEFAULT '닫기',
  dismiss_days  INT         NOT NULL DEFAULT 1,
  dismiss_text  TEXT        NOT NULL DEFAULT '오늘 하루 안 보기',
  starts_at     TIMESTAMPTZ,
  ends_at       TIMESTAMPTZ,
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order    INT         NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_popups_active ON display_popups (is_active, starts_at, ends_at);

CREATE TABLE IF NOT EXISTS display_promo_bars (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  message       TEXT        NOT NULL,
  link_url      TEXT,
  link_text     TEXT,
  bg_color      TEXT        NOT NULL DEFAULT '#1A1A18',
  text_color    TEXT        NOT NULL DEFAULT '#FAFAF8',
  show_close    BOOLEAN     NOT NULL DEFAULT TRUE,
  starts_at     TIMESTAMPTZ,
  ends_at       TIMESTAMPTZ,
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order    INT         NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- D. 주문 & 결제
-- ================================================================

-- ── 쿠폰 ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupons (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  code             TEXT        NOT NULL,
  name             TEXT        NOT NULL,
  description      TEXT,
  discount_type    TEXT        NOT NULL CHECK (discount_type IN ('percent','fixed')),
  discount_value   INT         NOT NULL CHECK (discount_value > 0),
  min_order_amount INT         NOT NULL DEFAULT 0,
  max_discount_amt INT,
  usage_limit      INT,
  usage_count      INT         NOT NULL DEFAULT 0,
  per_user_limit   INT         NOT NULL DEFAULT 1,
  valid_from       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until      TIMESTAMPTZ,
  applicable_cat   TEXT,
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT coupons_code_key UNIQUE (code)
);
CREATE INDEX IF NOT EXISTS idx_coupons_code   ON coupons (code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons (is_active, valid_until);

-- ── 주문 ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- 단일몰 필드
  order_no         TEXT        UNIQUE,
  member_id        UUID        REFERENCES members(id) ON DELETE SET NULL,
  shipping_address TEXT,
  -- V2 소호몰 필드
  order_number     TEXT        UNIQUE,
  customer_id      UUID        REFERENCES auth.users(id),
  shipping_name    TEXT,
  shipping_phone   TEXT,
  shipping_addr    TEXT,
  shipping_detail  TEXT,
  postal_code      TEXT,
  payment_method   TEXT,
  payment_key      TEXT,
  shipping_fee     INT         NOT NULL DEFAULT 0,
  -- 공통
  total_amount     INT         NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  status           TEXT        NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','paid','preparing','shipping','delivered','returned','cancelled','refunded')),
  coupon_id        UUID        REFERENCES coupons(id),
  coupon_discount  INT         NOT NULL DEFAULT 0,
  point_used       INT         NOT NULL DEFAULT 0,
  memo             TEXT,
  paid_at          TIMESTAMPTZ,
  tracking_number  TEXT,
  carrier_code     TEXT,
  shipped_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_orders_member_id  ON orders (member_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer   ON orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);

-- ── 주문 상품 ─────────────────────────────────────────────────────
-- 단일몰 + V2 소호몰 공용 (store_id가 있으면 소호몰 아이템)
CREATE TABLE IF NOT EXISTS order_items (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id         UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id       UUID        REFERENCES products(id) ON DELETE RESTRICT,
  product_name     TEXT        NOT NULL,
  unit_price       INT         NOT NULL CHECK (unit_price >= 0),
  sale_price       INT,
  quantity         INT         NOT NULL DEFAULT 1 CHECK (quantity > 0),
  -- V2 소호몰 전용
  store_id         UUID        REFERENCES seller_stores(id),
  total_price      INT         NOT NULL DEFAULT 0,
  options_snapshot JSONB       DEFAULT '{}',
  product_image    TEXT,
  item_status      TEXT        NOT NULL DEFAULT 'pending'
                     CHECK (item_status IN ('pending','preparing','shipping','delivered','cancelled')),
  tracking_number  TEXT,
  carrier_code     TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id   ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items (product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_store      ON order_items (store_id);

-- FK 지연 추가 (member_points.order_id)
ALTER TABLE member_points
  ADD CONSTRAINT fk_points_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
  NOT VALID;

-- ── 쿠폰 사용 내역 ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupon_usages (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  coupon_id    UUID        NOT NULL REFERENCES coupons(id)  ON DELETE CASCADE,
  member_id    UUID        REFERENCES members(id)           ON DELETE SET NULL,
  order_id     UUID        REFERENCES orders(id)            ON DELETE SET NULL,
  discount_amt INT         NOT NULL,
  used_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_coupon ON coupon_usages (coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_member ON coupon_usages (member_id);

-- ── 주문 상태 이력 ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_status_history (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status   TEXT        NOT NULL,
  memo        TEXT,
  changed_by  TEXT        NOT NULL DEFAULT 'system',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_order_history_order ON order_status_history (order_id, created_at DESC);

-- ── 송장 ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_shipments (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  carrier_code    TEXT        NOT NULL,
  carrier_name    TEXT        NOT NULL,
  tracking_number TEXT        NOT NULL,
  tracking_url    TEXT,
  shipped_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at    TIMESTAMPTZ,
  memo            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT shipments_order_key UNIQUE (order_id)
);
CREATE INDEX IF NOT EXISTS idx_shipments_order    ON order_shipments (order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking ON order_shipments (carrier_code, tracking_number);

-- ── 결제 (Toss Payments) ─────────────────────────────────────────
CREATE TYPE IF NOT EXISTS payment_method AS ENUM (
  'card','virtual_account','account_transfer','mobile','kakaopay','naverpay','tosspay'
);
CREATE TYPE IF NOT EXISTS payment_status AS ENUM (
  'ready','in_progress','waiting_for_deposit','done','canceled','partial_canceled','aborted','expired'
);

CREATE TABLE IF NOT EXISTS payments (
  id                     UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id               UUID            NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payment_key            TEXT,
  order_id_toss          TEXT            NOT NULL,
  amount                 INT             NOT NULL CHECK (amount > 0),
  method                 payment_method,
  status                 payment_status  NOT NULL DEFAULT 'ready',
  currency               TEXT            NOT NULL DEFAULT 'KRW',
  virtual_account_number TEXT,
  virtual_account_bank   TEXT,
  virtual_account_due    TIMESTAMPTZ,
  card_number            TEXT,
  card_company           TEXT,
  cancel_amount          INT             NOT NULL DEFAULT 0,
  cancel_reason          TEXT,
  canceled_at            TIMESTAMPTZ,
  toss_response          JSONB,
  coupon_discount        INT             NOT NULL DEFAULT 0,
  point_used             INT             NOT NULL DEFAULT 0,
  approved_at            TIMESTAMPTZ,
  created_at             TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  CONSTRAINT payments_payment_key_key   UNIQUE (payment_key),
  CONSTRAINT payments_order_id_toss_key UNIQUE (order_id_toss)
);
CREATE INDEX IF NOT EXISTS idx_payments_order   ON payments (order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status  ON payments (status);
CREATE INDEX IF NOT EXISTS idx_payments_key     ON payments (payment_key);
CREATE INDEX IF NOT EXISTS idx_payments_created ON payments (created_at DESC);

-- ================================================================
-- E. 고객센터
-- ================================================================

CREATE TYPE IF NOT EXISTS inquiry_category AS ENUM (
  'order','shipping','return','product','account','coupon','other'
);
CREATE TYPE IF NOT EXISTS inquiry_status AS ENUM (
  'pending','in_progress','answered','closed'
);

CREATE TABLE IF NOT EXISTS inquiries (
  id               UUID             PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id        UUID             REFERENCES members(id) ON DELETE SET NULL,
  order_id         UUID             REFERENCES orders(id)  ON DELETE SET NULL,
  author_name      TEXT             NOT NULL,
  author_email     TEXT             NOT NULL,
  category         inquiry_category NOT NULL DEFAULT 'other',
  title            TEXT             NOT NULL CHECK (LENGTH(title)  BETWEEN 1 AND 200),
  body             TEXT             NOT NULL CHECK (LENGTH(body)   BETWEEN 5 AND 5000),
  status           inquiry_status   NOT NULL DEFAULT 'pending',
  is_private       BOOLEAN          NOT NULL DEFAULT TRUE,
  admin_reply      TEXT,
  admin_replied_at TIMESTAMPTZ,
  admin_id         TEXT,
  attachments      TEXT[]           NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inquiries_member   ON inquiries (member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_status   ON inquiries (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_category ON inquiries (category);

CREATE TABLE IF NOT EXISTS inquiry_replies (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  inquiry_id  UUID        NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  is_admin    BOOLEAN     NOT NULL DEFAULT FALSE,
  author_name TEXT        NOT NULL,
  body        TEXT        NOT NULL CHECK (LENGTH(body) BETWEEN 1 AND 3000),
  attachments TEXT[]      NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inquiry_replies ON inquiry_replies (inquiry_id, created_at);

CREATE TABLE IF NOT EXISTS faqs (
  id          UUID             PRIMARY KEY DEFAULT uuid_generate_v4(),
  category    inquiry_category NOT NULL DEFAULT 'other',
  question    TEXT             NOT NULL,
  answer      TEXT             NOT NULL,
  sort_order  INT              NOT NULL DEFAULT 0,
  is_active   BOOLEAN          NOT NULL DEFAULT TRUE,
  view_count  INT              NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_faqs_category ON faqs (category, sort_order);
CREATE INDEX IF NOT EXISTS idx_faqs_active   ON faqs (is_active);

-- ── 상품 리뷰 ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_reviews (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id       UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  member_id        UUID        REFERENCES members(id)  ON DELETE SET NULL,
  order_id         UUID        REFERENCES orders(id)   ON DELETE SET NULL,
  reviewer_name    TEXT        NOT NULL,
  reviewer_email   TEXT,
  rating           INT         NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title            TEXT        NOT NULL CHECK (LENGTH(title) BETWEEN 1 AND 100),
  body             TEXT        NOT NULL CHECK (LENGTH(body)  BETWEEN 5 AND 2000),
  status           TEXT        NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','approved','rejected')),
  reject_reason    TEXT,
  helpful_count    INT         NOT NULL DEFAULT 0,
  admin_reply      TEXT,
  admin_replied_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT reviews_member_product_unique UNIQUE (member_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON product_reviews (product_id, status);
CREATE INDEX IF NOT EXISTS idx_reviews_member  ON product_reviews (member_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating  ON product_reviews (product_id, rating);

CREATE TABLE IF NOT EXISTS review_helpful_votes (
  review_id  UUID NOT NULL REFERENCES product_reviews(id) ON DELETE CASCADE,
  member_id  UUID NOT NULL REFERENCES members(id)         ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (review_id, member_id)
);

-- ================================================================
-- F. V2 소호몰
-- ================================================================

-- ── 판매자 신청 ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS seller_applications (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name   TEXT        NOT NULL,
  business_type   TEXT        NOT NULL CHECK (business_type IN ('individual','corporation')),
  business_number TEXT,
  representative  TEXT        NOT NULL,
  phone           TEXT        NOT NULL,
  email           TEXT        NOT NULL,
  address         TEXT        NOT NULL,
  store_name      TEXT        NOT NULL,
  store_slug      TEXT        NOT NULL,
  store_category  TEXT        NOT NULL,
  store_intro     TEXT,
  id_document_url TEXT,
  biz_doc_url     TEXT,
  status          TEXT        NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','rejected')),
  admin_note      TEXT,
  reviewed_by     UUID        REFERENCES auth.users(id),
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_seller_applications_user   ON seller_applications (user_id);
CREATE INDEX IF NOT EXISTS idx_seller_applications_status ON seller_applications (status);
CREATE INDEX IF NOT EXISTS idx_seller_applications_slug   ON seller_applications (store_slug);

-- ── 소호몰 ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS seller_stores (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_name      TEXT        NOT NULL,
  slug            TEXT        NOT NULL UNIQUE,
  tagline         TEXT,
  intro           TEXT,
  store_category  TEXT        NOT NULL,
  logo_url        TEXT,
  banner_url      TEXT,
  theme_color     TEXT        NOT NULL DEFAULT '#6366f1',
  shipping_policy TEXT,
  return_policy   TEXT,
  fee_rate        NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  contact_email   TEXT,
  contact_phone   TEXT,
  sns_links       JSONB       NOT NULL DEFAULT '{}',
  status          TEXT        NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','suspended','closed')),
  total_products  INT         NOT NULL DEFAULT 0,
  total_orders    INT         NOT NULL DEFAULT 0,
  total_revenue   NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_seller_stores_owner ON seller_stores (owner_id);
CREATE INDEX IF NOT EXISTS idx_seller_stores_slug  ON seller_stores (slug);

-- ── 판매자 알림 ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS seller_notifications (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL CHECK (type IN
               ('application_approved','application_rejected','suspended','settlement_completed')),
  title      TEXT        NOT NULL,
  message    TEXT        NOT NULL,
  is_read    BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_seller_notifications_user ON seller_notifications (user_id);

-- ── 정산 ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settlements (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id       UUID        NOT NULL REFERENCES seller_stores(id),
  period_start   DATE        NOT NULL,
  period_end     DATE        NOT NULL,
  gross_amount   NUMERIC(15,2) NOT NULL,
  fee_rate       NUMERIC(5,2)  NOT NULL,
  fee_amount     NUMERIC(15,2) NOT NULL,
  net_amount     NUMERIC(15,2) NOT NULL,
  bank_name      TEXT,
  account_number TEXT,
  account_holder TEXT,
  status         TEXT        NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','processing','completed','failed')),
  paid_at        TIMESTAMPTZ,
  admin_note     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_settlements_store  ON settlements (store_id);
CREATE INDEX IF NOT EXISTS idx_settlements_status ON settlements (status);

CREATE TABLE IF NOT EXISTS settlement_items (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  settlement_id UUID        NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
  order_item_id UUID        NOT NULL REFERENCES order_items(id),
  order_number  TEXT        NOT NULL,
  product_name  TEXT        NOT NULL,
  quantity      INT         NOT NULL,
  gross_amount  NUMERIC(12,2) NOT NULL,
  fee_amount    NUMERIC(12,2) NOT NULL,
  net_amount    NUMERIC(12,2) NOT NULL,
  delivered_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- G. 기타
-- ================================================================

-- ── Web Push ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id        UUID        REFERENCES members(id) ON DELETE CASCADE,
  endpoint         TEXT        NOT NULL,
  p256dh           TEXT        NOT NULL,
  auth             TEXT        NOT NULL,
  user_agent       TEXT,
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  notify_order     BOOLEAN     NOT NULL DEFAULT TRUE,
  notify_marketing BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint)
);
CREATE INDEX IF NOT EXISTS idx_push_member ON push_subscriptions (member_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_push_active ON push_subscriptions (is_active, notify_order);

CREATE TABLE IF NOT EXISTS push_logs (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID        REFERENCES push_subscriptions(id) ON DELETE SET NULL,
  member_id       UUID        REFERENCES members(id) ON DELETE SET NULL,
  type            TEXT        NOT NULL,
  title           TEXT        NOT NULL,
  body            TEXT        NOT NULL,
  success         BOOLEAN     NOT NULL DEFAULT FALSE,
  error_message   TEXT,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_push_logs_member ON push_logs (member_id, sent_at DESC);

SELECT 'Tables ready' AS status;
