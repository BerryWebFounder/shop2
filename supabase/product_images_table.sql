-- ================================================================
-- product_images 테이블
-- Supabase SQL Editor에서 실행하세요
-- ================================================================

CREATE TABLE IF NOT EXISTS product_images (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id   UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  storage_path TEXT        NOT NULL,   -- Supabase Storage 경로
  public_url   TEXT        NOT NULL,   -- CDN 공개 URL
  sort_order   INT         NOT NULL DEFAULT 0,
  is_primary   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_images_product
  ON product_images (product_id, sort_order);

-- 상품당 대표 이미지는 하나만
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_images_primary
  ON product_images (product_id)
  WHERE is_primary = TRUE;

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- 공개 읽기 (쇼핑몰 프론트엔드)
CREATE POLICY "product_images: public read"
  ON product_images FOR SELECT
  USING (TRUE);

-- 쓰기는 인증된 관리자만
CREATE POLICY "product_images: authenticated write"
  ON product_images FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ── updated_at 트리거 불필요 (created_at만 사용) ───────────────

-- ── 상품 목록 뷰 업데이트 ─────────────────────────────────────
-- product_list_view에 대표 이미지 URL을 포함하려면 아래처럼 뷰를 재생성
DROP VIEW IF EXISTS product_list_view CASCADE;

CREATE VIEW product_list_view AS
SELECT
  p.id,
  p.serial_no,
  p.name,
  p.summary,
  p.price,
  p.sale_price,
  p.stock,
  p.status,
  p.created_at,
  p.updated_at,
  c1.id   AS cat1_id,
  c1.name AS cat1_name,
  c2.id   AS cat2_id,
  c2.name AS cat2_name,
  c3.id   AS cat3_id,
  c3.name AS cat3_name,
  CASE
    WHEN p.sale_price IS NOT NULL AND p.price > 0
      THEN ROUND((1 - p.sale_price::NUMERIC / p.price) * 100, 1)
    ELSE NULL
  END AS discount_rate,
  -- 대표 이미지 URL (없으면 NULL)
  pi.public_url AS primary_image_url
FROM products p
LEFT JOIN categories c1 ON c1.id = p.cat1_id
LEFT JOIN categories c2 ON c2.id = p.cat2_id
LEFT JOIN categories c3 ON c3.id = p.cat3_id
LEFT JOIN product_images pi
       ON pi.product_id = p.id AND pi.is_primary = TRUE;

COMMENT ON VIEW product_list_view IS
  '상품 목록 뷰. 분류명, 할인율, 대표 이미지 URL을 포함합니다.';

SELECT 'product_images table ready' AS status;
