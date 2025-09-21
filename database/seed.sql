-- Fingrow Database Seed Data
-- This file contains initial data for development and testing

-- Insert sample categories
INSERT INTO categories (id, name, name_th, slug, icon, sort_order) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Electronics', 'อิเล็กทรอนิกส์', 'electronics', 'phone-portrait-outline', 1),
  ('550e8400-e29b-41d4-a716-446655440002', 'Furniture', 'เฟอร์นิเจอร์', 'furniture', 'bed-outline', 2),
  ('550e8400-e29b-41d4-a716-446655440003', 'Fashion', 'แฟชั่น', 'fashion', 'shirt-outline', 3),
  ('550e8400-e29b-41d4-a716-446655440004', 'Books', 'หนังสือ', 'books', 'library-outline', 4),
  ('550e8400-e29b-41d4-a716-446655440005', 'Sports', 'กีฬา', 'sports', 'basketball-outline', 5),
  ('550e8400-e29b-41d4-a716-446655440006', 'Home & Garden', 'บ้านและสวน', 'home-garden', 'home-outline', 6),
  ('550e8400-e29b-41d4-a716-446655440007', 'Toys & Games', 'ของเล่นและเกม', 'toys-games', 'game-controller-outline', 7),
  ('550e8400-e29b-41d4-a716-446655440008', 'Automotive', 'ยานยนต์', 'automotive', 'car-outline', 8);

-- Insert subcategories for Electronics
INSERT INTO categories (id, name, name_th, slug, parent_id, icon, sort_order) VALUES
  ('550e8400-e29b-41d4-a716-446655441001', 'Smartphones', 'สมาร์ทโฟน', 'smartphones', '550e8400-e29b-41d4-a716-446655440001', 'phone-portrait-outline', 1),
  ('550e8400-e29b-41d4-a716-446655441002', 'Laptops', 'แล็ปท็อป', 'laptops', '550e8400-e29b-41d4-a716-446655440001', 'laptop-outline', 2),
  ('550e8400-e29b-41d4-a716-446655441003', 'Tablets', 'แท็บเล็ต', 'tablets', '550e8400-e29b-41d4-a716-446655440001', 'tablet-portrait-outline', 3),
  ('550e8400-e29b-41d4-a716-446655441004', 'Cameras', 'กล้อง', 'cameras', '550e8400-e29b-41d4-a716-446655440001', 'camera-outline', 4),
  ('550e8400-e29b-41d4-a716-446655441005', 'Audio', 'เครื่องเสียง', 'audio', '550e8400-e29b-41d4-a716-446655440001', 'headset-outline', 5),
  ('550e8400-e29b-41d4-a716-446655441006', 'Gaming', 'เกมมิ่ง', 'gaming', '550e8400-e29b-41d4-a716-446655440001', 'game-controller-outline', 6);

-- Insert subcategories for Furniture
INSERT INTO categories (id, name, name_th, slug, parent_id, icon, sort_order) VALUES
  ('550e8400-e29b-41d4-a716-446655442001', 'Living Room', 'ห้องนั่งเล่น', 'living-room', '550e8400-e29b-41d4-a716-446655440002', 'tv-outline', 1),
  ('550e8400-e29b-41d4-a716-446655442002', 'Bedroom', 'ห้องนอน', 'bedroom', '550e8400-e29b-41d4-a716-446655440002', 'bed-outline', 2),
  ('550e8400-e29b-41d4-a716-446655442003', 'Office', 'สำนักงาน', 'office', '550e8400-e29b-41d4-a716-446655440002', 'briefcase-outline', 3),
  ('550e8400-e29b-41d4-a716-446655442004', 'Kitchen', 'ครัว', 'kitchen', '550e8400-e29b-41d4-a716-446655440002', 'restaurant-outline', 4);

-- Insert sample users with referral system
INSERT INTO users (id, username, email, full_name, referral_code, world_id, is_verified, trust_score, referrer_id) VALUES
  ('550e8400-e29b-41d4-a716-446655550001', 'alice_smith', 'alice@example.com', 'Alice Smith', 'ALICE2025', 'alice_world_id_001', true, 4.85, NULL),
  ('550e8400-e29b-41d4-a716-446655550002', 'bob_jones', 'bob@example.com', 'Bob Jones', 'BOB2025', 'bob_world_id_002', true, 4.72, '550e8400-e29b-41d4-a716-446655550001'),
  ('550e8400-e29b-41d4-a716-446655550003', 'charlie_wilson', 'charlie@example.com', 'Charlie Wilson', 'CHAR2025', 'charlie_world_id_003', true, 4.90, '550e8400-e29b-41d4-a716-446655550001'),
  ('550e8400-e29b-41d4-a716-446655550004', 'diana_taylor', 'diana@example.com', 'Diana Taylor', 'DIANA2025', 'diana_world_id_004', true, 4.65, '550e8400-e29b-41d4-a716-446655550002'),
  ('550e8400-e29b-41d4-a716-446655550005', 'eva_martinez', 'eva@example.com', 'Eva Martinez', 'EVA2025', 'eva_world_id_005', false, 4.20, '550e8400-e29b-41d4-a716-446655550003'),
  ('550e8400-e29b-41d4-a716-446655550006', 'frank_garcia', 'frank@example.com', 'Frank Garcia', 'FRANK2025', 'frank_world_id_006', true, 4.78, '550e8400-e29b-41d4-a716-446655550001');

-- Update referral counts
UPDATE users SET total_referrals = 3, active_referrals = 3 WHERE id = '550e8400-e29b-41d4-a716-446655550001';
UPDATE users SET total_referrals = 1, active_referrals = 1 WHERE id = '550e8400-e29b-41d4-a716-446655550002';
UPDATE users SET total_referrals = 1, active_referrals = 1 WHERE id = '550e8400-e29b-41d4-a716-446655550003';

-- Insert sample products
INSERT INTO products (id, seller_id, category_id, title, description, condition, price_local, currency_code, location, images, community_percentage, view_count, favorite_count) VALUES
  ('550e8400-e29b-41d4-a716-446655660001', '550e8400-e29b-41d4-a716-446655550001', '550e8400-e29b-41d4-a716-446655441001', 'iPhone 14 Pro - สีทอง 128GB', 'iPhone 14 Pro สีทองสวยงาม ใช้งานมา 6 เดือน สภาพดีมาก มีกล่องและอุปกรณ์ครบ ไม่มีรอยขีดข่วน', 'ดีมาก', 28500.00, 'THB', '{"city": "Bangkok", "district": "Sukhumvit"}', '{"https://via.placeholder.com/400x400/FFD700/000000?text=iPhone+14+Pro"}', 3.5, 245, 18),
  ('550e8400-e29b-41d4-a716-446655660002', '550e8400-e29b-41d4-a716-446655550002', '550e8400-e29b-41d4-a716-446655442003', 'โต๊ะทำงาน IKEA BEKANT สีขาว', 'โต๊ะทำงานขนาด 160x80 ซม. สภาพดี ใช้งานมา 1 ปี เหมาะสำหรับ Work from Home', 'ดี', 4500.00, 'THB', '{"city": "Bangkok", "district": "Chatuchak"}', '{"https://via.placeholder.com/400x300/FFFFFF/808080?text=IKEA+Desk"}', 2.0, 156, 12),
  ('550e8400-e29b-41d4-a716-446655660003', '550e8400-e29b-41d4-a716-446655550003', '550e8400-e29b-41d4-a716-446655441002', 'MacBook Air M2 2022 สีเงิน', 'MacBook Air M2 8GB/256GB สีเงิน ซื้อมา 8 เดือน ยังอยู่ในประกัน Apple Care+ สภาพใหม่มาก', 'ใหม่', 35000.00, 'THB', '{"city": "Chiang Mai", "district": "Muang"}', '{"https://via.placeholder.com/400x300/C0C0C0/000000?text=MacBook+Air+M2"}', 4.0, 380, 32),
  ('550e8400-e29b-41d4-a716-446655660004', '550e8400-e29b-41d4-a716-446655550004', '550e8400-e29b-41d4-a716-446655441006', 'PlayStation 5 + 2 จอย + เกม 5 แผ่น', 'PS5 Standard Edition มีจอยสำรอง 1 ตัว พร้อมเกม Spider-Man 2, God of War, Horizon, GT7, FIFA 24', 'ดี', 18500.00, 'THB', '{"city": "Phuket", "district": "Kathu"}', '{"https://via.placeholder.com/400x300/000080/FFFFFF?text=PlayStation+5"}', 3.0, 289, 25),
  ('550e8400-e29b-41d4-a716-446655660005', '550e8400-e29b-41d4-a716-446655550005', '550e8400-e29b-41d4-a716-446655442001', 'โซฟา 3 ที่นั่ง สีเทา L-Shape', 'โซฟา L-Shape สีเทาเข้ม ผ้าหนังนิ่ม ใช้งานมา 2 ปี สภาพดี สะอาด', 'ปานกลาง', 12000.00, 'THB', '{"city": "Bangkok", "district": "Thonburi"}', '{"https://via.placeholder.com/400x300/808080/FFFFFF?text=L-Shape+Sofa"}', 2.5, 198, 15),
  ('550e8400-e29b-41d4-a716-446655660006', '550e8400-e29b-41d4-a716-446655550006', '550e8400-e29b-41d4-a716-446655441004', 'Canon EOS R6 Mark II + เลนส์ 24-105mm', 'กล้อง Mirrorless Canon R6 Mark II พร้อมเลนส์ Kit 24-105mm f/4L IS USM ยิงมาแค่ 2,000 shots', 'ดีมาก', 75000.00, 'THB', '{"city": "Bangkok", "district": "Phaya Thai"}', '{"https://via.placeholder.com/400x300/000000/FFFFFF?text=Canon+R6+Mark+II"}', 5.0, 456, 28);

-- Insert sample addresses
INSERT INTO addresses (user_id, label, recipient_name, phone, address_line1, city, state_province, postal_code, country, is_default) VALUES
  ('550e8400-e29b-41d4-a716-446655550001', 'Home', 'Alice Smith', '+66812345678', '123 Sukhumvit Road, Soi 21', 'Bangkok', 'Bangkok', '10110', 'TH', true),
  ('550e8400-e29b-41d4-a716-446655550002', 'Home', 'Bob Jones', '+66823456789', '456 Chatuchak Market Area', 'Bangkok', 'Bangkok', '10900', 'TH', true),
  ('550e8400-e29b-41d4-a716-446655550003', 'Home', 'Charlie Wilson', '+66834567890', '789 Nimmanhaemin Road', 'Chiang Mai', 'Chiang Mai', '50200', 'TH', true);

-- Insert sample favorites
INSERT INTO favorites (user_id, product_id) VALUES
  ('550e8400-e29b-41d4-a716-446655550001', '550e8400-e29b-41d4-a716-446655660003'),
  ('550e8400-e29b-41d4-a716-446655550001', '550e8400-e29b-41d4-a716-446655660004'),
  ('550e8400-e29b-41d4-a716-446655550002', '550e8400-e29b-41d4-a716-446655660001'),
  ('550e8400-e29b-41d4-a716-446655550002', '550e8400-e29b-41d4-a716-446655660006'),
  ('550e8400-e29b-41d4-a716-446655550003', '550e8400-e29b-41d4-a716-446655660002');

-- Insert sample orders
INSERT INTO orders (id, order_number, buyer_id, seller_id, subtotal, shipping_cost, community_fee, total_amount, currency_code, wld_rate, total_wld, shipping_address, status, payment_status, order_date) VALUES
  ('550e8400-e29b-41d4-a716-446655770001', 'FG2025001001', '550e8400-e29b-41d4-a716-446655550002', '550e8400-e29b-41d4-a716-446655550001', 28500.00, 150.00, 997.75, 29647.75, 'THB', 0.00125, 37.0596, '{"recipient_name": "Bob Jones", "phone": "+66823456789", "address_line1": "456 Chatuchak Market Area", "city": "Bangkok", "postal_code": "10900", "country": "TH"}', 'completed', 'paid', '2025-09-15 14:30:00+07'),
  ('550e8400-e29b-41d4-a716-446655770002', 'FG2025001002', '550e8400-e29b-41d4-a716-446655550003', '550e8400-e29b-41d4-a716-446655550002', 4500.00, 200.00, 90.00, 4790.00, 'THB', 0.00124, 6.158, '{"recipient_name": "Charlie Wilson", "phone": "+66834567890", "address_line1": "789 Nimmanhaemin Road", "city": "Chiang Mai", "postal_code": "50200", "country": "TH"}', 'delivered', 'paid', '2025-09-12 09:15:00+07');

-- Insert sample order items
INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, product_title, product_condition, product_image) VALUES
  ('550e8400-e29b-41d4-a716-446655770001', '550e8400-e29b-41d4-a716-446655660001', 1, 28500.00, 28500.00, 'iPhone 14 Pro - สีทอง 128GB', 'ดีมาก', 'https://via.placeholder.com/400x400/FFD700/000000?text=iPhone+14+Pro'),
  ('550e8400-e29b-41d4-a716-446655770002', '550e8400-e29b-41d4-a716-446655660002', 1, 4500.00, 4500.00, 'โต๊ะทำงาน IKEA BEKANT สีขาว', 'ดี', 'https://via.placeholder.com/400x300/FFFFFF/808080?text=IKEA+Desk');

-- Insert sample reviews
INSERT INTO reviews (order_id, reviewer_id, reviewed_user_id, product_id, rating, title, comment, communication_rating, item_quality_rating, shipping_rating) VALUES
  ('550e8400-e29b-41d4-a716-446655770001', '550e8400-e29b-41d4-a716-446655550002', '550e8400-e29b-41d4-a716-446655550001', '550e8400-e29b-41d4-a716-446655660001', 5, 'iPhone สภาพดีมากจริงๆ!', 'ของสภาพดีจริงตามที่บอก แพ็คดีมาก ส่งเร็ว ขายดีมาก แนะนำเลยครับ', 5, 5, 5),
  ('550e8400-e29b-41d4-a716-446655770002', '550e8400-e29b-41d4-a716-446655550003', '550e8400-e29b-41d4-a716-446655550002', '550e8400-e29b-41d4-a716-446655660002', 4, 'โต๊ะดีใช้งานได้', 'โต๊ะสภาพดี ตรงตามรูป การส่งของปกติ โอเคครับ', 4, 4, 4);

-- Insert sample referrals
INSERT INTO referrals (referrer_id, referee_id, level, first_purchase_made, first_purchase_date, total_purchases_made, total_purchase_value) VALUES
  ('550e8400-e29b-41d4-a716-446655550001', '550e8400-e29b-41d4-a716-446655550002', 1, true, '2025-09-15 14:30:00+07', 1, 29647.75),
  ('550e8400-e29b-41d4-a716-446655550001', '550e8400-e29b-41d4-a716-446655550003', 1, true, '2025-09-12 09:15:00+07', 1, 4790.00),
  ('550e8400-e29b-41d4-a716-446655550001', '550e8400-e29b-41d4-a716-446655550006', 1, false, NULL, 0, 0),
  ('550e8400-e29b-41d4-a716-446655550002', '550e8400-e29b-41d4-a716-446655550004', 1, false, NULL, 0, 0),
  ('550e8400-e29b-41d4-a716-446655550003', '550e8400-e29b-41d4-a716-446655550005', 1, false, NULL, 0, 0);

-- Insert sample earnings
INSERT INTO earnings (user_id, source_order_id, source_user_id, earning_type, amount_wld, amount_local, currency_code, referral_level, commission_rate, status, description) VALUES
  ('550e8400-e29b-41d4-a716-446655550001', '550e8400-e29b-41d4-a716-446655770001', '550e8400-e29b-41d4-a716-446655550002', 'referral_commission', 2.2240, 1779.84, 'THB', 1, 0.0600, 'confirmed', 'Level 1 referral commission from Bob Jones purchase'),
  ('550e8400-e29b-41d4-a716-446655550001', '550e8400-e29b-41d4-a716-446655770002', '550e8400-e29b-41d4-a716-446655550003', 'referral_commission', 0.3695, 295.60, 'THB', 1, 0.0600, 'confirmed', 'Level 1 referral commission from Charlie Wilson purchase'),
  ('550e8400-e29b-41d4-a716-446655550001', '550e8400-e29b-41d4-a716-446655770001', '550e8400-e29b-41d4-a716-446655550001', 'direct_sale', 35.2477, 28198.20, 'THB', NULL, NULL, 'confirmed', 'Direct sale of iPhone 14 Pro');

-- Insert sample chat rooms
INSERT INTO chat_rooms (id, product_id, buyer_id, seller_id, current_offer_amount, current_offer_currency, offer_status, last_message_at) VALUES
  ('550e8400-e29b-41d4-a716-446655880001', '550e8400-e29b-41d4-a716-446655660003', '550e8400-e29b-41d4-a716-446655550001', '550e8400-e29b-41d4-a716-446655550003', 34000.00, 'THB', 'pending', '2025-09-18 16:45:00+07'),
  ('550e8400-e29b-41d4-a716-446655880002', '550e8400-e29b-41d4-a716-446655660006', '550e8400-e29b-41d4-a716-446655550002', '550e8400-e29b-41d4-a716-446655550006', NULL, NULL, 'none', '2025-09-17 11:20:00+07');

-- Insert sample messages
INSERT INTO messages (chat_room_id, sender_id, message_type, content, offer_amount, offer_currency, created_at) VALUES
  ('550e8400-e29b-41d4-a716-446655880001', '550e8400-e29b-41d4-a716-446655550001', 'text', 'สวัสดีครับ สนใจ MacBook Air M2 ครับ', NULL, NULL, '2025-09-18 14:30:00+07'),
  ('550e8400-e29b-41d4-a716-446655880001', '550e8400-e29b-41d4-a716-446655550003', 'text', 'สวัสดีครับ สภาพดีจริงๆ นะครับ ใหม่มาก', NULL, NULL, '2025-09-18 14:32:00+07'),
  ('550e8400-e29b-41d4-a716-446655880001', '550e8400-e29b-41d4-a716-446655550001', 'offer', 'เสนอราคา 34,000 บาทครับ', 34000.00, 'THB', '2025-09-18 16:45:00+07'),
  ('550e8400-e29b-41d4-a716-446655880002', '550e8400-e29b-41d4-a716-446655550002', 'text', 'สนใจกล้อง Canon ครับ ของแท้ใช่มั้ยครับ', NULL, NULL, '2025-09-17 11:20:00+07');

-- Insert sample notifications
INSERT INTO notifications (user_id, type, title, body, data, is_read) VALUES
  ('550e8400-e29b-41d4-a716-446655550001', 'message', 'ข้อความใหม่', 'Bob Jones ส่งข้อความใหม่เกี่ยวกับ Canon EOS R6 Mark II', '{"chatRoomId": "550e8400-e29b-41d4-a716-446655880002", "productId": "550e8400-e29b-41d4-a716-446655660006"}', false),
  ('550e8400-e29b-41d4-a716-446655550001', 'earning', 'ได้รับค่าคอมมิชชั่น', 'คุณได้รับค่าคอมมิชชั่น 2.2240 WLD จากการซื้อของ Bob Jones', '{"amount": 2.2240, "currency": "WLD", "type": "referral_commission"}', true),
  ('550e8400-e29b-41d4-a716-446655550003', 'message', 'มีข้อเสนอใหม่', 'Alice Smith เสนอราคา 34,000 บาท สำหรับ MacBook Air M2', '{"chatRoomId": "550e8400-e29b-41d4-a716-446655880001", "offerAmount": 34000, "currency": "THB"}', false);