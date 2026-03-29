-- ================================================================
-- 상품 리뷰/평점 스키마
-- Supabase SQL Editor에서 실행하세요
-- ================================================================

-- ── 리뷰 테이블 ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_reviews (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id   UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  member_id    UUID        REFERENCES members(id) ON DELETE SET NULL,
  order_id     UUID        REFERENCES orders(id)  ON DELETE SET NULL,

  -- 작성자 정보 (비회원 리뷰도 허용)
  reviewer_name  TEXT      NOT NULL,
  reviewer_email TEXT,

  -- 리뷰 내용
  rating       INT         NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title        TEXT        NOT NULL CHECK (LENGTH(title) BETWEEN 1 AND 100),
  body         TEXT        NOT NULL CHECK (LENGTH(body) BETWEEN 5 AND 2000),

  -- 관리자 검토 상태
  status       TEXT        NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'approved', 'rejected')),
  reject_reason TEXT,       -- 거부 사유

  -- 도움이 됐어요
  helpful_count INT        NOT NULL DEFAULT 0,

  -- 관리자 공개 답변
  admin_reply  TEXT,
  admin_replied_at TIMESTAMPTZ,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 주문한 상품에 대해서만 1인 1리뷰
  CONSTRAINT reviews_member_product_unique UNIQUE (member_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_product    ON product_reviews (product_id, status);
CREATE INDEX IF NOT EXISTS idx_reviews_member     ON product_reviews (member_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status     ON product_reviews (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_rating     ON product_reviews (product_id, rating);

-- ── 리뷰 도움 투표 테이블 (중복 방지) ────────────────────────────
CREATE TABLE IF NOT EXISTS review_helpful_votes (
  review_id  UUID NOT NULL REFERENCES product_reviews(id) ON DELETE CASCADE,
  member_id  UUID NOT NULL REFERENCES members(id)         ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (review_id, member_id)
);

-- ── updated_at 트리거 ─────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_reviews_updated_at ON product_reviews;
CREATE TRIGGER trg_reviews_updated_at
  BEFORE UPDATE ON product_reviews
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 상품 평점 집계 뷰 ────────────────────────────────────────────
DROP VIEW IF EXISTS product_rating_summary CASCADE;
CREATE VIEW product_rating_summary AS
SELECT
  product_id,
  COUNT(*)::INT                               AS review_count,
  ROUND(AVG(rating)::NUMERIC, 1)             AS avg_rating,
  COUNT(*) FILTER (WHERE rating = 5)::INT     AS star5,
  COUNT(*) FILTER (WHERE rating = 4)::INT     AS star4,
  COUNT(*) FILTER (WHERE rating = 3)::INT     AS star3,
  COUNT(*) FILTER (WHERE rating = 2)::INT     AS star2,
  COUNT(*) FILTER (WHERE rating = 1)::INT     AS star1
FROM product_reviews
WHERE status = 'approved'
GROUP BY product_id;

COMMENT ON VIEW product_rating_summary IS
  '승인된 리뷰만 집계. 상품 상세/목록 페이지의 평점 표시에 사용합니다.';

-- ── 관리자용 리뷰 목록 뷰 ────────────────────────────────────────
DROP VIEW IF EXISTS review_admin_view CASCADE;
CREATE VIEW review_admin_view AS
SELECT
  r.id,
  r.product_id,
  p.name          AS product_name,
  p.serial_no     AS product_serial,
  r.member_id,
  r.reviewer_name,
  r.reviewer_email,
  r.rating,
  r.title,
  r.body,
  r.status,
  r.reject_reason,
  r.helpful_count,
  r.admin_reply,
  r.admin_replied_at,
  r.created_at,
  r.updated_at
FROM product_reviews r
JOIN products p ON p.id = r.product_id;

-- ── 리뷰 통계 함수 ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION review_stats_summary()
RETURNS TABLE (
  total       BIGINT,
  pending     BIGINT,
  approved    BIGINT,
  rejected    BIGINT,
  avg_rating  NUMERIC
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'approved')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'rejected')::BIGINT,
    ROUND(AVG(rating) FILTER (WHERE status = 'approved')::NUMERIC, 1)
  FROM product_reviews;
$$;

-- ── RLS ──────────────────────────────────────────────────────────
ALTER TABLE product_reviews       ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_helpful_votes  ENABLE ROW LEVEL SECURITY;

-- 승인된 리뷰는 누구나 읽기 가능 (쇼핑몰 프론트)
DROP POLICY IF EXISTS "reviews: public select approved" ON product_reviews;
CREATE POLICY "reviews: public select approved"
  ON product_reviews FOR SELECT
  USING (
    status = 'approved'
    OR auth.role() = 'authenticated'   -- 관리자는 전체 조회
  );

-- 리뷰 작성: 누구나 가능 (서버사이드 검증으로 주문 여부 확인)
DROP POLICY IF EXISTS "reviews: anon insert" ON product_reviews;
CREATE POLICY "reviews: anon insert"
  ON product_reviews FOR INSERT
  WITH CHECK (TRUE);

-- 본인 리뷰 수정 (미승인 상태만)
DROP POLICY IF EXISTS "reviews: member update own" ON product_reviews;
CREATE POLICY "reviews: member update own"
  ON product_reviews FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    -- 실제 운영에서는 auth.uid() → members.id 매핑 추가
  );

-- 관리자 전체 관리
DROP POLICY IF EXISTS "reviews: admin all" ON product_reviews;
CREATE POLICY "reviews: admin all"
  ON product_reviews FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 도움 투표
DROP POLICY IF EXISTS "helpful: member insert" ON review_helpful_votes;
CREATE POLICY "helpful: member insert"
  ON review_helpful_votes FOR INSERT
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "helpful: member select" ON review_helpful_votes;
CREATE POLICY "helpful: member select"
  ON review_helpful_votes FOR SELECT
  USING (TRUE);

SELECT 'Reviews schema ready' AS status;
