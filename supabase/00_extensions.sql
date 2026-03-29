-- ================================================================
-- 00. 확장 & 초기 설정
-- Supabase SQL Editor에서 순서대로 실행하세요 (00 → 07)
-- ================================================================

-- UUID 생성
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 암호화 (pgcrypto) — 민감 컬럼 암호화에 사용
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- pg_cron — Supabase Pro 플랜 이상에서 사용 가능
-- CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- 타임존 기본값 설정 (한국 표준시)
-- Supabase 프로젝트 설정에서 Asia/Seoul로 맞추는 것을 권장합니다.
-- 아래 함수들은 UTC 기준으로 저장하고 애플리케이션에서 변환합니다.

SELECT 'Extensions ready' AS status;
