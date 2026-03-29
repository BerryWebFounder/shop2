-- ================================================================
-- 05. Row Level Security (RLS) 정책
--
-- 전략:
--   - 모든 테이블에 RLS 활성화
--   - 관리자(Supabase Auth 로그인 사용자) → 전체 접근
--   - 미인증 → 완전 차단
--   - service_role 키 → RLS 우회 (Cron Job, 서버사이드 전용)
--
-- Supabase Auth 사용자 역할 확인:
--   auth.role() = 'authenticated'  → 로그인한 관리자
--   auth.role() = 'anon'           → 비로그인 (차단)
-- ================================================================

-- ── RLS 활성화 ─────────────────────────────────────────────────────
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE members        ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE products       ENABLE ROW LEVEL SECURITY;
ALTER TABLE events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE display_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items    ENABLE ROW LEVEL SECURITY;

-- ── 기존 정책 초기화 (재실행 안전) ────────────────────────────────
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'admin_settings','members','categories','products',
        'events','display_items','orders','order_items'
      )
  LOOP
    EXECUTE FORMAT('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END;
$$;

-- ================================================================
-- admin_settings — 인증된 관리자만 조회·수정
-- ================================================================
CREATE POLICY "admin_settings: authenticated read"
  ON admin_settings FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "admin_settings: authenticated write"
  ON admin_settings FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ================================================================
-- members — 인증된 관리자만 접근
-- 휴면/탈퇴 회원 PII는 뷰(member_safe_view)에서 마스킹 처리
-- ================================================================
CREATE POLICY "members: authenticated select"
  ON members FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "members: authenticated insert"
  ON members FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "members: authenticated update"
  ON members FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 탈퇴 처리는 허용하되 물리 삭제는 금지 (감사 로그 보존)
-- 삭제가 필요한 경우 DBA가 service_role로 직접 실행
CREATE POLICY "members: no delete"
  ON members FOR DELETE
  USING (FALSE);  -- 어떤 역할도 삭제 불가 (service_role은 RLS 우회)

-- ================================================================
-- categories — 인증된 관리자만 쓰기, 읽기는 모두 허용 (쇼핑몰 프론트용)
-- ================================================================
CREATE POLICY "categories: all read"
  ON categories FOR SELECT
  USING (TRUE);  -- 프론트엔드에서도 분류 목록 조회 가능

CREATE POLICY "categories: authenticated write"
  ON categories FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "categories: authenticated update"
  ON categories FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "categories: authenticated delete"
  ON categories FOR DELETE
  USING (auth.role() = 'authenticated');

-- ================================================================
-- products — 읽기는 판매중 상품만 공개, 쓰기는 관리자만
-- ================================================================
-- 공개 조회: 판매중(sale) + 품절(soldout) 상품만 (프론트엔드용)
CREATE POLICY "products: public select active"
  ON products FOR SELECT
  USING (
    auth.role() = 'authenticated'  -- 관리자: 전체 조회
    OR status IN ('sale', 'soldout') -- 비인증: 판매중·품절만
  );

CREATE POLICY "products: authenticated insert"
  ON products FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "products: authenticated update"
  ON products FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "products: authenticated delete"
  ON products FOR DELETE
  USING (auth.role() = 'authenticated');

-- ================================================================
-- events — 진행중/예정 이벤트는 공개, 쓰기는 관리자만
-- ================================================================
CREATE POLICY "events: public select"
  ON events FOR SELECT
  USING (
    auth.role() = 'authenticated'
    OR status IN ('active', 'scheduled')
  );

CREATE POLICY "events: authenticated write"
  ON events FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ================================================================
-- display_items — 활성 전시만 공개, 쓰기는 관리자만
-- ================================================================
CREATE POLICY "display_items: public select active"
  ON display_items FOR SELECT
  USING (
    auth.role() = 'authenticated'
    OR is_active = TRUE
  );

CREATE POLICY "display_items: authenticated write"
  ON display_items FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ================================================================
-- orders — 본인 주문만 공개, 관리자는 전체
-- (현재는 관리자 전용이므로 authenticated만 허용)
-- ================================================================
CREATE POLICY "orders: authenticated all"
  ON orders FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ================================================================
-- order_items — orders와 동일 정책
-- ================================================================
CREATE POLICY "order_items: authenticated all"
  ON order_items FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ================================================================
-- 뷰에 대한 RLS 적용 확인
-- 뷰는 기본적으로 기반 테이블의 RLS를 상속
-- SECURITY DEFINER 뷰는 별도 정책 불필요
-- ================================================================

-- member_safe_view: 기반 테이블(members)의 RLS 상속
-- → authenticated만 조회 가능 (members 정책과 동일)
COMMENT ON VIEW member_safe_view IS
  'RLS: members 테이블 정책 상속. authenticated 역할만 조회 가능.';

SELECT 'RLS policies ready' AS status;
