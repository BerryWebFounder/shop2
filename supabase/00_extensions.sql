-- ================================================================
-- 00_extensions.sql
-- 확장 & 초기 설정
--
-- ▶ 실행 순서: 00 → 01 → 02 → 03 → 04 → 05
-- ================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";   -- UUID 생성
CREATE EXTENSION IF NOT EXISTS "pgcrypto";    -- 암호화 (PII 보호)
-- CREATE EXTENSION IF NOT EXISTS "pg_cron";  -- Pro 플랜 이상에서만 사용 가능

SELECT 'Extensions ready' AS status;
