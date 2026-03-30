-- ================================================================
-- 05_rls_storage_realtime.sql
-- RLS 정책 / Storage 버킷 / Realtime 설정 / 초기 데이터
-- ================================================================

-- ================================================================
-- A. RLS 활성화 & 기존 정책 초기화
-- ================================================================

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'admin_settings','members','categories','products','events','display_items',
    'orders','order_items','order_status_history','order_shipments','payments',
    'coupons','coupon_usages','member_points','member_grade_config','member_grade_history',
    'inquiries','inquiry_replies','faqs','product_reviews','review_helpful_votes',
    'product_images','product_option_groups','product_option_values','product_skus',
    'product_tags','product_tag_map','product_related',
    'display_slides','display_banners','display_popups','display_promo_bars',
    'push_subscriptions','push_logs',
    'seller_applications','seller_stores','seller_notifications','settlements','settlement_items'
  ] LOOP
    EXECUTE format('ALTER TABLE IF EXISTS %I ENABLE ROW LEVEL SECURITY;', tbl);
  END LOOP;
END $$;

-- 기존 정책 초기화 (재실행 안전)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' LOOP
    EXECUTE FORMAT('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ================================================================
-- B. 관리자 전용 테이블 (authenticated = 관리자)
-- ================================================================

-- admin_settings / members / order_status_history / order_shipments / payments
-- member_grade_history / push_logs
DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'admin_settings','order_status_history','payments','push_logs'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY "admin_all" ON %I FOR ALL USING (auth.role() = ''authenticated'') WITH CHECK (auth.role() = ''authenticated'');',
      tbl);
  END LOOP;
END $$;

-- members: 삭제 금지
CREATE POLICY "members: admin select"  ON members FOR SELECT  USING (auth.role() = 'authenticated');
CREATE POLICY "members: admin insert"  ON members FOR INSERT  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "members: admin update"  ON members FOR UPDATE  USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "members: no delete"     ON members FOR DELETE  USING (FALSE);

CREATE POLICY "grade_config: public read"  ON member_grade_config  FOR SELECT USING (TRUE);
CREATE POLICY "grade_config: admin write"  ON member_grade_config  FOR ALL    USING (auth.role() = 'authenticated');
CREATE POLICY "grade_history: admin all"   ON member_grade_history FOR ALL    USING (auth.role() = 'authenticated');
CREATE POLICY "grade_history: insert"      ON member_grade_history FOR INSERT WITH CHECK (TRUE);

-- ================================================================
-- C. 상품 & 카테고리 (공개 읽기)
-- ================================================================

CREATE POLICY "categories: all read"       ON categories FOR SELECT USING (TRUE);
CREATE POLICY "categories: admin write"    ON categories FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "categories: admin update"   ON categories FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "categories: admin delete"   ON categories FOR DELETE USING (auth.role() = 'authenticated');

-- products: 공개(sale/soldout), 관리자 전체, V2 판매자 자신의 상품
CREATE POLICY "products: public select"    ON products FOR SELECT
  USING (auth.role() = 'authenticated' OR status IN ('sale','soldout','active','sold_out'));
CREATE POLICY "products: admin insert"     ON products FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "products: seller insert"    ON products FOR INSERT
  WITH CHECK (store_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM seller_stores WHERE id = store_id AND owner_id = auth.uid()));
CREATE POLICY "products: admin update"     ON products FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "products: seller update"    ON products FOR UPDATE
  USING (store_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM seller_stores WHERE id = store_id AND owner_id = auth.uid()));
CREATE POLICY "products: admin delete"     ON products FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "products: seller delete"    ON products FOR DELETE
  USING (store_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM seller_stores WHERE id = store_id AND owner_id = auth.uid()));

CREATE POLICY "product_images: public read"   ON product_images FOR SELECT USING (TRUE);
CREATE POLICY "product_images: admin write"   ON product_images FOR ALL
  USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ================================================================
-- D. 전시 관리 (공개 읽기)
-- ================================================================

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['events','display_items','display_slides','display_banners','display_popups','display_promo_bars'] LOOP
    EXECUTE format(
      'CREATE POLICY "public_read"  ON %I FOR SELECT USING (TRUE);
       CREATE POLICY "admin_write"  ON %I FOR ALL USING (auth.role() = ''authenticated'') WITH CHECK (auth.role() = ''authenticated'');',
      tbl, tbl);
  END LOOP;
END $$;

-- ================================================================
-- E. 주문 & 결제
-- ================================================================

-- orders: 고객 본인 + 관리자 + 판매자 (자신의 아이템이 있는 주문)
CREATE POLICY "orders: customer select"  ON orders FOR SELECT USING (auth.uid() = customer_id OR auth.uid() = member_id OR auth.role() = 'authenticated');
CREATE POLICY "orders: customer insert"  ON orders FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "orders: admin all"        ON orders FOR ALL USING (auth.role() = 'authenticated');

-- order_items: 고객 본인 + 판매자 본인 + 관리자
CREATE POLICY "items: customer select"   ON order_items FOR SELECT
  USING (auth.role() = 'authenticated'
    OR EXISTS (SELECT 1 FROM orders WHERE id = order_id AND (customer_id = auth.uid() OR member_id = auth.uid()))
    OR EXISTS (SELECT 1 FROM seller_stores WHERE id = store_id AND owner_id = auth.uid()));
CREATE POLICY "items: seller update"     ON order_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM seller_stores WHERE id = store_id AND owner_id = auth.uid()));
CREATE POLICY "items: insert"            ON order_items FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "shipments: admin all"     ON order_shipments FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "shipments: public read"   ON order_shipments FOR SELECT USING (TRUE);

-- 쿠폰
CREATE POLICY "coupons: public select"   ON coupons FOR SELECT USING (is_active = TRUE OR auth.role() = 'authenticated');
CREATE POLICY "coupons: admin all"       ON coupons FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "coupon_usages: insert"    ON coupon_usages FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "coupon_usages: select"    ON coupon_usages FOR SELECT USING (auth.role() = 'authenticated');

-- 포인트
CREATE POLICY "points: select"           ON member_points FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "points: insert"           ON member_points FOR INSERT WITH CHECK (TRUE);

-- ================================================================
-- F. 고객센터 & 리뷰
-- ================================================================

CREATE POLICY "inquiries: insert"        ON inquiries FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "inquiries: select"        ON inquiries FOR SELECT USING (auth.role() = 'authenticated' OR TRUE);
CREATE POLICY "inquiries: admin all"     ON inquiries FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "replies: select"          ON inquiry_replies FOR SELECT USING (TRUE);
CREATE POLICY "replies: insert"          ON inquiry_replies FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "replies: admin"           ON inquiry_replies FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "faqs: public select"      ON faqs FOR SELECT USING (is_active = TRUE OR auth.role() = 'authenticated');
CREATE POLICY "faqs: admin all"          ON faqs FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "reviews: public select"   ON product_reviews FOR SELECT USING (status = 'approved' OR auth.role() = 'authenticated');
CREATE POLICY "reviews: insert"          ON product_reviews FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "reviews: admin all"       ON product_reviews FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "helpful_votes: insert"    ON review_helpful_votes FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "helpful_votes: select"    ON review_helpful_votes FOR SELECT USING (TRUE);

-- ================================================================
-- G. V2 소호몰
-- ================================================================

-- seller_applications
CREATE POLICY "apply: own select"        ON seller_applications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "apply: own insert"        ON seller_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id AND NOT EXISTS (
    SELECT 1 FROM seller_applications WHERE user_id = auth.uid() AND status = 'pending'));
CREATE POLICY "apply: admin all"         ON seller_applications FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- seller_stores
CREATE POLICY "stores: owner all"        ON seller_stores FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "stores: public select"    ON seller_stores FOR SELECT USING (status = 'active');
CREATE POLICY "stores: admin all"        ON seller_stores FOR ALL USING (auth.role() = 'authenticated');

-- seller_notifications
CREATE POLICY "notif: own select"        ON seller_notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notif: own update"        ON seller_notifications FOR UPDATE USING (auth.uid() = user_id);

-- settlements
CREATE POLICY "settle: owner select"     ON settlements FOR SELECT
  USING (EXISTS (SELECT 1 FROM seller_stores WHERE id = store_id AND owner_id = auth.uid()));
CREATE POLICY "settle: admin all"        ON settlements FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "settle_items: admin all"  ON settlement_items FOR ALL USING (auth.role() = 'authenticated');

-- ================================================================
-- H. Storage 버킷 설정
-- ================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('product-images',        'product-images',        TRUE,  5242880,  ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('store-assets',          'store-assets',          TRUE,  5242880,  ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('inquiry-attachments',   'inquiry-attachments',   FALSE, 10485760, ARRAY['image/jpeg','image/png','image/webp','image/gif','application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public, file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- product-images
DROP POLICY IF EXISTS "product-images: public read"  ON storage.objects;
CREATE POLICY "product-images: public read"  ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
DROP POLICY IF EXISTS "product-images: auth write"   ON storage.objects;
CREATE POLICY "product-images: auth write"   ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');
DROP POLICY IF EXISTS "product-images: auth update"  ON storage.objects;
CREATE POLICY "product-images: auth update"  ON storage.objects FOR UPDATE USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');
DROP POLICY IF EXISTS "product-images: auth delete"  ON storage.objects;
CREATE POLICY "product-images: auth delete"  ON storage.objects FOR DELETE USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

-- store-assets
DROP POLICY IF EXISTS "store-assets: public read"    ON storage.objects;
CREATE POLICY "store-assets: public read"    ON storage.objects FOR SELECT USING (bucket_id = 'store-assets');
DROP POLICY IF EXISTS "store-assets: seller write"   ON storage.objects;
CREATE POLICY "store-assets: seller write"   ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'store-assets' AND auth.uid() IS NOT NULL);

-- inquiry-attachments
DROP POLICY IF EXISTS "inquiry-att: upload"  ON storage.objects;
CREATE POLICY "inquiry-att: upload"  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'inquiry-attachments');
DROP POLICY IF EXISTS "inquiry-att: read"    ON storage.objects;
CREATE POLICY "inquiry-att: read"    ON storage.objects FOR SELECT USING (bucket_id = 'inquiry-attachments' AND auth.role() = 'authenticated');

-- ================================================================
-- I. Supabase Realtime
-- ================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE members;
ALTER PUBLICATION supabase_realtime ADD TABLE inquiries;
ALTER TABLE orders   REPLICA IDENTITY FULL;
ALTER TABLE products REPLICA IDENTITY FULL;

-- ================================================================
-- J. 초기 데이터 (Seed)
-- ================================================================

-- 관리자 설정
INSERT INTO admin_settings (store_name, dormant_days, data_keep_years)
VALUES ('내 쇼핑몰', 365, 4) ON CONFLICT DO NOTHING;

-- 등급 기준
INSERT INTO member_grade_config (grade, label, min_annual_amount, point_rate, discount_rate, badge_color, description, sort_order)
VALUES
  ('bronze', 'Bronze', 0,       0.01, 0,    '#cd7f32', '기본 등급',        1),
  ('silver', 'Silver', 300000,  0.02, 0.01, '#c0c0c0', '연간 30만원 달성', 2),
  ('gold',   'Gold',   1000000, 0.03, 0.02, '#ffd700', '연간 100만원 달성',3),
  ('vip',    'VIP',    3000000, 0.05, 0.05, '#b44fde', '연간 300만원 달성',4)
ON CONFLICT (grade) DO UPDATE SET
  min_annual_amount = EXCLUDED.min_annual_amount, point_rate = EXCLUDED.point_rate,
  discount_rate = EXCLUDED.discount_rate, sort_order = EXCLUDED.sort_order;

-- 샘플 카테고리 (대분류)
INSERT INTO categories (id, parent_id, name, level, sort_order) VALUES
  ('10000000-0000-0000-0000-000000000001', NULL, '상의',          1, 1),
  ('10000000-0000-0000-0000-000000000002', NULL, '하의',          1, 2),
  ('10000000-0000-0000-0000-000000000003', NULL, '신발',          1, 3),
  ('10000000-0000-0000-0000-000000000004', NULL, '원피스/스커트', 1, 4),
  ('10000000-0000-0000-0000-000000000005', NULL, '아우터',        1, 5),
  ('10000000-0000-0000-0000-000000000006', NULL, '액세서리',      1, 6)
ON CONFLICT (id) DO NOTHING;

-- 중분류 (상의)
INSERT INTO categories (id, parent_id, name, level, sort_order) VALUES
  ('20000000-0000-0000-0000-000000000101', '10000000-0000-0000-0000-000000000001', '티셔츠',       2, 1),
  ('20000000-0000-0000-0000-000000000102', '10000000-0000-0000-0000-000000000001', '셔츠/블라우스',2, 2),
  ('20000000-0000-0000-0000-000000000103', '10000000-0000-0000-0000-000000000001', '후드/맨투맨',  2, 3),
  ('20000000-0000-0000-0000-000000000104', '10000000-0000-0000-0000-000000000001', '니트/스웨터',  2, 4)
ON CONFLICT (id) DO NOTHING;

-- 소분류 (티셔츠)
INSERT INTO categories (id, parent_id, name, level, sort_order) VALUES
  ('30000000-0000-0000-0000-000000010101', '20000000-0000-0000-0000-000000000101', '반팔티', 3, 1),
  ('30000000-0000-0000-0000-000000010102', '20000000-0000-0000-0000-000000000101', '긴팔티', 3, 2),
  ('30000000-0000-0000-0000-000000010103', '20000000-0000-0000-0000-000000000101', '민소매', 3, 3)
ON CONFLICT (id) DO NOTHING;

-- 샘플 이벤트
INSERT INTO events (id, name, start_date, end_date, status) VALUES
  ('e0000000-0000-0000-0000-000000000001', '봄 신상 페스티벌', CURRENT_DATE, CURRENT_DATE + 30, 'active')
ON CONFLICT (id) DO NOTHING;

SELECT 'RLS + Storage + Realtime + Seed ready' AS status;
