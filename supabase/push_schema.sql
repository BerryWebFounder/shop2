-- ================================================================
-- Web Push 구독 정보 테이블
-- ================================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id    UUID        REFERENCES members(id) ON DELETE CASCADE,
  endpoint     TEXT        NOT NULL,
  p256dh       TEXT        NOT NULL,   -- 암호화 공개키
  auth         TEXT        NOT NULL,   -- 인증 시크릿
  user_agent   TEXT,                   -- 브라우저 정보
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  -- 알림 수신 설정
  notify_order     BOOLEAN NOT NULL DEFAULT TRUE,  -- 주문 상태 알림
  notify_marketing BOOLEAN NOT NULL DEFAULT TRUE,  -- 마케팅 알림
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_member   ON push_subscriptions (member_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_push_active   ON push_subscriptions (is_active, notify_order);

-- updated_at 트리거
DROP TRIGGER IF EXISTS trg_push_updated_at ON push_subscriptions;
CREATE TRIGGER trg_push_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 푸시 발송 로그
CREATE TABLE IF NOT EXISTS push_logs (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID        REFERENCES push_subscriptions(id) ON DELETE SET NULL,
  member_id       UUID        REFERENCES members(id) ON DELETE SET NULL,
  type            TEXT        NOT NULL,   -- order, marketing, system
  title           TEXT        NOT NULL,
  body            TEXT        NOT NULL,
  success         BOOLEAN     NOT NULL DEFAULT FALSE,
  error_message   TEXT,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_logs_member ON push_logs (member_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_logs_type   ON push_logs (type, sent_at DESC);

-- RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_logs           ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_sub: member own"  ON push_subscriptions FOR ALL
  USING (auth.role() = 'authenticated' OR TRUE)
  WITH CHECK (TRUE);

CREATE POLICY "push_logs: admin all"  ON push_logs FOR ALL
  USING (auth.role() = 'authenticated');
CREATE POLICY "push_logs: insert"     ON push_logs FOR INSERT
  WITH CHECK (TRUE);

SELECT 'Push schema ready' AS status;
