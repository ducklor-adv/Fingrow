# FINGROW SYSTEM BLUEPRINT 🌱
## Complete System Architecture & Database Documentation

---

## 🏗️ SYSTEM OVERVIEW

**Fingrow** เป็นระบบ Marketplace แบบ Multi-level Referral Network ที่รองรับการซื้อขายสินค้า, ระบบแนะนำ และการสร้างเครือข่าย

### 🎯 Core Features
- **User Management**: ระบบสมาชิก พร้อมการยืนยันตัวตน และ Authentication System
- **Product Marketplace**: ระบบซื้อขายสินค้า
- **ACF System**: ระบบจัดสรร Parent อัตโนมัติ (Auto-Connect Follower)
- **Referral Network**: ระบบแนะนำแบบหลายระดับ (MLM) พร้อม 5×7 Structure
- **Notification System**: ระบบแจ้งเตือนสำหรับเหตุการณ์ต่างๆ
- **Profile System**: ระบบโปรไฟล์ พร้อมอัปโหลดรูปภาพ
- **Admin Panel**: ระบบจัดการแอดมิน พร้อม Authentication

### 🖥️ **System Architecture**

```ascii
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FINGROW V3 ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────┐          │
│  │ index.html  │────│ admin/      │────│ Mobile/                 │          │
│  │ Landing     │    │ Dashboard   │    │ Marketplace             │          │
│  └─────────────┘    └─────────────┘    └─────────────────────────┘          │
│                           │                        │                        │
│                           │                        │                        │
│  ┌─────────────────────────┼────────────────────────┼───────────────────────┐│
│  │                         ▼                        ▼                       ││
│  │                  ┌─────────────────────────────────────┐                 ││
│  │                  │         Express.js Server           │                 ││
│  │                  │  ┌─────────────┐ ┌─────────────┐    │                 ││
│  │                  │  │ Users API   │ │ Products    │    │                 ││
│  │                  │  │ Auth System │ │ Management  │    │                 ││
│  │                  │  └─────────────┘ └─────────────┘    │                 ││
│  │                  │  ┌─────────────┐ ┌─────────────┐    │                 ││
│  │                  │  │ File Upload │ │ Referral    │    │                 ││
│  │                  │  │ (Multer)    │ │ Network     │    │                 ││
│  │                  │  └─────────────┘ └─────────────┘    │                 ││
│  │                  └─────────────────────────────────────┘                 ││
│  │                                    │                                     ││
│  │                                    ▼                                     ││
│  │           ┌────────────────┐  ┌──────────────────┐  ┌─────────────────┐  ││
│  │ CURRENT:  │ SQLite3        │  │ Profile Images   │  │ Node.js Server  │  ││
│  │           │ fingrow.db     │  │ /uploads/        │  │ localhost:5000  │  ││
│  │           └────────────────┘  └──────────────────┘  └─────────────────┘  ││
│  │                                                                          ││
│  └──────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘

Data Flow:
User -> Mobile/Admin -> Express.js API -> SQLite3 Database
             ↓
     File Upload -> /uploads/profiles/ -> Static File Serving
             ↓
     Referral Network -> MLM Tree Generation -> Commission Calculation
```

---

## 🗄️ DATABASE STRUCTURE

### 👥 **USERS TABLE** - ตารางข้อมูลผู้ใช้หลัก

| Field Name | Type | Description | หน้าที่/การใช้งาน |
|------------|------|-------------|-----------------|
| `id` | TEXT PRIMARY KEY | User ID รูปแบบ: [ปี2หลัก][AAA][0000] | ระบุตัวตนเฉพาะ เช่น 25AAA0001 |
| `world_id` | TEXT | Global World ID | สำหรับ sync ข้ามเซิร์ฟเวอร์ (อนาคต) |
| `username` | TEXT UNIQUE | ชื่อผู้ใช้ | Login, แสดงชื่อในระบบ |
| `email` | TEXT UNIQUE | อีเมล | Login, การติดต่อ |
| `phone` | TEXT | เบอร์โทรศัพท์ | ติดต่อ, ยืนยันตัวตน |
| `full_name` | TEXT | ชื่อจริง-นามสกุล | แสดงชื่อในเครือข่าย |
| `password_hash` | TEXT | รหัสผ่านที่เข้ารหัส bcrypt | ความปลอดภัย |
| `avatar_url` | TEXT | URL รูปโปรไฟล์ | แสดงในเครือข่าย/โปรไฟล์ |
| `profile_image_filename` | TEXT | ชื่อไฟล์รูปโปรไฟล์ | จัดการไฟล์อัปโหลด |
| `bio` | TEXT | แนะนำตัว | โปรไฟล์ส่วนตัว |
| `location` | TEXT | จังหวัด/พื้นที่ | แสดงที่อยู่, กรองสินค้า |
| `preferred_currency` | TEXT | สกุลเงินที่ต้องการ | แสดงราคาสินค้า |
| `language` | TEXT | ภาษา | UI/UX |
| **REFERRAL SYSTEM** | | | |
| `invite_code` | TEXT UNIQUE | รหัสเชิญเข้าร่วม | สร้างเครือข่าย, track referral |
| `invitor_id` | TEXT | ID ผู้แนะนำ (BIC) | สร้างเครือข่าย, คำนวณคอมมิชชั่น |
| `parent_id` | TEXT | ID Parent (ACF System) | Parent ในระบบ ACF 5×7 |
| `total_invites` | INTEGER | จำนวนคนที่แนะนำทั้งหมด | สถิติ, ranking |
| `active_invites` | INTEGER | จำนวนคนที่แนะนำที่ยัง active | คำนวณคอมมิชชั่น |
| **TRUST & VERIFICATION** | | | |
| `is_verified` | INTEGER (0/1) | สถานะยืนยันตัวตน | ความน่าเชื่อถือ |
| `verification_level` | INTEGER | ระดับการยืนยัน (1-5) | สิทธิ์การใช้งาน |
| `trust_score` | REAL | คะแนนความน่าเชื่อถือ | Seller rating |
| **BUSINESS METRICS** | | | |
| `total_sales` | REAL | ยอดขายรวม | สถิติ, ranking |
| `total_purchases` | REAL | ยอดซื้อรวม | สถิติผู้ซื้อ |
| **SYSTEM STATUS** | | | |
| `is_active` | INTEGER (0/1) | สถานะการใช้งาน | ระงับการใช้งาน |
| `is_suspended` | INTEGER (0/1) | สถานะถูกระงับ | จัดการผู้ใช้ |
| `created_at` | TEXT | วันที่สร้างบัญชี | สถิติ, audit |
| `updated_at` | TEXT | วันที่อัปเดตล่าสุด | tracking การเปลี่ยนแปลง |
| `last_login` | TEXT | Login ล่าสุด | สถิติการใช้งาน |

### 🛍️ **PRODUCTS TABLE** - ตารางสินค้า

| Field Name | Type | Description | หน้าที่/การใช้งาน |
|------------|------|-------------|-----------------|
| `id` | TEXT PRIMARY KEY | Product ID | ระบุสินค้าเฉพาะ |
| `seller_id` | TEXT | ID ผู้ขาย (FK: users.id) | เชื่อมโยงผู้ขาย |
| `title` | TEXT | ชื่อสินค้า | แสดงในรายการ |
| `description` | TEXT | รายละเอียดสินค้า | หน้าสินค้า |
| `price_local` | REAL | ราคาท้องถิน | แสดงราคา |
| `currency_code` | TEXT | รหัสสกุลเงิน | แปลงสกุลเงิน |
| **FIN FEE SYSTEM** | | | |
| `fin_fee_percent` | REAL | เปอร์เซ็นต์ค่าธรรมเนียม (1-7%) | ค่าธรรมเนียมที่ผู้ขายกำหนด |
| `amount_fee` | REAL | จำนวนเงินค่าธรรมเนียม | คำนวณจาก price * fin_fee_percent |
| `community_percentage` | REAL | เปอร์เซ็นต์ส่วนกลาง (legacy) | เก็บไว้เพื่อความเข้ากันได้ |
| `category_id` | TEXT | หมวดหมู่สินค้า | จัดหมวดหมู่ |
| `condition` | TEXT | สภาพสินค้า (new/used) | ข้อมูลสินค้า |
| `brand` | TEXT | ยี่ห้อ | ค้นหา/กรอง |
| `location` | TEXT | ที่อยู่สินค้า | จัดส่ง/รับสินค้า |
| `images` | TEXT (JSON) | รูปภาพสินค้า | แสดงรูป |
| `status` | TEXT | สถานะ (active/sold/hidden) | จัดการสินค้า |
| `created_at` | TEXT | วันที่เพิ่มสินค้า | เรียงลำดับ |
| `updated_at` | TEXT | วันที่แก้ไขล่าสุด | tracking |

### 📦 **ORDERS TABLE** - ตารางคำสั่งซื้อ

| Field Name | Type | Description | หน้าที่/การใช้งาน |
|------------|------|-------------|-----------------|
| `id` | TEXT PRIMARY KEY | Order ID | ระบุคำสั่งซื้อเฉพาะ |
| `order_number` | TEXT UNIQUE | หมายเลขคำสั่งซื้อ | แสดงให้ผู้ใช้ |
| `buyer_id` | TEXT | ID ผู้ซื้อ (FK: users.id) | ผู้สั่งซื้อ |
| `seller_id` | TEXT | ID ผู้ขาย (FK: users.id) | ผู้ขาย |
| `subtotal` | REAL | ยอดรวมสินค้า | ก่อนค่าธรรมเนียม |
| `shipping_cost` | REAL | ค่าจัดส่ง | ค่าส่ง |
| `tax_amount` | REAL | ภาษี | VAT/Tax |
| `community_fee` | REAL | ค่าธรรมเนียมระบบ | หักจากผู้ขาย |
| `total_amount` | REAL | ยอดรวมทั้งหมด | ยอดชำระ |
| `currency_code` | TEXT | สกุลเงิน | THB/USD/WLD |
| `wld_rate` | REAL | อัตราแลกเปลี่ยน WLD | Conversion rate |
| `total_wld` | REAL | ยอดรวมเป็น WLD | สำหรับ Worldcoin |
| `status` | TEXT | สถานะ (pending/confirmed/shipped/delivered/completed) | ติดตามสถานะ |
| `payment_status` | TEXT | สถานะการชำระเงิน | ยืนยันการชำระ |
| `created_at` | TEXT | วันที่สั่งซื้อ | บันทึกเวลา |

### 📋 **ORDER_ITEMS TABLE** - รายการสินค้าในคำสั่งซื้อ

| Field Name | Type | Description | หน้าที่/การใช้งาน |
|------------|------|-------------|-----------------|
| `id` | TEXT PRIMARY KEY | Item ID | ระบุรายการสินค้า |
| `order_id` | TEXT | ID คำสั่งซื้อ (FK: orders.id) | เชื่อมโยงคำสั่งซื้อ |
| `product_id` | TEXT | ID สินค้า (FK: products.id) | เชื่อมโยงสินค้า |
| `quantity` | INTEGER | จำนวน | จำนวนสินค้า |
| `unit_price` | REAL | ราคาต่อหน่วย | ราคาสินค้า |
| `total_price` | REAL | ราคารวม | quantity * unit_price |
| `product_title` | TEXT | ชื่อสินค้า | บันทึกชื่อตอนสั่งซื้อ |
| `product_condition` | TEXT | สภาพสินค้า | บันทึกสภาพตอนสั่งซื้อ |
| `product_image` | TEXT | รูปสินค้า | บันทึกรูปตอนสั่งซื้อ |

### 💰 **EARNINGS TABLE** - ตารางรายได้

| Field Name | Type | Description | หน้าที่/การใช้งาน |
|------------|------|-------------|-----------------|
| `id` | TEXT PRIMARY KEY | Earning ID | ระบุรายการรายได้ |
| `user_id` | TEXT | ID ผู้ใช้ (FK: users.id) | เจ้าของรายได้ |
| `amount` | REAL | จำนวนเงิน | รายได้ |
| `source` | TEXT | แหล่งที่มา (sale/referral/bonus) | ประเภทรายได้ |
| `order_id` | TEXT | ID คำสั่งซื้อ (FK: orders.id) | อ้างอิงคำสั่งซื้อ |
| `description` | TEXT | รายละเอียด | อธิบายรายได้ |
| `created_at` | TEXT | วันที่ได้รับ | บันทึกเวลา |

### 🏠 **ADDRESSES TABLE** - ตารางที่อยู่

| Field Name | Type | Description | หน้าที่/การใช้งาน |
|------------|------|-------------|-----------------|
| `id` | TEXT PRIMARY KEY | Address ID | ระบุที่อยู่ |
| `user_id` | TEXT | ID ผู้ใช้ (FK: users.id) | เจ้าของที่อยู่ |
| `type` | TEXT | ประเภท (shipping/billing) | ประเภทที่อยู่ |
| `full_name` | TEXT | ชื่อผู้รับ | ข้อมูลผู้รับ |
| `phone` | TEXT | เบอร์โทร | ติดต่อผู้รับ |
| `address_line1` | TEXT | ที่อยู่บรรทัด 1 | รายละเอียดที่อยู่ |
| `address_line2` | TEXT | ที่อยู่บรรทัด 2 | รายละเอียดเพิ่มเติม |
| `district` | TEXT | ตำบล/แขวง | ที่อยู่ย่อย |
| `city` | TEXT | อำเภอ/เขต | เมือง |
| `province` | TEXT | จังหวัด | จังหวัด |
| `postal_code` | TEXT | รหัสไปรษณีย์ | ZIP code |
| `is_default` | INTEGER | ที่อยู่เริ่มต้น | ใช้อัตโนมัติ |

### 📧 **NOTIFICATIONS TABLE** - ตารางการแจ้งเตือน

| Field Name | Type | Description | หน้าที่/การใช้งาน |
|------------|------|-------------|-----------------|
| `id` | TEXT PRIMARY KEY | Notification ID | ระบุการแจ้งเตือนเฉพาะ |
| `user_id` | TEXT | ID ผู้รับ (FK: users.id) | เจ้าของการแจ้งเตือน |
| `type` | TEXT | ประเภท (new_referral/new_acf_child/order/etc) | ประเภทการแจ้งเตือน |
| `title` | TEXT | หัวข้อ | หัวข้อการแจ้งเตือน |
| `body` | TEXT | เนื้อหา | รายละเอียด |
| `data` | TEXT (JSON) | ข้อมูลเพิ่มเติม | icon, referenceId |
| `is_read` | INTEGER (0/1) | สถานะอ่านแล้ว | ติดตามการอ่าน |
| `created_at` | TEXT | วันที่สร้าง | เรียงลำดับ |

### 🧬 **FINGROW_DNA TABLE** - ตารางโครงสร้างเครือข่าย ACF

| Field Name | Type | Description | หน้าที่/การใช้งาน |
|------------|------|-------------|-----------------|
| `user_id` | TEXT PRIMARY KEY | ID ผู้ใช้ (FK: users.id) | เจ้าของข้อมูล |
| `parent_id` | TEXT | ID Parent | Parent ในระบบ ACF |
| `level` | INTEGER | ระดับความลึก | ระดับในเครือข่าย (0-7) |
| `run_number` | INTEGER | หมายเลขลำดับ | ลำดับการเข้าร่วม |
| `regist_time` | TEXT | เวลาสมัคร | วันที่เวลาสมัคร |
| `regist_type` | TEXT | ประเภท (BIC/NIC) | BIC=มี invite code, NIC=ไม่มี |
| `user_type` | TEXT | ประเภทผู้ใช้ | Atta/Anatta |
| `child_count` | INTEGER | จำนวน child | จำนวน child ทั้งหมด |
| `follower_count` | INTEGER | จำนวน follower | จำนวน follower |
| `follower_full_status` | TEXT | สถานะ follower | Open/Full |
| `max_follower` | INTEGER | จำนวน follower สูงสุด | ขีดจำกัด (1 สำหรับ Anatta999, 5 สำหรับอื่นๆ) |
| `own_finpoint` | REAL | Finpoint ตัวเอง | คะแนนส่วนตัว |
| `total_finpoint` | REAL | Finpoint รวม | คะแนนรวม |
| `max_level_royalty` | INTEGER | ระดับสิทธิ์สูงสุด | ระดับสิทธิ์ royalty |

---

## 🔄 REFERRAL NETWORK SYSTEM

### 🌟 **การทำงานของระบบเครือข่าย**

#### **🔹 BIC vs NIC Registration Types**
- **BIC (By Invite Code)**: สมัครด้วยรหัสเชิญ - มี `invitor_id`
- **NIC (No Invite Code)**: สมัครโดยไม่มีรหัสเชิญ - ไปที่ NIC Target User

#### **🔹 ACF (Auto-Connect Follower) System**
ระบบจัดสรร Parent อัตโนมัติตามกฎ **5×7 Structure**:
- **5**: จำนวน child สูงสุดต่อ user (ยกเว้น Anatta999 = 1 child)
- **7**: ระดับความลึกสูงสุดของเครือข่าย

**ACF Allocation Algorithm:**
1. ตรวจสอบว่า invitor มี slot ว่างหรือไม่ (child < max)
2. ถ้ามี → จัดสรรเป็น child ของ invitor โดยตรง
3. ถ้าไม่มี → ค้นหา node ที่มี slot ว่างใน subtree แบบ BFS (Breadth-First Search)
4. เลือก candidate ที่:
   - อยู่ชั้นที่ใกล้ที่สุด (layer-first)
   - สมัครก่อน (earliest-first)
   - มี child น้อยที่สุด (lowest childCount)
5. ถ้าเครือข่ายเต็ม (5×7) → แจ้ง error

**Special Rules:**
- **Anatta999**: มี child ได้เพียง 1 คน เท่านั้น
- **Users อื่นๆ**: มี child ได้ 5 คน ต่อคน

#### 1. **User ID Generation Algorithm**
```
Format: [ปีค.ศ. 2 หลัก][Letters 3 ตัว][Numbers 4 หลัก]
Example: 25AAA0001, 25AAA0002, ..., 25AAA9999, 25AAB0000

Logic:
- เริ่มต้น: 25AAA0000
- เมื่อครบ 9999: เพิ่ม Letters (AAA→AAB→...→ZZZ)
- รองรับได้ 175,760,000 users ต่อปี
```

#### 2. **Invite Code Generation**
```
Format: [CLEANED_USERNAME][RANDOM_3_CHARS]
Example: DUCKLORDP7G, NEWUSER6PD

Process:
1. ทำความสะอาดชื่อผู้ใช้ (เอาเฉพาะ A-Z, 0-9)
2. แปลงเป็นตัวพิมพ์ใหญ่
3. เพิ่มตัวอักษรสุ่ม 3 ตัว
```

#### 3. **Network Creation Process**
```
Registration Flow:
1. User กรอกข้อมูล + invite_code (optional)
2. ตรวจสอบ invite_code ในฐานข้อมูล → หา invitor_id
3. รัน ACF Allocation → หา parent_id ที่เหมาะสม
4. สร้าง User ID ใหม่
5. สร้าง invite_code ใหม่สำหรับ user นี้
6. Insert ลง users table พร้อม invitor_id และ parent_id
7. Insert ลง fingrow_dna table พร้อมข้อมูล level, run_number
8. อัปเดต total_invites ของ invitor
9. อัปเดต child_count ของ parent
10. สร้าง notification สำหรับ invitor (BIC only)
11. สร้าง notification สำหรับ parent (ACF child notification)
```

#### 4. **Notification System**
```
การแจ้งเตือนอัตโนมัติ:

1. New Referral Notification (invitor):
   - เมื่อ: มีคนสมัครผ่าน invite code (BIC)
   - ผู้รับ: invitor
   - ข้อความ: "👥 มีสมาชิกใหม่: [ชื่อผู้สมัคร] ได้สมัครสมาชิกผ่านรหัสแนะนำของคุณ"

2. New ACF Child Notification (parent):
   - เมื่อ: มีคนเข้ามาเป็น child ในระบบ ACF
   - ผู้รับ: parent
   - ข้อความ: "🌳 คุณได้รับ Child ระบบ ACF เพิ่ม 1 คน
               คือ [ชื่อผู้สมัคร]
               จาก [ชื่อ invitor]
               เมื่อวันที่ [วันที่เวลา]"
```

#### 5. **Network Hierarchy Tracking**
```sql
-- หา downline ทั้งหมด
SELECT * FROM users WHERE invitor_id = 'USER_ID';

-- หา upline (ผู้แนะนำ)
SELECT * FROM users WHERE id = (
    SELECT invitor_id FROM users WHERE id = 'USER_ID'
);

-- นับจำนวนคนในเครือข่าย
SELECT COUNT(*) FROM users WHERE invitor_id = 'USER_ID';
```

---

## 🚀 BACKEND API ENDPOINTS

### 👤 **User Management**
| Endpoint | Method | Description | Parameters |
|----------|--------|-------------|------------|
| `/api/register` | POST | สมัครสมาชิกใหม่ | username, email, password, full_name, phone, province, invite_code |
| `/api/login` | POST | เข้าสู่ระบบ | username/email, password |
| `/api/users` | GET | ดึงรายชื่อผู้ใช้ทั้งหมด | - |
| `/api/users/:userId` | GET | ดึงข้อมูลผู้ใช้รายบุคคล | userId |
| `/api/users/:userId` | PUT | อัปเดตข้อมูลผู้ใช้ | userId + user data |

### 🖼️ **File Upload**
| Endpoint | Method | Description | Parameters |
|----------|--------|-------------|------------|
| `/api/upload-profile-image` | POST | อัปโหลดรูปโปรไฟล์ | profileImage (file), userId |
| `/uploads/*` | GET | Static Files Serving | file path |

### 🛍️ **Product Management**
| Endpoint | Method | Description | Parameters |
|----------|--------|-------------|------------|
| `/api/products` | GET | ดึงรายการสินค้า | - |
| `/api/products` | POST | เพิ่มสินค้าใหม่ | product data |
| `/api/products/:productId` | PUT | อัปเดตสินค้า | productId + product data |
| `/api/products/:productId` | DELETE | ลบสินค้า | productId |

### 📊 **Analytics**
| Endpoint | Method | Description | Parameters |
|----------|--------|-------------|------------|
| `/api/stats` | GET | สถิติระบบรวม | - |
| `/api/network/:userId` | GET | ข้อมูลเครือข่ายของผู้ใช้ | userId |

---

## 🎨 FRONTEND ARCHITECTURE

### 📱 **Mobile Interface** (`mobile/index.html`)
- **Single Page Application** พร้อม Dynamic Content Loading
- **Responsive Design** สำหรับมือถือ
- **Local Storage** สำหรับ User Session
- **AJAX API Calls** สำหรับ Real-time Data
- **Authentication System**:
  - ซ่อน bottom navigation bar บนหน้า login/register
  - Authentication guard ป้องกันการเข้าถึงโดยไม่ login
  - Auto-redirect ไปหน้า login สำหรับ unauthenticated users
  - ลบบัญชีทดสอบออกจากหน้า login

#### 🔧 Key Functions - User Management:
- `handleRegister()` - สมัครสมาชิกใหม่ พร้อมระบบ referral
- `handleLogin()` - เข้าสู่ระบบ ด้วย bcrypt verification
- `verifyAndShowReferrer(inviteCode)` - ตรวจสอบและแสดงข้อมูลผู้แนะนำ
- `showReferralState(state)` - จัดการสถานะการ์ด referral (info/manual/none/loading/error)
- `uploadProfileImageToServer()` - อัปโหลดรูปโปรไฟล์

#### 📊 Key Functions - Referral Network:
- `loadReferralsData()` - โหลดข้อมูลเครือข่าย
- `displayInvitedUsers(invitees)` - แสดงคนที่แนะนำมา พร้อมรูปโปรไฟล์
- `copyMyReferralCode()` - คัดลอกรหัสแนะนำ
- `generateReferralLink()` - สร้างลิงก์เชิญ พร้อม tracking parameters

#### 💰 Key Functions - Earnings & Products:
- `loadEarningsData()` - โหลดข้อมูลรายได้ (ยอดขาย, referral, bonus)
- `handleWithdraw()` - ถอนเงิน พร้อมตรวจสอบยอดขั้นต่ำ
- `updateFinFeeCalculation()` - คำนวณค่าธรรมเนียม real-time (1-7%)
- `updatePriceConversion()` - แปลงสกุลเงินเป็น WLD
- `loadProducts()` - โหลดสินค้าในตลาด
- `loadMyProducts()` - โหลดสินค้าของฉัน

#### 🎨 Key Functions - UI/UX:
- `showPage(pageId)` - เปลี่ยนหน้า SPA พร้อม auto-load data
- `showListingsTab(tabName)` - สลับ tab (sell/myProducts/orders)
- `toggleAuctionFields()` - แสดง/ซ่อนฟิลด์ประมูล
- `updateCurrencyLabel()` - อัปเดต label สกุลเงิน
- `loadExchangeRates()` - ดึงอัตราแลกเปลี่ยน real-time จาก CoinGecko API

#### 🔐 Key Variables - Global State:
```javascript
let currentUser = null;           // ผู้ใช้ปัจจุบัน
let database = null;              // API Client instance
let allProducts = [];             // รายการสินค้าทั้งหมด
let currentReferrerData = null;   // ข้อมูลผู้แนะนำปัจจุบัน
let exchangeRates = {};           // อัตราแลกเปลี่ยน
let lockedRate = null;            // อัตราแลกเปลี่ยนที่ล็อค
let lockedCurrency = null;        // สกุลเงินที่ล็อค
let rateLockedAt = null;          // เวลาที่ล็อคอัตรา
```

### 🔧 **Admin Panel** (`admin/index.html`)
- **Authentication System**:
  - หน้า login สำหรับ admin
  - Username: `admin999`
  - Password: `Anatta999*fin`
  - Session-based authentication (sessionStorage)
  - Authentication guard ป้องกันการเข้าถึงโดยไม่ login
  - ปุ่ม logout ที่ sidebar
- **User Management** - จัดการผู้ใช้
- **Product Moderation** - จัดการสินค้า
- **Network Analytics** - วิเคราะห์เครือข่าย (DNA Database & Tree View)
- **System Statistics** - สถิติระบบ
- **Settings Management** - จัดการการตั้งค่าระบบ (NIC Target, etc.)

---

## 🔧 TECHNICAL SPECIFICATIONS

### 🖥️ **Backend Stack**
- **Runtime**: Node.js with ES6 Modules
- **Framework**: Express.js
- **Database**: SQLite3 with better-sqlite3
- **File Upload**: Multer (5MB limit)
- **Security**: bcryptjs for password hashing
- **CORS**: Cross-Origin Resource Sharing enabled

### 🎨 **Frontend Stack**
- **HTML5** with Semantic Structure
- **CSS3** with Modern Flexbox/Grid
- **Vanilla JavaScript** (ES6+)
- **Local Storage** for Client-side Data
- **Fetch API** for Server Communication

### 📁 **File Structure**
```
FingrowV3/
├── server.js              # Main Backend Server
├── package.json           # Dependencies
├── data/
│   └── fingrow.db         # SQLite Database
├── uploads/
│   └── profiles/          # Profile Images
├── mobile/
│   └── index.html         # Mobile Interface
├── admin/
│   ├── index.html         # Admin Panel
│   └── js/
│       └── admin.js       # Admin Functions
└── FINGROW_SYSTEM_BLUEPRINT.md
```

---

## 🌐 NETWORK CREATION IMPLEMENTATION GUIDE

### 🎯 **Current Network System Status**

#### ✅ **Implemented Features:**
1. **User Registration with Referral:**
   - ตรวจสอบ `invite_code` จาก URL parameters (`?invite=CODE`)
   - แสดงข้อมูลผู้แนะนำพร้อมรูปโปรไฟล์
   - บันทึก `invitor_id` ในฐานข้อมูล
   - อัปเดต `total_invites` ของผู้แนะนำ

2. **Referral Card System:**
   - 5 สถานะ: info, manual, none, loading, error
   - Real-time verification ของ invite code
   - เปลี่ยนผู้แนะนำได้ก่อนสมัคร
   - รองรับทั้ง link และ code

3. **Network Display:**
   - แสดงรายชื่อคนที่แนะนำมา
   - แสดงข้อมูลผู้แนะนำตัวเอง
   - Copy referral code/link
   - นับจำนวนคนในเครือข่าย

#### 🚀 **Recommended Network Tree Features for ChatGPT:**

### 🔥 **1. Enhanced Network Visualization Tree**
```javascript
// สร้าง Hierarchical Tree View แสดงเครือข่ายแบบ Multi-level
async function buildNetworkTree(userId, maxDepth = 5) {
    /**
     * สร้าง tree structure แบบ recursive
     * @param {string} userId - ID ของ user ที่เป็นจุดเริ่มต้น
     * @param {number} maxDepth - ความลึกสูงสุดของ tree
     * @returns {Object} Tree structure with user data
     *
     * Return format:
     * {
     *   id: "25AAA0001",
     *   username: "ducklord",
     *   full_name: "DuckLord",
     *   profile_image: "/uploads/profiles/xxx.jpg",
     *   total_invites: 5,
     *   level: 0,
     *   children: [
     *     { id: "25AAA0002", username: "user2", level: 1, children: [...] },
     *     { id: "25AAA0003", username: "user3", level: 1, children: [...] }
     *   ]
     * }
     */

    const visited = new Set(); // ป้องกัน infinite loop

    async function buildNode(userId, currentDepth) {
        if (currentDepth > maxDepth || visited.has(userId)) {
            return null;
        }

        visited.add(userId);

        // Fetch user data
        const user = await database.getUser(userId);
        if (!user) return null;

        // Fetch direct downlines
        const downlines = await database.getUsers();
        const children = downlines.data
            .filter(u => u.invitor_id === userId)
            .map(async (child) => await buildNode(child.id, currentDepth + 1))
            .filter(node => node !== null);

        return {
            id: user.id,
            username: user.username,
            full_name: user.full_name,
            profile_image: user.profile_image,
            invite_code: user.invite_code,
            total_invites: user.total_invites || 0,
            active_invites: user.active_invites || 0,
            created_at: user.created_at,
            level: currentDepth,
            children: await Promise.all(children)
        };
    }

    return await buildNode(userId, 0);
}

function renderNetworkVisualization(treeData, containerId = 'networkTree') {
    /**
     * Render tree ด้วย HTML/CSS แบบ Interactive
     * สามารถ expand/collapse nodes
     * แสดง user info เมื่อ hover/click
     */

    const container = document.getElementById(containerId);

    function createNodeHTML(node) {
        const hasChildren = node.children && node.children.length > 0;

        return `
            <div class="tree-node" data-level="${node.level}" data-user-id="${node.id}">
                <div class="node-card ${hasChildren ? 'has-children' : ''}">
                    <img src="${node.profile_image || '/default-avatar.png'}" class="node-avatar">
                    <div class="node-info">
                        <div class="node-name">${node.full_name}</div>
                        <div class="node-stats">${node.total_invites} คน</div>
                    </div>
                    ${hasChildren ? '<button class="expand-btn">▼</button>' : ''}
                </div>
                ${hasChildren ? `
                    <div class="node-children">
                        ${node.children.map(child => createNodeHTML(child)).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    container.innerHTML = createNodeHTML(treeData);

    // Add expand/collapse functionality
    container.querySelectorAll('.expand-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const node = e.target.closest('.tree-node');
            node.classList.toggle('collapsed');
        });
    });
}
```

#### 2. **Advanced Network Analytics**
```javascript
// คำนวณ Network Performance Metrics
function calculateNetworkMetrics(userId) {
    return {
        totalNetwork: 0,      // จำนวนคนในเครือข่าย
        activeNetwork: 0,     // จำนวนคนที่ active
        networkDepth: 0,      // ความลึกของเครือข่าย
        monthlyGrowth: 0,     // การเติบโตรายเดือน
        networkValue: 0       // มูลค่ารวมของเครือข่าย
    };
}
```

#### 3. **Referral Link Generator**
```javascript
// สร้าง Dynamic Referral Links
function generateReferralLink(userId, campaign = 'default') {
    const baseUrl = window.location.origin;
    const inviteCode = getCurrentUser().invite_code;
    return `${baseUrl}/mobile/?invite=${inviteCode}&campaign=${campaign}&source=share`;
}
```

#### 4. **Network Search & Filter**
```javascript
// ค้นหาและกรองเครือข่าย
function searchNetwork(userId, filters = {}) {
    // Filters: name, level, joinDate, status, etc.
    // Return: Filtered network members
}
```

---

## 🎯 **NETWORK EXPANSION STRATEGIES**

### 📈 **Growth Tracking Variables**
- `total_invites` - จำนวนคนที่แนะนำ (สะสม)
- `active_invites` - จำนวนคนที่แนะนำที่ยัง active
- `created_at` - วันที่เข้าร่วม (สำหรับคำนวณ growth rate)
- `last_login` - การใช้งานล่าสุด (สำหรับ active status)

### 🏆 **Gamification Elements**
```javascript
// ระบบ Achievement & Rewards
const ACHIEVEMENTS = {
    FIRST_REFERRAL: { name: 'ผู้แนะนำมือใหม่', reward: 'badge' },
    NETWORK_BUILDER: { name: 'นักสร้างเครือข่าย', requirement: 10 },
    MASTER_RECRUITER: { name: 'เจ้าแห่งการรีครูท', requirement: 50 }
};
```

---

## 💡 **ACTUAL IMPLEMENTATION CODE SAMPLES**

### 🔧 **Server-side Functions** (From `server.js`)

#### **User ID Generation**
```javascript
// Helper function to generate new format User ID: [ปีค.ศ 2 หลัก][AAA][0000]
function generateUserId() {
    const currentYear = new Date().getFullYear();
    const yearSuffix = currentYear.toString().slice(-2); // เอา 2 หลักท้าย เช่น 2025 -> 25

    // หา User ID ล่าสุดในปีนี้
    const latestUser = db.prepare(`
        SELECT id FROM users
        WHERE id LIKE '${yearSuffix}%'
        ORDER BY id DESC
        LIMIT 1
    `).get();

    let nextSequence = 'AAA0000'; // เริ่มต้น

    if (latestUser) {
        const currentId = latestUser.id;
        const sequence = currentId.substring(2); // เอาส่วนหลัง yearSuffix

        // แยก letters และ numbers
        const letters = sequence.substring(0, 3);
        const numbers = parseInt(sequence.substring(3));

        if (numbers < 9999) {
            // เพิ่มตัวเลข
            const newNumbers = (numbers + 1).toString().padStart(4, '0');
            nextSequence = letters + newNumbers;
        } else {
            // เพิ่มตัวอักษร และ reset ตัวเลข
            const newLetters = incrementLetters(letters);
            nextSequence = newLetters + '0000';
        }
    }

    return yearSuffix + nextSequence;
}

// Helper function to increment letters (AAA -> AAB -> ... -> ZZZ)
function incrementLetters(letters) {
    let result = letters.split('');
    let carry = true;

    for (let i = result.length - 1; i >= 0 && carry; i--) {
        if (result[i] === 'Z') {
            result[i] = 'A';
        } else {
            result[i] = String.fromCharCode(result[i].charCodeAt(0) + 1);
            carry = false;
        }
    }

    return result.join('');
}
```

#### **Invite Code Generation**
```javascript
// Helper function to generate invite code
function generateInviteCode(username) {
    const cleanUsername = username.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const randomSuffix = Math.random().toString(36).substr(2, 3).toUpperCase();
    return `${cleanUsername}${randomSuffix}`;
}
```

#### **Registration with Referral System**
```javascript
// Registration Flow (Excerpt from server.js)
app.post('/api/register', async (req, res) => {
    try {
        const userData = req.body;

        // Check if username exists
        const existingUsername = db.prepare('SELECT id FROM users WHERE username = ?').get(userData.username);
        if (existingUsername) {
            return res.json({ success: false, message: 'Username already exists' });
        }

        // Check if email exists
        const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(userData.email);
        if (existingEmail) {
            return res.json({ success: false, message: 'Email already exists' });
        }

        // Generate invite code
        const inviteCode = generateInviteCode(userData.username);

        // Check if invite code exists and find invitor
        let invitedBy = null;
        if (userData.invite_code) {
            const invitor = db.prepare('SELECT id FROM users WHERE invite_code = ?').get(userData.invite_code);
            if (invitor) {
                invitedBy = invitor.id;
            }
        }

        // Generate new user ID
        const userId = generateUserId();

        // Insert new user with referral connection
        const insertStmt = db.prepare(`
            INSERT INTO users (
                id, username, email, full_name, phone,
                invite_code, invitor_id,
                created_at, last_login, location
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        insertStmt.run(
            userId,
            userData.username,
            userData.email,
            userData.full_name,
            userData.phone || '',
            inviteCode,
            invitedBy,
            new Date().toISOString(),
            new Date().toISOString(),
            userData.province || ''
        );

        // Update invitor's total_invites if applicable
        if (invitedBy) {
            db.prepare('UPDATE users SET total_invites = total_invites + 1 WHERE id = ?').run(invitedBy);
        }

        const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        res.json({
            success: true,
            message: 'Registration successful',
            user: newUser
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed',
            error: error.message
        });
    }
});
```

### 🎨 **Frontend Functions** (From `mobile/index.html`)

#### **Load Referrals Data**
```javascript
// Load referrals data from database
async function loadReferralsData() {
    console.log('Loading referrals data...');

    if (!currentUser) {
        console.log('No current user, skipping referrals load');
        return;
    }

    try {
        // Set invite code and referral link
        const inviteCode = currentUser.invite_code || '';
        const referralLink = inviteCode ? `${window.location.origin}/mobile/?invite=${inviteCode}` : '';

        document.getElementById('myReferralCode').value = inviteCode;
        document.getElementById('myReferralLink').value = referralLink;

        // Count users who were invited by this user
        const invitedUsers = await database.getAllUsers();
        const myInvitees = invitedUsers.data ?
            invitedUsers.data.filter(user => {
                const userInvitor = user.invited_by || user.invitor_id;
                return userInvitor === currentUser.id;
            }) : [];

        console.log('Found invitees:', myInvitees.map(u => ({id: u.id, username: u.username})));

        // Update real referral count
        document.querySelector('#referrals .stat-card:first-child .stat-value').textContent = myInvitees.length;

        // Display invited users
        displayInvitedUsers(myInvitees);

        // Find and display inviter info
        if (currentUser.invited_by || currentUser.invitor_id) {
            const invitorId = currentUser.invited_by || currentUser.invitor_id;
            const inviter = invitedUsers.data?.find(u => u.id === invitorId);

            if (inviter) {
                displayInviterInfo(inviter);
            }
        }

    } catch (error) {
        console.error('Error loading referrals data:', error);
    }
}
```

#### **Display Network Members**
```javascript
function displayInvitedUsers(invitees) {
    const listContainer = document.getElementById('invitedUsersList');

    if (!invitees || invitees.length === 0) {
        listContainer.innerHTML = '<div style="text-align: center; color: #94a3b8; padding: 24px;">ยังไม่มีคนที่คุณชวนมา</div>';
        return;
    }

    listContainer.innerHTML = invitees.map(user => {
        const initials = (user.full_name || user.username || 'U').charAt(0).toUpperCase();
        const joinDate = user.created_at ? new Date(user.created_at).toLocaleDateString('th-TH') : 'ไม่ทราบ';
        const displayName = user.full_name || user.username || 'ไม่ระบุ';

        // Check if user has profile image
        const hasProfileImage = user.profile_image || user.avatar_url;
        const avatarContent = hasProfileImage
            ? `<img src="${user.profile_image || user.avatar_url}" alt="${displayName}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;">`
            : initials;

        return `
            <div class="invited-user-card">
                <div class="invited-user-avatar">${avatarContent}</div>
                <div class="invited-user-info">
                    <div class="invited-user-name">${displayName}</div>
                    <div class="invited-user-date">เข้าร่วม: ${joinDate}</div>
                </div>
            </div>
        `;
    }).join('');
}
```

---

## 🎯 **RECOMMENDED NEXT STEPS FOR CHATGPT**

### 🌟 **Priority 1: Network Visualization Dashboard**
Create an interactive tree view to visualize the referral network hierarchy:

#### **Complete Network Tree Builder**
```javascript
// Build hierarchical network tree structure
async function buildNetworkTree(userId, maxDepth = 5) {
    try {
        // Fetch all users from database
        const usersResponse = await database.getAllUsers();
        const allUsers = usersResponse.data || usersResponse || [];

        // Find root user
        const rootUser = allUsers.find(u => u.id === userId);
        if (!rootUser) {
            console.error('Root user not found');
            return null;
        }

        // Track visited users to prevent loops
        const visited = new Set();

        // Recursive function to build tree
        function buildNode(user, depth = 0) {
            // Prevent infinite loops and respect max depth
            if (visited.has(user.id) || depth > maxDepth) {
                return null;
            }

            visited.add(user.id);

            // Find direct referrals (children)
            const children = allUsers.filter(u => {
                const invitorId = u.invitor_id || u.invited_by;
                return invitorId === user.id && !visited.has(u.id);
            });

            // Build node object
            const node = {
                id: user.id,
                username: user.username,
                full_name: user.full_name,
                avatar_url: user.avatar_url || user.profile_image,
                invite_code: user.invite_code,
                created_at: user.created_at,
                depth: depth,
                total_invites: user.total_invites || 0,
                active_invites: user.active_invites || 0,
                is_active: user.is_active === 1,
                children: []
            };

            // Recursively build children nodes
            children.forEach(child => {
                const childNode = buildNode(child, depth + 1);
                if (childNode) {
                    node.children.push(childNode);
                }
            });

            return node;
        }

        const treeData = buildNode(rootUser);

        // Calculate tree metrics
        function calculateMetrics(node) {
            let totalCount = 1;
            let activeCount = node.is_active ? 1 : 0;
            let maxDepth = node.depth;

            node.children.forEach(child => {
                const childMetrics = calculateMetrics(child);
                totalCount += childMetrics.total;
                activeCount += childMetrics.active;
                maxDepth = Math.max(maxDepth, childMetrics.maxDepth);
            });

            return {
                total: totalCount,
                active: activeCount,
                maxDepth: maxDepth
            };
        }

        const metrics = calculateMetrics(treeData);

        return {
            tree: treeData,
            metrics: {
                totalMembers: metrics.total,
                activeMembers: metrics.active,
                networkDepth: metrics.maxDepth,
                generationCount: metrics.maxDepth + 1
            }
        };

    } catch (error) {
        console.error('Error building network tree:', error);
        return null;
    }
}
```

#### **Interactive HTML Network Visualization**
```javascript
// Render network tree as interactive HTML
function renderNetworkVisualization(treeData, containerId = 'networkTreeContainer') {
    const container = document.getElementById(containerId);

    if (!treeData || !treeData.tree) {
        container.innerHTML = '<div class="empty-state">ไม่พบข้อมูลเครือข่าย</div>';
        return;
    }

    // Display metrics summary
    const metricsHtml = `
        <div class="network-metrics-summary">
            <div class="metric-card">
                <div class="metric-value">${treeData.metrics.totalMembers}</div>
                <div class="metric-label">สมาชิกทั้งหมด</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${treeData.metrics.activeMembers}</div>
                <div class="metric-label">สมาชิกที่ใช้งาน</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${treeData.metrics.networkDepth}</div>
                <div class="metric-label">ระดับลึกสุด</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${treeData.metrics.generationCount}</div>
                <div class="metric-label">จำนวนชั้น</div>
            </div>
        </div>
    `;

    // Recursive function to render tree nodes
    function renderNode(node, level = 0) {
        const indent = level * 30;
        const hasChildren = node.children && node.children.length > 0;
        const nodeId = `node-${node.id}`;

        // Avatar display
        const avatarHtml = node.avatar_url
            ? `<img src="${node.avatar_url}" alt="${node.username}" class="node-avatar">`
            : `<div class="node-avatar-placeholder">${(node.full_name || node.username).charAt(0).toUpperCase()}</div>`;

        // Active status indicator
        const statusClass = node.is_active ? 'status-active' : 'status-inactive';
        const statusIcon = node.is_active ? '🟢' : '⚪';

        // Join date
        const joinDate = node.created_at ? new Date(node.created_at).toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }) : 'ไม่ทราบ';

        let html = `
            <div class="network-node" data-node-id="${node.id}" data-depth="${level}" style="margin-left: ${indent}px;">
                <div class="node-header" onclick="toggleNodeChildren('${nodeId}')">
                    ${hasChildren ? `<span class="node-toggle" id="${nodeId}-toggle">▼</span>` : '<span class="node-spacer"></span>'}
                    ${avatarHtml}
                    <div class="node-info">
                        <div class="node-name">
                            ${node.full_name || node.username}
                            <span class="node-status ${statusClass}">${statusIcon}</span>
                        </div>
                        <div class="node-details">
                            <span class="node-invite-code">🔗 ${node.invite_code}</span>
                            <span class="node-join-date">📅 ${joinDate}</span>
                            ${hasChildren ? `<span class="node-children-count">👥 ${node.children.length} คน</span>` : ''}
                        </div>
                    </div>
                    <div class="node-stats">
                        <div class="node-stat">
                            <span class="stat-label">ชวนทั้งหมด:</span>
                            <span class="stat-value">${node.total_invites}</span>
                        </div>
                        <div class="node-stat">
                            <span class="stat-label">ใช้งาน:</span>
                            <span class="stat-value">${node.active_invites}</span>
                        </div>
                    </div>
                </div>
                ${hasChildren ? `<div class="node-children" id="${nodeId}-children">` : ''}
        `;

        // Recursively render children
        if (hasChildren) {
            node.children.forEach(child => {
                html += renderNode(child, level + 1);
            });
            html += '</div>';
        }

        html += '</div>';
        return html;
    }

    // Combine metrics and tree
    const treeHtml = metricsHtml + '<div class="network-tree">' + renderNode(treeData.tree) + '</div>';
    container.innerHTML = treeHtml;
}

// Toggle node children visibility
function toggleNodeChildren(nodeId) {
    const childrenContainer = document.getElementById(`${nodeId}-children`);
    const toggleIcon = document.getElementById(`${nodeId}-toggle`);

    if (!childrenContainer || !toggleIcon) return;

    if (childrenContainer.style.display === 'none') {
        childrenContainer.style.display = 'block';
        toggleIcon.textContent = '▼';
    } else {
        childrenContainer.style.display = 'none';
        toggleIcon.textContent = '▶';
    }
}
```

#### **CSS Styles for Network Tree**
```css
/* Network Metrics Summary */
.network-metrics-summary {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
}

.metric-card {
    background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
    border: 1px solid #475569;
    border-radius: 12px;
    padding: 16px;
    text-align: center;
}

.metric-value {
    font-size: 32px;
    font-weight: bold;
    color: #10b981;
    margin-bottom: 8px;
}

.metric-label {
    font-size: 14px;
    color: #94a3b8;
}

/* Network Tree Styles */
.network-tree {
    background: #1e293b;
    border-radius: 12px;
    padding: 20px;
    overflow-x: auto;
}

.network-node {
    margin-bottom: 8px;
    transition: all 0.3s ease;
}

.node-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: #334155;
    border: 1px solid #475569;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.node-header:hover {
    background: #3f4f64;
    border-color: #10b981;
    transform: translateX(4px);
}

.node-toggle {
    width: 24px;
    text-align: center;
    color: #10b981;
    font-size: 16px;
    user-select: none;
}

.node-spacer {
    width: 24px;
}

.node-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid #10b981;
}

.node-avatar-placeholder {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: linear-gradient(135deg, #064e3b 0%, #065f46 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    font-weight: bold;
    color: #10b981;
    border: 2px solid #10b981;
}

.node-info {
    flex: 1;
    min-width: 0;
}

.node-name {
    font-size: 16px;
    font-weight: 600;
    color: #f1f5f9;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    gap: 8px;
}

.node-status {
    font-size: 12px;
}

.status-active {
    color: #10b981;
}

.status-inactive {
    color: #64748b;
}

.node-details {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    font-size: 12px;
    color: #94a3b8;
}

.node-invite-code,
.node-join-date,
.node-children-count {
    display: inline-flex;
    align-items: center;
    gap: 4px;
}

.node-stats {
    display: flex;
    flex-direction: column;
    gap: 4px;
    text-align: right;
}

.node-stat {
    font-size: 12px;
    color: #94a3b8;
}

.node-stat .stat-value {
    color: #10b981;
    font-weight: 600;
    margin-left: 4px;
}

.node-children {
    margin-top: 8px;
    border-left: 2px solid #475569;
    padding-left: 8px;
}

.empty-state {
    text-align: center;
    padding: 48px;
    color: #64748b;
    font-size: 16px;
}
```

### 🌟 **Priority 2: Advanced Analytics Dashboard**
Implement comprehensive network analytics:

#### **Complete Network Analytics Functions**
```javascript
// Calculate comprehensive network statistics
async function calculateNetworkStats(userId) {
    try {
        const usersResponse = await database.getAllUsers();
        const allUsers = usersResponse.data || usersResponse || [];

        // Find all users in this user's network
        const networkMembers = [];
        const queue = [userId];
        const visited = new Set();

        while (queue.length > 0) {
            const currentId = queue.shift();
            if (visited.has(currentId)) continue;
            visited.add(currentId);

            const user = allUsers.find(u => u.id === currentId);
            if (user) {
                networkMembers.push(user);

                // Add children to queue
                const children = allUsers.filter(u => {
                    const invitorId = u.invitor_id || u.invited_by;
                    return invitorId === currentId;
                });
                children.forEach(child => queue.push(child.id));
            }
        }

        // Calculate statistics
        const totalMembers = networkMembers.length - 1; // Exclude self
        const activeMembers = networkMembers.filter(u => u.is_active === 1 && u.id !== userId).length;

        // Calculate growth rate (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentJoins = networkMembers.filter(u => {
            if (!u.created_at || u.id === userId) return false;
            return new Date(u.created_at) >= thirtyDaysAgo;
        }).length;

        // Calculate network depth
        let maxDepth = 0;
        function findDepth(currentUserId, depth = 0) {
            maxDepth = Math.max(maxDepth, depth);
            const children = allUsers.filter(u => {
                const invitorId = u.invitor_id || u.invited_by;
                return invitorId === currentUserId;
            });
            children.forEach(child => findDepth(child.id, depth + 1));
        }
        findDepth(userId);

        // Calculate conversion rate (active/total)
        const conversionRate = totalMembers > 0 ? (activeMembers / totalMembers * 100).toFixed(2) : 0;

        // Find top performers (most invites)
        const topPerformers = networkMembers
            .filter(u => u.id !== userId)
            .sort((a, b) => (b.total_invites || 0) - (a.total_invites || 0))
            .slice(0, 5)
            .map(u => ({
                id: u.id,
                username: u.username,
                full_name: u.full_name,
                total_invites: u.total_invites || 0,
                avatar_url: u.avatar_url || u.profile_image
            }));

        // Calculate generation distribution
        const generationCounts = {};
        function countByGeneration(currentUserId, generation = 0) {
            generationCounts[generation] = (generationCounts[generation] || 0) + 1;
            const children = allUsers.filter(u => {
                const invitorId = u.invitor_id || u.invited_by;
                return invitorId === currentUserId;
            });
            children.forEach(child => countByGeneration(child.id, generation + 1));
        }
        countByGeneration(userId);
        delete generationCounts[0]; // Remove self

        return {
            totalMembers,
            activeMembers,
            inactiveMembers: totalMembers - activeMembers,
            networkGrowthRate: recentJoins,
            networkDepth: maxDepth,
            conversionRate: parseFloat(conversionRate),
            topPerformers,
            generationCounts,
            lastUpdated: new Date().toISOString()
        };

    } catch (error) {
        console.error('Error calculating network stats:', error);
        return null;
    }
}

// Generate detailed network performance report
async function generateNetworkReport(userId, period = '30d') {
    try {
        const stats = await calculateNetworkStats(userId);
        if (!stats) {
            return null;
        }

        // Calculate period-specific metrics
        const periodDays = parseInt(period);
        const periodDate = new Date();
        periodDate.setDate(periodDate.getDate() - periodDays);

        const usersResponse = await database.getAllUsers();
        const allUsers = usersResponse.data || usersResponse || [];

        // Find network members who joined in period
        const periodJoins = allUsers.filter(u => {
            if (!u.created_at) return false;
            const joinDate = new Date(u.created_at);
            return joinDate >= periodDate;
        });

        // Calculate daily growth
        const dailyGrowth = {};
        periodJoins.forEach(user => {
            const joinDate = new Date(user.created_at).toLocaleDateString('th-TH');
            dailyGrowth[joinDate] = (dailyGrowth[joinDate] || 0) + 1;
        });

        // Generate report object
        const report = {
            userId: userId,
            period: period,
            generatedAt: new Date().toISOString(),
            summary: {
                totalMembers: stats.totalMembers,
                activeMembers: stats.activeMembers,
                inactiveMembers: stats.inactiveMembers,
                conversionRate: stats.conversionRate,
                networkDepth: stats.networkDepth
            },
            growth: {
                periodJoins: periodJoins.length,
                dailyAverage: (periodJoins.length / periodDays).toFixed(2),
                dailyBreakdown: dailyGrowth
            },
            performance: {
                topPerformers: stats.topPerformers,
                generationDistribution: stats.generationCounts
            },
            trends: {
                weekOverWeek: calculateWeekOverWeek(allUsers, userId),
                monthOverMonth: calculateMonthOverMonth(allUsers, userId)
            }
        };

        return report;

    } catch (error) {
        console.error('Error generating network report:', error);
        return null;
    }
}

// Helper: Calculate week-over-week growth
function calculateWeekOverWeek(allUsers, userId) {
    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - 7);
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 14);

    const thisWeekCount = allUsers.filter(u => {
        if (!u.created_at) return false;
        const joinDate = new Date(u.created_at);
        return joinDate >= thisWeek;
    }).length;

    const lastWeekCount = allUsers.filter(u => {
        if (!u.created_at) return false;
        const joinDate = new Date(u.created_at);
        return joinDate >= lastWeek && joinDate < thisWeek;
    }).length;

    const growthRate = lastWeekCount > 0
        ? ((thisWeekCount - lastWeekCount) / lastWeekCount * 100).toFixed(2)
        : 0;

    return {
        thisWeek: thisWeekCount,
        lastWeek: lastWeekCount,
        growthRate: parseFloat(growthRate)
    };
}

// Helper: Calculate month-over-month growth
function calculateMonthOverMonth(allUsers, userId) {
    const thisMonth = new Date();
    thisMonth.setDate(thisMonth.getDate() - 30);
    const lastMonth = new Date();
    lastMonth.setDate(lastMonth.getDate() - 60);

    const thisMonthCount = allUsers.filter(u => {
        if (!u.created_at) return false;
        const joinDate = new Date(u.created_at);
        return joinDate >= thisMonth;
    }).length;

    const lastMonthCount = allUsers.filter(u => {
        if (!u.created_at) return false;
        const joinDate = new Date(u.created_at);
        return joinDate >= lastMonth && joinDate < thisMonth;
    }).length;

    const growthRate = lastMonthCount > 0
        ? ((thisMonthCount - lastMonthCount) / lastMonthCount * 100).toFixed(2)
        : 0;

    return {
        thisMonth: thisMonthCount,
        lastMonth: lastMonthCount,
        growthRate: parseFloat(growthRate)
    };
}

// Display analytics dashboard
async function displayAnalyticsDashboard(containerId = 'analyticsDashboard') {
    const container = document.getElementById(containerId);

    if (!currentUser) {
        container.innerHTML = '<div class="empty-state">กรุณาเข้าสู่ระบบ</div>';
        return;
    }

    container.innerHTML = '<div class="loading">กำลังโหลดข้อมูล...</div>';

    const stats = await calculateNetworkStats(currentUser.id);
    const report = await generateNetworkReport(currentUser.id, '30d');

    if (!stats || !report) {
        container.innerHTML = '<div class="error-state">ไม่สามารถโหลดข้อมูลได้</div>';
        return;
    }

    const html = `
        <div class="analytics-dashboard">
            <!-- Key Metrics -->
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-icon">👥</div>
                    <div class="metric-value">${stats.totalMembers}</div>
                    <div class="metric-label">สมาชิกทั้งหมด</div>
                </div>
                <div class="metric-card">
                    <div class="metric-icon">✅</div>
                    <div class="metric-value">${stats.activeMembers}</div>
                    <div class="metric-label">ใช้งานอยู่</div>
                </div>
                <div class="metric-card">
                    <div class="metric-icon">📈</div>
                    <div class="metric-value">${stats.conversionRate}%</div>
                    <div class="metric-label">อัตราการเติบโต</div>
                </div>
                <div class="metric-card">
                    <div class="metric-icon">🌳</div>
                    <div class="metric-value">${stats.networkDepth}</div>
                    <div class="metric-label">ระดับลึก</div>
                </div>
            </div>

            <!-- Growth Trends -->
            <div class="growth-section">
                <h3>การเติบโตของเครือข่าย</h3>
                <div class="growth-cards">
                    <div class="growth-card">
                        <div class="growth-label">สัปดาห์นี้</div>
                        <div class="growth-value">${report.trends.weekOverWeek.thisWeek}</div>
                        <div class="growth-change ${report.trends.weekOverWeek.growthRate >= 0 ? 'positive' : 'negative'}">
                            ${report.trends.weekOverWeek.growthRate >= 0 ? '↑' : '↓'} ${Math.abs(report.trends.weekOverWeek.growthRate)}%
                        </div>
                    </div>
                    <div class="growth-card">
                        <div class="growth-label">เดือนนี้</div>
                        <div class="growth-value">${report.trends.monthOverMonth.thisMonth}</div>
                        <div class="growth-change ${report.trends.monthOverMonth.growthRate >= 0 ? 'positive' : 'negative'}">
                            ${report.trends.monthOverMonth.growthRate >= 0 ? '↑' : '↓'} ${Math.abs(report.trends.monthOverMonth.growthRate)}%
                        </div>
                    </div>
                </div>
            </div>

            <!-- Top Performers -->
            <div class="performers-section">
                <h3>ผู้มีผลงานดี Top 5</h3>
                <div class="performers-list">
                    ${stats.topPerformers.map((performer, index) => `
                        <div class="performer-card">
                            <div class="performer-rank">#${index + 1}</div>
                            <div class="performer-avatar">
                                ${performer.avatar_url
                                    ? `<img src="${performer.avatar_url}" alt="${performer.username}">`
                                    : performer.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div class="performer-info">
                                <div class="performer-name">${performer.full_name || performer.username}</div>
                                <div class="performer-stats">${performer.total_invites} คนที่ชวน</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Generation Distribution -->
            <div class="generation-section">
                <h3>การกระจายตามชั้น</h3>
                <div class="generation-chart">
                    ${Object.entries(stats.generationCounts).map(([gen, count]) => {
                        const maxCount = Math.max(...Object.values(stats.generationCounts));
                        const percentage = (count / maxCount * 100);
                        return `
                            <div class="generation-bar">
                                <div class="generation-label">ชั้นที่ ${gen}</div>
                                <div class="generation-progress">
                                    <div class="generation-fill" style="width: ${percentage}%"></div>
                                </div>
                                <div class="generation-count">${count} คน</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
}
```

### 🌟 **Priority 3: Real-time Notifications**
Add notification system for network activities:

```javascript
// Notification system for network events
class NetworkNotifications {
    constructor() {
        this.eventTypes = [
            'new_member_joined',
            'member_made_purchase',
            'commission_earned',
            'achievement_unlocked'
        ];
    }

    subscribeToNetworkEvents(userId) {
        // WebSocket or Server-Sent Events
        // Real-time notifications
    }

    showNotification(type, data) {
        // Toast notifications
        // Push notifications
    }
}
```

### 🌟 **Priority 4: Mobile App Enhancement**
Progressive Web App features:

```javascript
// PWA capabilities
class PWAFeatures {
    enableOfflineSupport() {
        // Service Worker implementation
        // Cache network data
        // Offline functionality
    }

    addToHomeScreen() {
        // Install prompt
        // App icons and manifests
    }

    pushNotifications() {
        // Browser push notifications
        // Network event notifications
    }
}
```

### 🌟 **Priority 5: Commission Calculation System**
MLM compensation plan implementation:

#### **Complete Commission Engine**
```javascript
// Multi-level commission calculator
class CommissionEngine {
    constructor() {
        // Commission rates for each level (10%, 5%, 3%, 2%, 1%)
        this.commissionRates = {
            1: 0.10, // Direct referral: 10%
            2: 0.05, // 2nd generation: 5%
            3: 0.03, // 3rd generation: 3%
            4: 0.02, // 4th generation: 2%
            5: 0.01  // 5th generation: 1%
        };
        this.maxDepth = 5;
    }

    // Calculate and distribute commissions for a sale
    async calculateCommissions(saleAmount, sellerId, productId) {
        try {
            const usersResponse = await database.getAllUsers();
            const allUsers = usersResponse.data || usersResponse || [];

            // Find the seller
            const seller = allUsers.find(u => u.id === sellerId);
            if (!seller) {
                console.error('Seller not found');
                return { success: false, error: 'Seller not found' };
            }

            // Walk up the referral tree
            const commissions = [];
            let currentUser = seller;
            let level = 1;

            while (currentUser && level <= this.maxDepth) {
                // Find invitor (parent)
                const invitorId = currentUser.invitor_id || currentUser.invited_by;
                if (!invitorId) break;

                const invitor = allUsers.find(u => u.id === invitorId);
                if (!invitor) break;

                // Calculate commission for this level
                const rate = this.commissionRates[level] || 0;
                const commissionAmount = saleAmount * rate;

                commissions.push({
                    userId: invitor.id,
                    username: invitor.username,
                    full_name: invitor.full_name,
                    level: level,
                    rate: rate,
                    amount: commissionAmount,
                    saleAmount: saleAmount,
                    sellerId: sellerId,
                    productId: productId,
                    created_at: new Date().toISOString()
                });

                // Move up the tree
                currentUser = invitor;
                level++;
            }

            // Save commissions to database (if earnings table exists)
            const savedCommissions = [];
            for (const commission of commissions) {
                try {
                    // Save to earnings table
                    const result = await this.saveCommission(commission);
                    savedCommissions.push(result);

                    // Update user balance
                    await this.updateUserBalance(commission.userId, commission.amount);
                } catch (error) {
                    console.error(`Error saving commission for ${commission.userId}:`, error);
                }
            }

            return {
                success: true,
                totalCommissions: commissions.reduce((sum, c) => sum + c.amount, 0),
                commissions: savedCommissions,
                levelsProcessed: commissions.length
            };

        } catch (error) {
            console.error('Error calculating commissions:', error);
            return { success: false, error: error.message };
        }
    }

    // Save commission to earnings table
    async saveCommission(commission) {
        try {
            const earningId = `E${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

            // This would be a backend API call in production
            // For now, we'll return the commission object with ID
            return {
                id: earningId,
                ...commission,
                status: 'pending',
                paid_at: null
            };
        } catch (error) {
            console.error('Error saving commission:', error);
            throw error;
        }
    }

    // Update user balance (earnings)
    async updateUserBalance(userId, amount) {
        try {
            // This would update the user's earnings balance in database
            // Placeholder for backend implementation
            console.log(`Updated balance for user ${userId}: +${amount} THB`);
            return { success: true, userId, amount };
        } catch (error) {
            console.error('Error updating user balance:', error);
            throw error;
        }
    }

    // Calculate total commissions for a user
    async getUserCommissions(userId, startDate = null, endDate = null) {
        try {
            // Fetch all commissions for this user
            // This would be from earnings table in production
            const mockCommissions = []; // Placeholder

            let totalEarned = 0;
            let byLevel = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

            mockCommissions.forEach(commission => {
                // Filter by date if provided
                if (startDate && new Date(commission.created_at) < new Date(startDate)) return;
                if (endDate && new Date(commission.created_at) > new Date(endDate)) return;

                totalEarned += commission.amount;
                byLevel[commission.level] = (byLevel[commission.level] || 0) + commission.amount;
            });

            return {
                userId,
                totalEarned,
                commissionCount: mockCommissions.length,
                byLevel,
                period: {
                    start: startDate || 'all time',
                    end: endDate || 'now'
                }
            };
        } catch (error) {
            console.error('Error getting user commissions:', error);
            return null;
        }
    }

    // Process batch payouts
    async processPayouts(minAmount = 100) {
        try {
            // Get all pending commissions above minimum payout
            const usersResponse = await database.getAllUsers();
            const allUsers = usersResponse.data || usersResponse || [];

            const payouts = [];

            // Group commissions by user and calculate totals
            // This would query earnings table in production
            for (const user of allUsers) {
                const commissions = await this.getUserCommissions(user.id);

                if (commissions && commissions.totalEarned >= minAmount) {
                    payouts.push({
                        userId: user.id,
                        username: user.username,
                        amount: commissions.totalEarned,
                        commissionsCount: commissions.commissionCount,
                        status: 'processing',
                        processedAt: new Date().toISOString()
                    });
                }
            }

            // Process payouts (connect to payment gateway)
            const processedPayouts = [];
            for (const payout of payouts) {
                try {
                    // Process payment via payment gateway
                    const result = await this.processSinglePayout(payout);
                    processedPayouts.push(result);
                } catch (error) {
                    console.error(`Error processing payout for ${payout.userId}:`, error);
                    payout.status = 'failed';
                    payout.error = error.message;
                    processedPayouts.push(payout);
                }
            }

            return {
                success: true,
                totalPayouts: processedPayouts.length,
                totalAmount: processedPayouts.reduce((sum, p) => sum + p.amount, 0),
                successful: processedPayouts.filter(p => p.status === 'completed').length,
                failed: processedPayouts.filter(p => p.status === 'failed').length,
                payouts: processedPayouts
            };

        } catch (error) {
            console.error('Error processing payouts:', error);
            return { success: false, error: error.message };
        }
    }

    // Process single payout
    async processSinglePayout(payout) {
        try {
            // Connect to payment gateway API
            // This is a placeholder for actual payment integration
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call

            payout.status = 'completed';
            payout.completedAt = new Date().toISOString();
            payout.transactionId = `TXN${Date.now()}`;

            return payout;
        } catch (error) {
            throw error;
        }
    }

    // Generate commission report
    async generateCommissionReport(userId, period = '30d') {
        try {
            const periodDays = parseInt(period);
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - periodDays);

            const commissions = await this.getUserCommissions(userId, startDate.toISOString());

            const report = {
                userId,
                period,
                generatedAt: new Date().toISOString(),
                summary: {
                    totalEarned: commissions.totalEarned,
                    commissionCount: commissions.commissionCount,
                    averagePerCommission: commissions.commissionCount > 0
                        ? (commissions.totalEarned / commissions.commissionCount).toFixed(2)
                        : 0
                },
                byLevel: commissions.byLevel,
                topSources: [] // Would include top earning referrals
            };

            return report;
        } catch (error) {
            console.error('Error generating commission report:', error);
            return null;
        }
    }
}

// Initialize commission engine
const commissionEngine = new CommissionEngine();

// Example usage when a product is sold
async function handleProductSale(orderId, saleAmount, sellerId, productId) {
    // Calculate product fee (Fin Fee)
    const product = allProducts.find(p => p.id === productId);
    const finFeePercent = product?.fin_fee_percent || 2.0;
    const finFeeAmount = saleAmount * (finFeePercent / 100);
    const sellerReceive = saleAmount - finFeeAmount;

    // Calculate and distribute commissions from Fin Fee
    const commissionResult = await commissionEngine.calculateCommissions(
        finFeeAmount,
        sellerId,
        productId
    );

    console.log('Commission Distribution:', commissionResult);

    return {
        orderId,
        saleAmount,
        finFeeAmount,
        sellerReceive,
        commissions: commissionResult
    };
}
```

#### **Backend API Endpoints for Commissions**
```javascript
// Add these endpoints to server.js

// Get user commissions
app.get('/api/commissions/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        const { startDate, endDate } = req.query;

        const query = startDate && endDate
            ? `SELECT * FROM earnings WHERE user_id = ? AND created_at BETWEEN ? AND ? ORDER BY created_at DESC`
            : `SELECT * FROM earnings WHERE user_id = ? ORDER BY created_at DESC`;

        const params = startDate && endDate ? [userId, startDate, endDate] : [userId];
        const commissions = db.prepare(query).all(...params);

        const totalEarned = commissions.reduce((sum, c) => sum + (c.amount || 0), 0);

        res.json({
            success: true,
            totalEarned,
            count: commissions.length,
            commissions
        });
    } catch (error) {
        console.error('Error fetching commissions:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Request payout
app.post('/api/payout/request', async (req, res) => {
    try {
        const { userId, amount } = req.body;

        // Validate minimum payout amount
        if (amount < 100) {
            return res.json({
                success: false,
                message: 'จำนวนเงินขั้นต่ำในการถอนคือ 100 บาท'
            });
        }

        // Check user balance
        const earnings = db.prepare('SELECT SUM(amount) as total FROM earnings WHERE user_id = ? AND status = "pending"').get(userId);

        if (!earnings || earnings.total < amount) {
            return res.json({
                success: false,
                message: 'ยอดเงินไม่เพียงพอ'
            });
        }

        // Create payout request
        const payoutId = `PO${Date.now()}`;
        db.prepare(`
            INSERT INTO payouts (id, user_id, amount, status, requested_at)
            VALUES (?, ?, ?, 'pending', ?)
        `).run(payoutId, userId, amount, new Date().toISOString());

        res.json({
            success: true,
            message: 'คำขอถอนเงินสำเร็จ',
            payoutId
        });

    } catch (error) {
        console.error('Error requesting payout:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
```

---

## 🔒 **SECURITY CONSIDERATIONS**

### 🛡️ **Data Protection**
- Password hashing with bcrypt (salt rounds: 12)
- Input validation & sanitization
- SQL injection prevention with prepared statements
- File upload security (type & size validation)

### 🔐 **Access Control**
- User authentication required for all actions
- Admin-only endpoints protection
- Rate limiting for API calls
- CSRF protection for forms

### 🚨 **Network Security**
- Prevent referral loops/cycles
- Validate invite codes before processing
- Monitor for abuse patterns
- Implement user verification levels

---

## 📊 **PERFORMANCE OPTIMIZATION**

### 🔄 **Database Indexing**
```sql
-- Indexes for Network Queries
CREATE INDEX idx_users_invitor_id ON users(invitor_id);
CREATE INDEX idx_users_invite_code ON users(invite_code);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_is_active ON users(is_active);
```

### 🚀 **Caching Strategy**
- Network data caching in localStorage
- API response caching with timestamps
- Image lazy loading for profile pictures
- Progressive data loading for large networks

---

## 📞 **INTEGRATION POINTS**

### 🔗 **External APIs Ready**
- Payment Gateway Integration Points
- SMS OTP Services
- Email Notification Services
- Social Media Sharing APIs
- Analytics & Tracking Services

### 📊 **Data Export Formats**
- JSON for API responses
- CSV for data exports
- Excel for reports
- PDF for statements

---

---

## 🎓 **QUICK START GUIDE FOR CHATGPT**

### **To Implement Network Tree Visualization:**
1. Add `buildNetworkTree()` function to mobile/index.html
2. Add `renderNetworkVisualization()` function to mobile/index.html
3. Add `toggleNodeChildren()` helper function
4. Copy CSS styles to mobile/index.html `<style>` section
5. Create a new page in mobile interface called "Network Tree" (เครือข่าย)
6. Add navigation button to access the network tree page
7. Call `buildNetworkTree(currentUser.id)` when page loads
8. Display results with `renderNetworkVisualization(treeData, 'containerElementId')`

### **To Implement Analytics Dashboard:**
1. Add `calculateNetworkStats()` function to mobile/index.html
2. Add `generateNetworkReport()` helper function
3. Add `displayAnalyticsDashboard()` function
4. Add helper functions: `calculateWeekOverWeek()`, `calculateMonthOverMonth()`
5. Create analytics dashboard UI section in mobile interface
6. Call `displayAnalyticsDashboard('analyticsDashboard')` when user navigates to analytics

### **To Implement Commission System:**
1. Create `CommissionEngine` class in mobile/index.html
2. Add backend API endpoints to server.js:
   - `GET /api/commissions/:userId`
   - `POST /api/payout/request`
3. Create earnings table in database if not exists
4. Create payouts table in database
5. Integrate commission calculation with product sales flow
6. Update earnings page to show real commission data

### **Database Schema for Additional Tables:**

```sql
-- Earnings table for commissions
CREATE TABLE IF NOT EXISTS earnings (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL, -- 'commission', 'sale', 'bonus'
    amount REAL NOT NULL,
    level INTEGER, -- For commission level (1-5)
    source_user_id TEXT, -- Who generated this earning
    source_product_id TEXT,
    source_order_id TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'cancelled'
    created_at TEXT NOT NULL,
    paid_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Payouts table for withdrawal requests
CREATE TABLE IF NOT EXISTS payouts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    amount REAL NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    requested_at TEXT NOT NULL,
    processed_at TEXT,
    transaction_id TEXT,
    payment_method TEXT,
    notes TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_earnings_user_id ON earnings(user_id);
CREATE INDEX IF NOT EXISTS idx_earnings_status ON earnings(status);
CREATE INDEX IF NOT EXISTS idx_payouts_user_id ON payouts(user_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);
```

---

## 📋 **IMPLEMENTATION CHECKLIST**

### ✅ **Currently Implemented:**
- ✅ User registration with referral tracking
- ✅ **ACF (Auto-Connect Follower) System** - จัดสรร parent อัตโนมัติ (5×7 Structure)
- ✅ **Notification System** - แจ้งเตือน invitor และ parent
- ✅ **Special User Rules** - Anatta999 มี child ได้ 1 คน, อื่นๆ 5 คน
- ✅ Invite code generation and validation
- ✅ BIC (By Invite Code) & NIC (No Invite Code) Registration Types
- ✅ fingrow_dna table tracking (level, run_number, child_count)
- ✅ Basic referral display (list of invited users)
- ✅ Profile image upload system
- ✅ Product listing with Fin Fee system (1-7%)
- ✅ Earnings page UI (with mock data)
- ✅ Multi-currency support
- ✅ Responsive mobile interface
- ✅ **Mobile App Authentication** - Login guard, hide bottom nav on auth pages
- ✅ **Admin Panel Authentication** - Username/password login system
- ✅ Admin dashboard with Network DNA Database & Tree View

### 🔨 **To Be Implemented:**
- ⬜ Network tree visualization
- ⬜ Advanced analytics dashboard
- ⬜ Commission calculation engine
- ⬜ Real earnings data integration
- ⬜ Payout system with payment gateway
- ⬜ Real-time notifications
- ⬜ PWA features
- ⬜ Network performance metrics
- ⬜ Generation-based commission tracking
- ⬜ Top performers leaderboard

---

## 🔧 **KEY GLOBAL VARIABLES REFERENCE**

```javascript
// Current logged-in user object
let currentUser = null; // Contains: id, username, email, invite_code, invitor_id, etc.

// Database API wrapper
const database = {
    getUsers: () => fetch('/api/users').then(r => r.json()),
    getAllUsers: () => fetch('/api/users').then(r => r.json()),
    // ... other methods
};

// All products cache
let allProducts = []; // Array of product objects

// Current referrer data (for registration)
let currentReferrerData = null; // Contains verified referrer info

// Exchange rates for currency conversion
let exchangeRates = {
    THB: 1,
    USD: 0.028,
    EUR: 0.026,
    JPY: 4.09
};

// Fin Fee settings
const DEFAULT_FIN_FEE_PERCENT = 2.0;
const MIN_FIN_FEE_PERCENT = 1.0;
const MAX_FIN_FEE_PERCENT = 7.0;

// Commission rates by level
const COMMISSION_RATES = {
    1: 0.10, // 10% for direct referral
    2: 0.05, // 5% for 2nd generation
    3: 0.03, // 3% for 3rd generation
    4: 0.02, // 2% for 4th generation
    5: 0.01  // 1% for 5th generation
};

// Minimum withdrawal amount
const MIN_WITHDRAWAL_AMOUNT = 100; // THB
```

---

*📝 Document Version: 3.0*
*🔄 Last Updated: 2025-10-05*
*🤖 Generated with Claude Code*
*📧 For questions about implementation, refer to this blueprint*

---

## 📝 **VERSION HISTORY**

### Version 3.0 (2025-10-05)
**Major Updates:**
- ✅ **ACF System Implementation** - Auto-Connect Follower พร้อม 5×7 Structure
- ✅ **Notification System** - แจ้งเตือน invitor และ parent อัตโนมัติ
- ✅ **Special User Rules** - Anatta999 = 1 child, Others = 5 children
- ✅ **Mobile Authentication** - Login guard, bottom nav control
- ✅ **Admin Authentication** - Login system for admin panel
- ✅ **Database Schema Updates** - เพิ่ม parent_id, notifications table, fingrow_dna table
- ✅ **Registration Flow Update** - รองรับ BIC/NIC และ ACF allocation

### Version 2.0 (2025-10-02)
- Initial complete system documentation
- Basic referral system
- Product marketplace
- Admin dashboard

---

**Happy Coding! 🚀 ให้ ChatGPT ใช้เอกสารนี้เป็นแนวทางในการพัฒนาระบบเครือข่ายและ network tree visualization**
