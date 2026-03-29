-- ================================================================
-- 상품 관리 고도화 스키마
-- - 상품 옵션 (SKU 조합)
-- - 태그 시스템
-- - 철하/고정
-- - 연관 상품
-- ================================================================

-- ── 옵션 그룹 (예: 색상, 사이즈) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS product_option_groups (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,              -- '색상', '사이즈'
  sort_order INT  NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_option_groups_product ON product_option_groups (product_id, sort_order);

-- ── 옵션 값 (예: 빨강, S/M/L) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_option_values (
  id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES product_option_groups(id) ON DELETE CASCADE,
  value    TEXT NOT NULL,               -- '빨강', 'S'
  sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_option_values_group ON product_option_values (group_id, sort_order);

-- ── SKU (옵션 조합별 재고/가격) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS product_skus (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku_code        TEXT,                 -- 자동 생성 또는 수동 입력
  option_combo    JSONB NOT NULL,       -- {"색상": "빨강", "사이즈": "M"}
  option_combo_text TEXT NOT NULL,      -- "빨강 / M" (표시용)
  price_offset    INT  NOT NULL DEFAULT 0,  -- 기본가 대비 추가 금액
  stock           INT  NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skus_product ON product_skus (product_id, is_active);

DROP TRIGGER IF EXISTS trg_skus_updated_at ON product_skus;
CREATE TRIGGER trg_skus_updated_at
  BEFORE UPDATE ON product_skus
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 태그 ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_tags (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL,             -- URL 친화적 (영문/소문자)
  color      TEXT NOT NULL DEFAULT '#4f8ef7',
  use_count  INT  NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT product_tags_slug_key UNIQUE (slug),
  CONSTRAINT product_tags_name_key UNIQUE (name)
);

CREATE INDEX IF NOT EXISTS idx_tags_name ON product_tags (name);
CREATE INDEX IF NOT EXISTS idx_tags_use_count ON product_tags (use_count DESC);

-- ── 상품-태그 매핑 ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_tag_map (
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tag_id     UUID NOT NULL REFERENCES product_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_tag_map_tag     ON product_tag_map (tag_id);
CREATE INDEX IF NOT EXISTS idx_tag_map_product ON product_tag_map (product_id);

-- use_count 자동 동기화 트리거
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
  AFTER INSERT OR DELETE ON product_tag_map
  FOR EACH ROW EXECUTE FUNCTION trg_sync_tag_use_count();

-- ── 상품 철하/고정 컬럼 추가 ─────────────────────────────────────
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_pinned    BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pinned_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pinned_order INT         NOT NULL DEFAULT 0;

-- ── 연관 상품 ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_relations (
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  related_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sort_order  INT  NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (product_id, related_id),
  CONSTRAINT no_self_relation CHECK (product_id <> related_id)
);

CREATE INDEX IF NOT EXISTS idx_relations_product ON product_relations (product_id, sort_order);

-- ── 태그 포함 상품 목록 뷰 업데이트 ─────────────────────────────
DROP VIEW IF EXISTS product_list_view CASCADE;
CREATE VIEW product_list_view AS
SELECT
  p.id, p.serial_no, p.name, p.summary, p.price, p.sale_price,
  p.stock, p.status, p.is_pinned, p.pinned_order,
  p.created_at, p.updated_at,
  c1.id AS cat1_id, c1.name AS cat1_name,
  c2.id AS cat2_id, c2.name AS cat2_name,
  c3.id AS cat3_id, c3.name AS cat3_name,
  CASE WHEN p.sale_price IS NOT NULL AND p.price > 0
    THEN ROUND((1 - p.sale_price::NUMERIC / p.price) * 100, 1)
  ELSE NULL END AS discount_rate,
  pi.public_url AS primary_image_url,
  -- 태그 배열
  COALESCE(
    (SELECT JSONB_AGG(JSONB_BUILD_OBJECT('id', t.id, 'name', t.name, 'color', t.color))
     FROM product_tag_map tm JOIN product_tags t ON t.id = tm.tag_id
     WHERE tm.product_id = p.id),
    '[]'::JSONB
  ) AS tags
FROM products p
LEFT JOIN categories c1 ON c1.id = p.cat1_id
LEFT JOIN categories c2 ON c2.id = p.cat2_id
LEFT JOIN categories c3 ON c3.id = p.cat3_id
LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = TRUE;

-- ── RLS ──────────────────────────────────────────────────────────
ALTER TABLE product_option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_option_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_skus          ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_tags          ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_tag_map       ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_relations     ENABLE ROW LEVEL SECURITY;

-- 공개 읽기 (쇼핑몰)
CREATE POLICY "options: public read" ON product_option_groups FOR SELECT USING (TRUE);
CREATE POLICY "opt_val: public read" ON product_option_values FOR SELECT USING (TRUE);
CREATE POLICY "skus: public read"    ON product_skus FOR SELECT USING (is_active = TRUE OR auth.role() = 'authenticated');
CREATE POLICY "tags: public read"    ON product_tags FOR SELECT USING (TRUE);
CREATE POLICY "tagmap: public read"  ON product_tag_map FOR SELECT USING (TRUE);
CREATE POLICY "relations: public"    ON product_relations FOR SELECT USING (TRUE);

-- 관리자 쓰기
CREATE POLICY "options: admin write" ON product_option_groups FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "opt_val: admin write" ON product_option_values FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "skus: admin write"    ON product_skus FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "tags: admin write"    ON product_tags FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "tagmap: admin write"  ON product_tag_map FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "relations: admin"     ON product_relations FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

SELECT 'Product advanced schema ready' AS status;
