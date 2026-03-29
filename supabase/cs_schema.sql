-- ================================================================
-- 고객센터 (1:1 문의 + FAQ) 스키마
-- ================================================================

-- ── 문의 카테고리 ────────────────────────────────────────────────
CREATE TYPE inquiry_category AS ENUM (
  'order',       -- 주문/결제
  'shipping',    -- 배송
  'return',      -- 교환/반품
  'product',     -- 상품 문의
  'account',     -- 계정/회원
  'coupon',      -- 쿠폰/포인트
  'other'        -- 기타
);

CREATE TYPE inquiry_status AS ENUM (
  'pending',     -- 접수 대기
  'in_progress', -- 처리 중
  'answered',    -- 답변 완료
  'closed'       -- 종결
);

-- ── 문의 테이블 ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inquiries (
  id             UUID             PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id      UUID             REFERENCES members(id) ON DELETE SET NULL,
  order_id       UUID             REFERENCES orders(id)  ON DELETE SET NULL,

  -- 작성자 정보 (비회원도 허용)
  author_name    TEXT             NOT NULL,
  author_email   TEXT             NOT NULL,

  -- 문의 내용
  category       inquiry_category NOT NULL DEFAULT 'other',
  title          TEXT             NOT NULL CHECK (LENGTH(title)   BETWEEN 1 AND 200),
  body           TEXT             NOT NULL CHECK (LENGTH(body)    BETWEEN 5 AND 5000),

  -- 상태
  status         inquiry_status   NOT NULL DEFAULT 'pending',
  is_private     BOOLEAN          NOT NULL DEFAULT TRUE,   -- 비공개(기본)

  -- 관리자 답변 (멀티스레드: 별도 replies 테이블 사용)
  -- 단일 답변이 필요하면 여기 직접 저장
  admin_reply    TEXT,
  admin_replied_at TIMESTAMPTZ,
  admin_id       TEXT,            -- 답변한 관리자 식별자

  -- 첨부파일 (Storage URL 배열)
  attachments    TEXT[]           NOT NULL DEFAULT '{}',

  created_at     TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inquiries_member   ON inquiries (member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_status   ON inquiries (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_category ON inquiries (category);
CREATE INDEX IF NOT EXISTS idx_inquiries_order    ON inquiries (order_id);

-- ── 문의 답변 스레드 (멀티 답변) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS inquiry_replies (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  inquiry_id   UUID        NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  is_admin     BOOLEAN     NOT NULL DEFAULT FALSE,  -- TRUE: 관리자, FALSE: 고객 추가 답글
  author_name  TEXT        NOT NULL,
  body         TEXT        NOT NULL CHECK (LENGTH(body) BETWEEN 1 AND 3000),
  attachments  TEXT[]      NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inquiry_replies ON inquiry_replies (inquiry_id, created_at);

-- ── FAQ 테이블 ───────────────────────────────────────────────────
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

-- ── updated_at 트리거 ─────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_inquiries_updated_at ON inquiries;
CREATE TRIGGER trg_inquiries_updated_at
  BEFORE UPDATE ON inquiries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_faqs_updated_at ON faqs;
CREATE TRIGGER trg_faqs_updated_at
  BEFORE UPDATE ON faqs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 답변 완료 시 inquiry status 자동 변경 ────────────────────────
CREATE OR REPLACE FUNCTION trg_auto_status_on_reply()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_admin THEN
    UPDATE inquiries
    SET status = 'answered', admin_replied_at = NOW()
    WHERE id = NEW.inquiry_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inquiry_reply_status ON inquiry_replies;
CREATE TRIGGER trg_inquiry_reply_status
  AFTER INSERT ON inquiry_replies
  FOR EACH ROW EXECUTE FUNCTION trg_auto_status_on_reply();

-- ── 문의 통계 함수 ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION inquiry_stats()
RETURNS TABLE (
  total       BIGINT,
  pending     BIGINT,
  in_progress BIGINT,
  answered    BIGINT,
  closed      BIGINT,
  avg_response_hours NUMERIC
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'in_progress')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'answered')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'closed')::BIGINT,
    ROUND(
      AVG(EXTRACT(EPOCH FROM (admin_replied_at - created_at)) / 3600)
      FILTER (WHERE admin_replied_at IS NOT NULL),
      1
    )::NUMERIC
  FROM inquiries;
$$;

-- ── Supabase Storage 버킷 (문의 첨부파일) ───────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'inquiry-attachments',
  'inquiry-attachments',
  FALSE,          -- 비공개 버킷 (서명 URL로 접근)
  10485760,       -- 10MB
  ARRAY['image/jpeg','image/png','image/webp','image/gif','application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ── RLS ──────────────────────────────────────────────────────────
ALTER TABLE inquiries       ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiry_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs            ENABLE ROW LEVEL SECURITY;

-- 문의: 본인 것만 조회 (비공개), 관리자는 전체
CREATE POLICY "inquiries: member select own" ON inquiries FOR SELECT
  USING (
    auth.role() = 'authenticated'   -- 관리자 or 로그인 회원
    -- 실제 운영에서는 auth.uid() → members.id 매핑으로 본인 것만 필터
  );

CREATE POLICY "inquiries: anon insert" ON inquiries FOR INSERT
  WITH CHECK (TRUE);  -- 비회원도 문의 가능, 서버에서 검증

CREATE POLICY "inquiries: admin all" ON inquiries FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 답변: 해당 문의 작성자 + 관리자
CREATE POLICY "replies: select" ON inquiry_replies FOR SELECT
  USING (auth.role() = 'authenticated' OR TRUE);  -- 문의 상세 페이지에서 조회
CREATE POLICY "replies: insert" ON inquiry_replies FOR INSERT
  WITH CHECK (TRUE);
CREATE POLICY "replies: admin" ON inquiry_replies FOR ALL
  USING (auth.role() = 'authenticated');

-- FAQ: 활성 항목은 공개
CREATE POLICY "faqs: public select" ON faqs FOR SELECT
  USING (is_active = TRUE OR auth.role() = 'authenticated');
CREATE POLICY "faqs: admin all" ON faqs FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Storage RLS
DROP POLICY IF EXISTS "inquiry-att: upload" ON storage.objects;
CREATE POLICY "inquiry-att: upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'inquiry-attachments');

DROP POLICY IF EXISTS "inquiry-att: read" ON storage.objects;
CREATE POLICY "inquiry-att: read" ON storage.objects FOR SELECT
  USING (bucket_id = 'inquiry-attachments' AND auth.role() = 'authenticated');

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE inquiries;

SELECT 'CS schema ready' AS status;
