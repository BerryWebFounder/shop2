-- ================================================================
-- 회원 등급 시스템 스키마
-- Bronze → Silver → Gold → VIP (연간 누적 구매금액 기준)
-- ================================================================

-- ── members 테이블에 등급 관련 컬럼 추가 ─────────────────────────
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS grade           TEXT    NOT NULL DEFAULT 'bronze'
                           CHECK (grade IN ('bronze','silver','gold','vip')),
  ADD COLUMN IF NOT EXISTS grade_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS total_purchase  BIGINT  NOT NULL DEFAULT 0,  -- 전체 누적 구매액
  ADD COLUMN IF NOT EXISTS annual_purchase BIGINT  NOT NULL DEFAULT 0,  -- 연간 누적 구매액 (등급 산정 기준)
  ADD COLUMN IF NOT EXISTS order_count     INT     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes           TEXT;                         -- 관리자 메모

-- ── 등급 기준 테이블 ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS member_grade_config (
  grade            TEXT    PRIMARY KEY,
  label            TEXT    NOT NULL,       -- 표시 이름
  min_annual_amount BIGINT NOT NULL,       -- 최소 연간 구매금액
  point_rate       NUMERIC NOT NULL DEFAULT 0.01,  -- 포인트 적립률
  discount_rate    NUMERIC NOT NULL DEFAULT 0,     -- 추가 할인율
  badge_color      TEXT    NOT NULL DEFAULT '#cd7f32',
  description      TEXT,
  sort_order       INT     NOT NULL DEFAULT 0
);

-- 기본 등급 설정 삽입
INSERT INTO member_grade_config (grade, label, min_annual_amount, point_rate, discount_rate, badge_color, description, sort_order)
VALUES
  ('bronze', 'Bronze', 0,         0.01, 0,    '#cd7f32', '기본 등급. 연간 구매 금액 기준으로 자동 업그레이드됩니다.',       1),
  ('silver', 'Silver', 300000,    0.02, 0.01, '#c0c0c0', '연간 30만원 이상 구매 시 달성. 포인트 2배 적립.',           2),
  ('gold',   'Gold',   1000000,   0.03, 0.02, '#ffd700', '연간 100만원 이상 구매 시 달성. 포인트 3배 + 2% 추가 할인.', 3),
  ('vip',    'VIP',    3000000,   0.05, 0.05, '#b44fde', '연간 300만원 이상 구매 시 달성. 포인트 5배 + 5% 추가 할인.', 4)
ON CONFLICT (grade) DO UPDATE SET
  min_annual_amount = EXCLUDED.min_annual_amount,
  point_rate        = EXCLUDED.point_rate,
  discount_rate     = EXCLUDED.discount_rate,
  sort_order        = EXCLUDED.sort_order;

-- ── 등급 변경 이력 테이블 ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS member_grade_history (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id    UUID        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  from_grade   TEXT,
  to_grade     TEXT        NOT NULL,
  reason       TEXT        NOT NULL DEFAULT 'auto',  -- auto / admin / event
  annual_amount BIGINT,                              -- 변경 시점 연간 구매액
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_grade_history_member ON member_grade_history (member_id, created_at DESC);

-- ── 회원 통계 뷰 (등급 포함) ─────────────────────────────────────
DROP VIEW IF EXISTS member_stats_view CASCADE;
CREATE VIEW member_stats_view AS
SELECT
  m.id,
  m.name,
  m.email,
  m.phone,
  m.status,
  m.grade,
  m.total_purchase,
  m.annual_purchase,
  m.order_count,
  m.join_date,
  m.last_login,
  m.notes,
  gc.label        AS grade_label,
  gc.badge_color  AS grade_color,
  gc.point_rate,
  gc.discount_rate,
  -- 다음 등급까지 필요 금액
  CASE
    WHEN m.grade = 'bronze' THEN (SELECT min_annual_amount FROM member_grade_config WHERE grade = 'silver')
    WHEN m.grade = 'silver' THEN (SELECT min_annual_amount FROM member_grade_config WHERE grade = 'gold')
    WHEN m.grade = 'gold'   THEN (SELECT min_annual_amount FROM member_grade_config WHERE grade = 'vip')
    ELSE NULL
  END AS next_grade_amount,
  -- 포인트 잔액 (member_point_balance 뷰가 있으면 JOIN, 없으면 0)
  COALESCE(pb.balance, 0)::INT AS point_balance
FROM members m
JOIN member_grade_config gc ON gc.grade = m.grade
LEFT JOIN member_point_balance pb ON pb.member_id = m.id;

-- ── 등급 자동 업데이트 함수 ───────────────────────────────────────
CREATE OR REPLACE FUNCTION update_member_grade(p_member_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_member     RECORD;
  v_new_grade  TEXT;
  v_old_grade  TEXT;
  v_annual     BIGINT;
BEGIN
  -- 현재 연도 구매금액 집계
  SELECT
    m.grade,
    COALESCE(SUM(o.total_amount) FILTER (
      WHERE EXTRACT(YEAR FROM o.created_at) = EXTRACT(YEAR FROM NOW())
        AND o.status NOT IN ('cancelled', 'returned')
    ), 0)::BIGINT AS annual
  INTO v_member
  FROM members m
  LEFT JOIN orders o ON o.member_id = m.id
  WHERE m.id = p_member_id
  GROUP BY m.grade;

  IF NOT FOUND THEN RETURN NULL; END IF;

  v_old_grade := v_member.grade;
  v_annual    := v_member.annual;

  -- 등급 결정 (연간 구매금액 기준)
  SELECT grade INTO v_new_grade
  FROM member_grade_config
  WHERE min_annual_amount <= v_annual
  ORDER BY min_annual_amount DESC
  LIMIT 1;

  IF v_new_grade IS NULL THEN v_new_grade := 'bronze'; END IF;

  -- 등급 변경이 있을 때만 업데이트
  IF v_new_grade <> v_old_grade THEN
    UPDATE members
    SET grade = v_new_grade, annual_purchase = v_annual, grade_updated_at = NOW()
    WHERE id = p_member_id;

    INSERT INTO member_grade_history (member_id, from_grade, to_grade, reason, annual_amount)
    VALUES (p_member_id, v_old_grade, v_new_grade, 'auto', v_annual);
  ELSE
    UPDATE members SET annual_purchase = v_annual WHERE id = p_member_id;
  END IF;

  RETURN v_new_grade;
END;
$$;

-- ── 전체 회원 등급 일괄 업데이트 함수 (Cron 용) ──────────────────
CREATE OR REPLACE FUNCTION update_all_member_grades()
RETURNS TABLE (member_id UUID, old_grade TEXT, new_grade TEXT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM members WHERE status = 'active' LOOP
    PERFORM update_member_grade(r.id);
  END LOOP;
  RETURN QUERY
    SELECT h.member_id, h.from_grade, h.to_grade
    FROM member_grade_history h
    WHERE h.created_at >= NOW() - INTERVAL '5 minutes' AND h.reason = 'auto';
END;
$$;

-- ── 주문 완료 시 회원 통계 자동 업데이트 트리거 ──────────────────
CREATE OR REPLACE FUNCTION trg_update_member_stats_on_order()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- 주문 완료(paid) 또는 취소/반품 시 통계 재계산
  IF (NEW.status IN ('paid', 'delivered') AND OLD.status NOT IN ('paid', 'delivered'))
     OR (NEW.status IN ('cancelled', 'returned') AND OLD.status NOT IN ('cancelled', 'returned'))
  THEN
    IF NEW.member_id IS NOT NULL THEN
      UPDATE members SET
        total_purchase = (
          SELECT COALESCE(SUM(total_amount), 0) FROM orders
          WHERE member_id = NEW.member_id AND status NOT IN ('cancelled', 'returned')
        ),
        order_count = (
          SELECT COUNT(*) FROM orders
          WHERE member_id = NEW.member_id AND status NOT IN ('cancelled', 'pending')
        )
      WHERE id = NEW.member_id;

      PERFORM update_member_grade(NEW.member_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_member_stats_update ON orders;
CREATE TRIGGER trg_member_stats_update
  AFTER UPDATE OF status ON orders
  FOR EACH ROW EXECUTE FUNCTION trg_update_member_stats_on_order();

-- ── RLS ──────────────────────────────────────────────────────────
ALTER TABLE member_grade_config  ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_grade_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "grade_config: public read"  ON member_grade_config  FOR SELECT USING (TRUE);
CREATE POLICY "grade_config: admin write"  ON member_grade_config  FOR ALL    USING (auth.role() = 'authenticated');
CREATE POLICY "grade_history: admin all"   ON member_grade_history FOR ALL    USING (auth.role() = 'authenticated');
CREATE POLICY "grade_history: insert"      ON member_grade_history FOR INSERT WITH CHECK (TRUE);

SELECT 'Member grade schema ready' AS status;
