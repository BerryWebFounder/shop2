-- ================================================================
-- 전시 관리 스키마
-- - 메인 슬라이더 (히어로 배너)
-- - 이시 배너 (그리드 배너)
-- - 팝업
-- - 프로모 바 (상단 고정 문구)
-- ================================================================

-- ── 공통 전시 아이템 구조 ─────────────────────────────────────────
-- 모든 전시 유형은 아래 공통 필드를 공유합니다.

-- ── 슬라이더 슬라이드 ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS display_slides (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 콘텐츠
  title         TEXT,                   -- 헤드라인
  subtitle      TEXT,                   -- 서브 텍스트
  description   TEXT,                   -- 설명 텍스트
  image_url     TEXT        NOT NULL,   -- 배경 이미지
  image_mobile  TEXT,                   -- 모바일 전용 이미지
  overlay_color TEXT        NOT NULL DEFAULT 'rgba(0,0,0,0.35)',

  -- CTA 버튼
  cta_text      TEXT,                   -- 버튼 텍스트
  cta_url       TEXT,                   -- 버튼 링크
  cta_style     TEXT        NOT NULL DEFAULT 'light',  -- light | dark | outline

  -- 텍스트 정렬
  text_align    TEXT        NOT NULL DEFAULT 'center', -- left | center | right
  text_color    TEXT        NOT NULL DEFAULT '#ffffff',

  -- 기간 설정
  starts_at     TIMESTAMPTZ,
  ends_at       TIMESTAMPTZ,

  -- 관리
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order    INT         NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_slides_active ON display_slides (is_active, sort_order, starts_at, ends_at);

-- ── 이시 배너 (그리드/로우 배너) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS display_banners (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  zone          TEXT        NOT NULL DEFAULT 'main', -- 배너 영역 구분 (main, category, etc.)
  position      TEXT        NOT NULL DEFAULT 'full', -- full | half | third | quarter

  -- 콘텐츠
  title         TEXT,
  subtitle      TEXT,
  image_url     TEXT        NOT NULL,
  image_mobile  TEXT,
  link_url      TEXT,
  badge_text    TEXT,                   -- 뱃지 (NEW, HOT, SALE 등)
  badge_color   TEXT        NOT NULL DEFAULT '#c4503a',
  overlay_color TEXT        NOT NULL DEFAULT 'rgba(0,0,0,0)',

  -- 텍스트
  text_position TEXT        NOT NULL DEFAULT 'bottom-left', -- top-left | center | bottom-left | bottom-right
  text_color    TEXT        NOT NULL DEFAULT '#ffffff',

  -- 기간 설정
  starts_at     TIMESTAMPTZ,
  ends_at       TIMESTAMPTZ,

  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order    INT         NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_banners_zone ON display_banners (zone, is_active, sort_order);

-- ── 팝업 ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS display_popups (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 콘텐츠
  title         TEXT,
  body          TEXT,                   -- HTML 또는 일반 텍스트
  image_url     TEXT,
  link_url      TEXT,
  link_text     TEXT        NOT NULL DEFAULT '자세히 보기',

  -- 팝업 설정
  width         INT         NOT NULL DEFAULT 480,    -- px
  position      TEXT        NOT NULL DEFAULT 'center', -- center | bottom-left | bottom-right
  show_close    BOOLEAN     NOT NULL DEFAULT TRUE,
  close_text    TEXT        NOT NULL DEFAULT '닫기',
  dismiss_days  INT         NOT NULL DEFAULT 1,       -- "오늘 하루 안 보기" 쿠키 일수 (0 = 비활성)
  dismiss_text  TEXT        NOT NULL DEFAULT '오늘 하루 안 보기',

  -- 기간 설정
  starts_at     TIMESTAMPTZ,
  ends_at       TIMESTAMPTZ,

  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order    INT         NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_popups_active ON display_popups (is_active, starts_at, ends_at);

-- ── 프로모 바 (상단 고정 공지 바) ────────────────────────────────
CREATE TABLE IF NOT EXISTS display_promo_bars (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 콘텐츠
  message       TEXT        NOT NULL,  -- 표시 문구 (HTML 가능)
  link_url      TEXT,
  link_text     TEXT,

  -- 스타일
  bg_color      TEXT        NOT NULL DEFAULT '#1A1A18',
  text_color    TEXT        NOT NULL DEFAULT '#FAFAF8',
  show_close    BOOLEAN     NOT NULL DEFAULT TRUE,

  -- 기간 설정
  starts_at     TIMESTAMPTZ,
  ends_at       TIMESTAMPTZ,

  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order    INT         NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── updated_at 트리거 ─────────────────────────────────────────────
DO $$ 
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['display_slides','display_banners','display_popups','display_promo_bars']
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_%s_updated_at ON %s;
      CREATE TRIGGER trg_%s_updated_at
        BEFORE UPDATE ON %s
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    ', tbl, tbl, tbl, tbl);
  END LOOP;
END $$;

-- ── 기간 내 활성 아이템 조회 함수 ────────────────────────────────
CREATE OR REPLACE FUNCTION display_active_items(p_table TEXT)
RETURNS TABLE (
  id            UUID,
  is_active     BOOLEAN,
  computed_active BOOLEAN
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  -- 동적 테이블은 직접 쿼리로 처리 (각 테이블별 API에서 조건 적용)
  SELECT id, is_active,
    is_active
    AND (starts_at IS NULL OR starts_at <= NOW())
    AND (ends_at   IS NULL OR ends_at   >= NOW())
  FROM display_slides WHERE p_table = 'display_slides'
  UNION ALL
  SELECT id, is_active,
    is_active
    AND (starts_at IS NULL OR starts_at <= NOW())
    AND (ends_at   IS NULL OR ends_at   >= NOW())
  FROM display_banners WHERE p_table = 'display_banners';
$$;

-- ── RLS ──────────────────────────────────────────────────────────
ALTER TABLE display_slides     ENABLE ROW LEVEL SECURITY;
ALTER TABLE display_banners    ENABLE ROW LEVEL SECURITY;
ALTER TABLE display_popups     ENABLE ROW LEVEL SECURITY;
ALTER TABLE display_promo_bars ENABLE ROW LEVEL SECURITY;

-- 공개 읽기 (쇼핑몰)
CREATE POLICY "slides: public read"    ON display_slides     FOR SELECT USING (TRUE);
CREATE POLICY "banners: public read"   ON display_banners    FOR SELECT USING (TRUE);
CREATE POLICY "popups: public read"    ON display_popups     FOR SELECT USING (TRUE);
CREATE POLICY "promos: public read"    ON display_promo_bars FOR SELECT USING (TRUE);

-- 관리자 쓰기
CREATE POLICY "slides: admin all"    ON display_slides     FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "banners: admin all"   ON display_banners    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "popups: admin all"    ON display_popups     FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "promos: admin all"    ON display_promo_bars FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

SELECT 'Display schema ready' AS status;
