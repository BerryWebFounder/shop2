# 쇼핑몰 프로젝트 셋업 가이드

## 1. 초기 설치

```bash
# 의존성 설치
npm install

# 환경변수 설정
cp .env.local.example .env.local
# → .env.local 파일을 열어 실제 값 입력
```

## 2. Supabase SQL 실행 순서

Supabase 대시보드 → SQL Editor에서 순서대로 실행:

```
supabase/00_extensions.sql        # UUID, pg_cron 확장
supabase/01_tables.sql            # 핵심 테이블 (members, products, orders 등)
supabase/02_views.sql             # 뷰
supabase/03_functions.sql         # 비즈니스 함수
supabase/04_triggers.sql          # 트리거
supabase/05_rls.sql               # Row Level Security
supabase/06_seed.sql              # 초기 데이터 (관리자 설정 등)
supabase/07_storage.sql           # Storage 버킷
supabase/08_realtime.sql          # Realtime 활성화
supabase/set_updated_at_function.sql   # 공통 함수 (없으면 추가)
supabase/product_images_table.sql
supabase/reviews_schema.sql
supabase/order_management_schema.sql
supabase/coupon_point_schema.sql
supabase/payment_schema.sql
supabase/cs_schema.sql
supabase/member_grade_schema.sql
supabase/product_advanced_schema.sql
supabase/push_schema.sql
supabase/display_schema.sql
supabase/analytics_functions.sql
supabase/dashboard_functions.sql
```

## 3. VAPID 키 생성 (웹 푸시)

```bash
node -e "const wp=require('web-push'); const k=wp.generateVAPIDKeys(); console.log(JSON.stringify(k,null,2))"
```

## 4. 로컬 개발 서버

```bash
npm run dev
# → http://localhost:3000
# → 관리자: http://localhost:3000/admin (Supabase 계정으로 로그인)
# → 쇼핑몰: http://localhost:3000/shop
```

## 5. Vercel 배포

```bash
# Vercel CLI
npx vercel

# 환경변수를 Vercel 대시보드에서도 입력:
# Settings → Environment Variables
```

### Vercel 환경변수 목록
| 변수 | 설명 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key (🔒 노출 금지) |
| `NEXT_PUBLIC_SITE_URL` | 배포 도메인 (https://...) |
| `NEXT_PUBLIC_SITE_NAME` | 쇼핑몰 이름 |
| `CRON_SECRET` | Cron 인증 토큰 |
| `NEXT_PUBLIC_TOSS_CLIENT_KEY` | 토스페이먼츠 클라이언트 키 |
| `TOSS_SECRET_KEY` | 토스페이먼츠 시크릿 키 (🔒) |
| `TOSS_WEBHOOK_SECRET` | 토스 웹훅 시크릿 (🔒) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | VAPID 공개키 |
| `VAPID_PRIVATE_KEY` | VAPID 비공개키 (🔒) |
| `VAPID_SUBJECT` | VAPID 발신자 이메일 |

## 6. 배포 후 설정

### 토스페이먼츠 웹훅 등록
https://developers.tosspayments.com → 내 앱 → 웹훅
- URL: `https://your-domain.vercel.app/api/payment/webhook`
- 이벤트: `VIRTUAL_ACCOUNT_COMPONENTS_CHANGED`, `PAYMENT_STATUS_CHANGED`

### Supabase Realtime 확인
- Database → Replication → `orders`, `inquiries` 테이블 enabled 확인

### PWA 아이콘 생성
- https://www.pwabuilder.com/imageGenerator
- 생성된 아이콘을 `public/icons/` 폴더에 배치

## 7. 관리자 계정

초기 관리자 로그인:
- ID: `admin@your-shop.com` (Supabase Auth에서 직접 생성)
- 또는 Supabase → Authentication → Add User

---

## 주요 URL

| 경로 | 설명 |
|------|------|
| `/` | 루트 (쇼핑몰로 리다이렉트) |
| `/login` | 관리자 로그인 |
| `/admin/dashboard` | 관리자 대시보드 |
| `/shop` | 쇼핑몰 홈 |
| `/shop/products` | 상품 목록 |
| `/shop/cart` | 장바구니 |
| `/shop/checkout` | 주문/결제 |
| `/shop/support` | 고객센터 |
