-- ============================================================
-- Shop V2 | Package 1: 판매자 가입 & 관리자 승인 시스템
-- ============================================================

-- 1. profiles 테이블에 role 컬럼 추가 (기존 테이블 확장)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'customer'
    CHECK (role IN ('customer', 'seller', 'admin')),
  ADD COLUMN IF NOT EXISTS seller_status TEXT DEFAULT NULL
    CHECK (seller_status IN ('pending', 'approved', 'rejected', 'suspended'));

-- 2. 판매자 신청 테이블
CREATE TABLE IF NOT EXISTS seller_applications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 신청 정보
  business_name   TEXT NOT NULL,
  business_type   TEXT NOT NULL CHECK (business_type IN ('individual', 'corporation')),
  business_number TEXT,                    -- 사업자등록번호 (법인)
  representative  TEXT NOT NULL,           -- 대표자명
  phone           TEXT NOT NULL,
  email           TEXT NOT NULL,
  address         TEXT NOT NULL,
  
  -- 소호몰 예정 정보
  store_name      TEXT NOT NULL,           -- 희망 상점명
  store_slug      TEXT NOT NULL,           -- 희망 URL slug
  store_category  TEXT NOT NULL,           -- 주요 판매 카테고리
  store_intro     TEXT,                    -- 상점 소개
  
  -- 첨부 서류 (Supabase Storage 경로)
  id_document_url  TEXT,                  -- 신분증
  biz_doc_url      TEXT,                  -- 사업자등록증
  
  -- 처리 상태
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note      TEXT,                    -- 관리자 메모 (승인/거절 사유)
  reviewed_by     UUID REFERENCES auth.users(id),
  reviewed_at     TIMESTAMPTZ,
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. 판매자 알림 테이블
CREATE TABLE IF NOT EXISTS seller_notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('application_approved', 'application_rejected', 'suspended', 'settlement_completed')),
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. 인덱스
CREATE INDEX IF NOT EXISTS idx_seller_applications_user    ON seller_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_seller_applications_status  ON seller_applications(status);
CREATE INDEX IF NOT EXISTS idx_seller_applications_slug    ON seller_applications(store_slug);
CREATE INDEX IF NOT EXISTS idx_seller_notifications_user   ON seller_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role               ON profiles(role);

-- 5. updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_seller_applications_updated_at ON seller_applications;
CREATE TRIGGER trg_seller_applications_updated_at
  BEFORE UPDATE ON seller_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 6. RLS 정책
ALTER TABLE seller_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_notifications ENABLE ROW LEVEL SECURITY;

-- seller_applications RLS
CREATE POLICY "본인 신청서 조회" ON seller_applications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "본인 신청서 등록" ON seller_applications
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    NOT EXISTS (
      SELECT 1 FROM seller_applications
      WHERE user_id = auth.uid() AND status = 'pending'
    )
  );

CREATE POLICY "관리자 전체 조회" ON seller_applications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "관리자 상태 업데이트" ON seller_applications
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- seller_notifications RLS
CREATE POLICY "본인 알림 조회" ON seller_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "본인 알림 읽음 처리" ON seller_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- 7. 판매자 승인 처리 함수 (원자적 트랜잭션)
CREATE OR REPLACE FUNCTION approve_seller_application(
  p_application_id UUID,
  p_admin_note     TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_app seller_applications;
  v_store_id UUID;
BEGIN
  -- 신청서 조회 & 잠금
  SELECT * INTO v_app
  FROM seller_applications
  WHERE id = p_application_id AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', '대기 중인 신청서를 찾을 수 없습니다');
  END IF;

  -- slug 중복 체크
  IF EXISTS (SELECT 1 FROM seller_stores WHERE slug = v_app.store_slug) THEN
    RETURN jsonb_build_object('success', false, 'error', '이미 사용 중인 URL입니다. 신청자에게 변경 요청하세요.');
  END IF;

  -- 1) 신청서 상태 업데이트
  UPDATE seller_applications
  SET status = 'approved', admin_note = p_admin_note,
      reviewed_by = auth.uid(), reviewed_at = NOW()
  WHERE id = p_application_id;

  -- 2) profiles role 변경
  UPDATE profiles
  SET role = 'seller', seller_status = 'approved'
  WHERE id = v_app.user_id;

  -- 3) seller_stores 레코드 생성
  INSERT INTO seller_stores (
    owner_id, store_name, slug, store_category, intro, status
  ) VALUES (
    v_app.user_id, v_app.store_name, v_app.store_slug,
    v_app.store_category, v_app.store_intro, 'active'
  ) RETURNING id INTO v_store_id;

  -- 4) 알림 발송
  INSERT INTO seller_notifications (user_id, type, title, message)
  VALUES (
    v_app.user_id,
    'application_approved',
    '소호몰 개설이 승인되었습니다!',
    format('"%s" 소호몰이 개설되었습니다. 지금 바로 상품을 등록해 보세요. URL: /stores/%s', v_app.store_name, v_app.store_slug)
  );

  RETURN jsonb_build_object('success', true, 'store_id', v_store_id, 'slug', v_app.store_slug);
END;
$$;

-- 8. 판매자 거절 처리 함수
CREATE OR REPLACE FUNCTION reject_seller_application(
  p_application_id UUID,
  p_admin_note     TEXT
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_app seller_applications;
BEGIN
  SELECT * INTO v_app
  FROM seller_applications
  WHERE id = p_application_id AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', '대기 중인 신청서를 찾을 수 없습니다');
  END IF;

  UPDATE seller_applications
  SET status = 'rejected', admin_note = p_admin_note,
      reviewed_by = auth.uid(), reviewed_at = NOW()
  WHERE id = p_application_id;

  UPDATE profiles
  SET seller_status = 'rejected'
  WHERE id = v_app.user_id;

  INSERT INTO seller_notifications (user_id, type, title, message)
  VALUES (
    v_app.user_id,
    'application_rejected',
    '소호몰 신청이 검토되었습니다',
    format('안타깝게도 이번 신청은 승인되지 않았습니다. 사유: %s', COALESCE(p_admin_note, '기재되지 않음'))
  );

  RETURN jsonb_build_object('success', true);
END;
$$;
