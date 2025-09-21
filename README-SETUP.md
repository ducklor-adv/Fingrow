# Fingrow V3 - เริ่มใช้งานระบบฐานข้อมูลจริง

## 🚀 การตั้งค่าและเริ่มใช้งาน

### 1. เริ่มต้น API Server
```bash
node server.js
```

Server จะรันที่:
- **API Server**: http://localhost:3001
- **Mobile App**: http://localhost:3001/mobile/
- **Admin Panel**: http://localhost:3001/admin/

### 2. ทดสอบระบบ

#### 📱 ทดสอบการสมัครสมาชิก (Frontend)
1. เปิด http://localhost:3001/mobile/
2. คลิก "สมัครสมาชิก"
3. กรอกข้อมูล (ชื่อ, username, email, รหัสผ่าน)
4. สมัครสำเร็จ

#### 🔧 ทดสอบการจัดการผู้ใช้ (Admin)
1. เปิด http://localhost:3001/admin/
2. ไปหน้า "จัดการผู้ใช้งาน"
3. ดูรายการผู้ใช้ทั้งหมด (รวมผู้ใช้ที่สมัครใหม่)
4. สามารถลบผู้ใช้ได้

### 3. API Endpoints ที่พร้อมใช้

- **GET** `/api/users` - ดึงรายการผู้ใช้ทั้งหมด
- **POST** `/api/register` - สมัครสมาชิกใหม่
- **POST** `/api/login` - เข้าสู่ระบบ (ยังไม่ใช้ password validation)
- **DELETE** `/api/users/:userId` - ลบผู้ใช้

### 4. การเปลี่ยนแปลงสำคัญ

#### ✅ เปลี่ยนจาก MockDatabase เป็นฐานข้อมูลจริง
- **Frontend** (mobile/index.html): ใช้ `ApiClient` แทน `MockDatabase`
- **Admin** (admin/js/database-connector.js): เชื่อมต่อ API แทน mock data
- **Database**: ใช้ SQLite ใน `/data/fingrow.db`

#### ✅ ระบบการสมัครสมาชิก
- บันทึกลงฐานข้อมูลจริง
- สร้าง referral code อัตโนมัติ
- ตรวจสอบ username/email ซ้ำ

#### ✅ ระบบการจัดการผู้ใช้
- Admin สามารถดูผู้ใช้ทั้งหมดแบบ real-time
- สามารถลบผู้ใช้ได้
- ข้อมูลซิงค์ระหว่าง Frontend และ Admin

## 🔧 วิธีพัฒนาต่อ

1. **เพิ่ม API endpoints** ใหม่ใน `server.js`
2. **แก้ไข Frontend** ให้เรียกใช้ API ใหม่ใน `mobile/js/api-client.js`
3. **แก้ไข Admin** ให้เรียกใช้ API ใหม่ใน `admin/js/database-connector.js`

## 📊 สถานะปัจจุบัน

✅ **ใช้งานได้**: การสมัครสมาชิก, การจัดการผู้ใช้, การลบผู้ใช้
⏳ **ยังไม่เสร็จ**: การจัดการสินค้า, การสั่งซื้อ, ระบบ chat

**ระบบพร้อมใช้งานแล้ว! 🎉**