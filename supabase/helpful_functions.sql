-- ================================================================
-- 리뷰 도움이 됐어요 카운터 함수
-- ================================================================

CREATE OR REPLACE FUNCTION increment_helpful(p_review_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE product_reviews
  SET helpful_count = helpful_count + 1
  WHERE id = p_review_id;
END;
$$;

CREATE OR REPLACE FUNCTION decrement_helpful(p_review_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE product_reviews
  SET helpful_count = GREATEST(helpful_count - 1, 0)
  WHERE id = p_review_id;
END;
$$;

SELECT 'Helpful functions ready' AS status;
