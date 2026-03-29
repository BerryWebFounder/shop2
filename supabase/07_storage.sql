-- ================================================================
-- 07. Supabase Storage 버킷 & 정책
-- 상품 이미지 업로드용
-- ================================================================

-- ── 버킷 생성 ──────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'product-images',
    'product-images',
    TRUE,           -- 공개 버킷 (쇼핑몰 프론트엔드에서 URL로 직접 접근)
    5242880,        -- 5MB 제한
    ARRAY['image/jpeg','image/png','image/webp','image/gif']
  )
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ── Storage RLS 정책 ────────────────────────────────────────────────

-- 공개 읽기 (누구나 상품 이미지 조회 가능)
DROP POLICY IF EXISTS "product-images: public read" ON storage.objects;
CREATE POLICY "product-images: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

-- 업로드: 인증된 관리자만
DROP POLICY IF EXISTS "product-images: authenticated upload" ON storage.objects;
CREATE POLICY "product-images: authenticated upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'product-images'
    AND auth.role() = 'authenticated'
  );

-- 수정/삭제: 인증된 관리자만
DROP POLICY IF EXISTS "product-images: authenticated update" ON storage.objects;
CREATE POLICY "product-images: authenticated update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'product-images'
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "product-images: authenticated delete" ON storage.objects;
CREATE POLICY "product-images: authenticated delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'product-images'
    AND auth.role() = 'authenticated'
  );

SELECT 'Storage ready' AS status;
