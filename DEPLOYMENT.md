# 🚀 คู่มือการทำเว็บไซต์ให้ออนไลน์ (Deployment Guide)

## วิธีทำให้เว็บ Fingrow ออนไลน์ได้

มี 3 วิธีหลักในการทำให้เว็บไซต์ออนไลน์:

---

## 🔷 วิธีที่ 1: Vercel (แนะนำ - ฟรีและง่ายที่สุด)

### ขั้นตอน:

1. **สมัครบัญชี Vercel**
   - ไปที่ https://vercel.com
   - คลิก "Sign Up" และเข้าสู่ระบบด้วย GitHub

2. **เชื่อมต่อ Repository**
   - คลิก "Add New..." → "Project"
   - เลือก repository `ducklor-adv/Fingrow`
   - คลิก "Import"

3. **กำหนดค่า (Configuration)**
   - **Framework Preset**: เลือก "Other"
   - **Build Command**: ปล่อยว่างหรือใส่ `echo "No build needed"`
   - **Output Directory**: ปล่อยว่างหรือใส่ `.`
   - **Install Command**: `npm install`

4. **ตั้งค่า Environment Variables (ถ้าต้องการ)**
   - คลิก "Environment Variables"
   - เพิ่มตัวแปรตามไฟล์ `.env.example`

5. **Deploy**
   - คลิก "Deploy"
   - รอประมาณ 1-2 นาที
   - เว็บไซต์จะออนไลน์ที่ `https://fingrow.vercel.app` (หรือชื่อที่คุณตั้ง)

### ข้อดี:
- ✅ ฟรี
- ✅ Deploy อัตโนมัติทุกครั้งที่ push code
- ✅ มี HTTPS ให้อัตโนมัติ
- ✅ CDN ทั่วโลก (เร็ว)

### ข้อจำกัด:
- ⚠️ SQLite database จะถูกรีเซ็ตทุกครั้งที่ deploy ใหม่
- 💡 แนะนำให้ใช้ Supabase สำหรับฐานข้อมูลถาวร

---

## 🔷 วิธีที่ 2: Netlify

### ขั้นตอน:

1. **สมัครบัญชี Netlify**
   - ไปที่ https://netlify.com
   - คลิก "Sign Up" และเข้าสู่ระบบด้วย GitHub

2. **เชื่อมต่อ Repository**
   - คลิก "Add new site" → "Import an existing project"
   - เลือก GitHub และ repository `ducklor-adv/Fingrow`

3. **กำหนดค่า**
   - **Build command**: ปล่อยว่าง
   - **Publish directory**: `.`

4. **ตั้งค่า Netlify Functions (สำหรับ API)**
   - สร้างโฟลเดอร์ `netlify/functions/`
   - ย้าย API endpoints ไปอยู่ใน functions

5. **Deploy**
   - คลิก "Deploy site"
   - เว็บไซต์จะออนไลน์ที่ `https://fingrow.netlify.app`

---

## 🔷 วิธีที่ 3: Railway.app (แนะนำสำหรับ Full-Stack App)

### ขั้นตอน:

1. **สมัครบัญชี Railway**
   - ไปที่ https://railway.app
   - คลิก "Login with GitHub"

2. **สร้าง Project ใหม่**
   - คลิก "New Project"
   - เลือก "Deploy from GitHub repo"
   - เลือก repository `ducklor-adv/Fingrow`

3. **กำหนดค่า**
   - **Start Command**: `node server.js`
   - **Build Command**: ปล่อยว่าง
   
4. **เพิ่ม Environment Variables**
   - ไปที่แท็บ "Variables"
   - เพิ่มตัวแปรตามไฟล์ `.env.example`

5. **Deploy**
   - Railway จะ deploy อัตโนมัติ
   - เว็บไซต์จะออนไลน์ที่ `https://fingrow-production.up.railway.app`

### ข้อดี:
- ✅ รองรับ SQLite ได้ดีกว่า Vercel
- ✅ มี Persistent Storage
- ✅ Deploy อัตโนมัติ

### ข้อจำกัด:
- ⚠️ มีค่าใช้จ่ายหลังจากใช้ Free tier หมด ($5/เดือนฟรี)

---

## 🔷 วิธีที่ 4: GitHub Pages (สำหรับ Static Files เท่านั้น)

### ขั้นตอน:

1. **ไปที่ Repository Settings**
   - เปิด https://github.com/ducklor-adv/Fingrow/settings/pages

2. **เปิดใช้งาน GitHub Pages**
   - **Source**: เลือก "Deploy from a branch"
   - **Branch**: เลือก `main` และโฟลเดอร์ `/` (root)
   - คลิก "Save"

3. **รอ Deploy**
   - รอประมาณ 1-2 นาที
   - เว็บไซต์จะออนไลน์ที่ `https://ducklor-adv.github.io/Fingrow/`

### ข้อจำกัด:
- ⚠️ **ใช้ได้เฉพาะส่วน Frontend เท่านั้น** (HTML/CSS/JS)
- ⚠️ **API ไม่ทำงาน** (ต้องแยก deploy backend ที่อื่น)
- 💡 เหมาะสำหรับทดสอบ UI เท่านั้น

---

## 📊 สรุปเปรียบเทียบ

| Platform | ความยาก | ราคา | Backend | Database | แนะนำ |
|----------|---------|------|---------|----------|-------|
| **Vercel** | ⭐ ง่าย | ฟรี | ✅ | ⚠️ ชั่วคราว | ⭐⭐⭐⭐⭐ |
| **Netlify** | ⭐⭐ ปานกลาง | ฟรี | ⚠️ Functions | ⚠️ ชั่วคราว | ⭐⭐⭐⭐ |
| **Railway** | ⭐⭐ ปานกลาง | $5/เดือนฟรี | ✅ | ✅ ถาวร | ⭐⭐⭐⭐⭐ |
| **GitHub Pages** | ⭐ ง่าย | ฟรี | ❌ | ❌ | ⭐⭐ |

---

## 🎯 คำแนะนำ

### สำหรับการทดสอบเบื้องต้น:
→ **ใช้ Vercel** (ง่ายที่สุด, ฟรี)

### สำหรับการใช้งานจริง (Production):
→ **ใช้ Railway + Supabase**
  - Railway: สำหรับ server/API
  - Supabase: สำหรับฐานข้อมูล (ฟรี 500MB)

---

## 🔧 การตั้งค่า Supabase (แนะนำสำหรับ Production)

1. **สมัครบัญชี Supabase**
   - ไปที่ https://supabase.com
   - คลิก "Start your project"

2. **สร้าง Project ใหม่**
   - ตั้งชื่อ: "Fingrow"
   - เลือก Region: "Southeast Asia (Singapore)"
   - ตั้งรหัสผ่าน Database

3. **คัดลอก API Keys**
   - ไปที่ "Settings" → "API"
   - คัดลอก:
     - `Project URL` → ใส่ใน `SUPABASE_URL`
     - `anon/public key` → ใส่ใน `SUPABASE_ANON_KEY`

4. **สร้างตาราง (Tables)**
   - ไปที่ "Table Editor"
   - สร้างตาราง: `users`, `products`, `orders`, `reviews`, `favorites`
   - หรือรันสคริปต์ SQL ที่มีอยู่ในโปรเจค

5. **อัปเดต Environment Variables**
   - เพิ่ม `SUPABASE_URL` และ `SUPABASE_ANON_KEY` ใน Vercel/Railway

---

## ✅ เช็คลิสต์หลัง Deploy

- [ ] เว็บไซต์เปิดได้ (https://...)
- [ ] หน้า Landing Page แสดงผลถูกต้อง
- [ ] ปุ่ม "Admin Dashboard" และ "Mobile App" ทำงาน
- [ ] API endpoints ตอบกลับ (ถ้ามี backend)
- [ ] ภาพและ static files โหลดได้
- [ ] HTTPS ทำงานถูกต้อง
- [ ] Mobile responsive ทำงานดี

---

## 🆘 แก้ปัญหา (Troubleshooting)

### ปัญหา: เว็บแสดงหน้าขาว / Error 404
**วิธีแก้**:
- ตรวจสอบว่าชื่อไฟล์และโฟลเดอร์ถูกต้อง
- ตรวจสอบ `vercel.json` หรือ configuration file

### ปัญหา: API ไม่ทำงาน
**วิธีแก้**:
- ตรวจสอบ Environment Variables ว่าตั้งค่าครบ
- ดู Logs ใน Vercel/Railway Dashboard
- ตรวจสอบว่า `server.js` มีการ export module ถูกต้อง

### ปัญหา: Database รีเซ็ตทุกครั้งที่ deploy
**วิธีแก้**:
- ย้ายไปใช้ Supabase แทน SQLite
- หรือใช้ Railway ที่มี Persistent Storage

### ปัญหา: รูปภาพไม่แสดง
**วิธีแก้**:
- ตรวจสอบ path ของรูปภาพ (ต้องเป็น relative path)
- ตรวจสอบว่าไฟล์รูปอยู่ใน repository
- อาจต้องใช้ CDN หรือ Cloud Storage (Cloudinary, AWS S3)

---

## 📞 ติดต่อ / ขอความช่วยเหลือ

ถ้ามีปัญหาในการ deploy สามารถ:
1. เปิด Issue ใน GitHub Repository
2. ดู Logs ใน Platform Dashboard
3. อ่าน Documentation ของแต่ละ Platform

---

**สร้างเมื่อ**: 2024  
**อัปเดตล่าสุด**: ตามเวลา commit  
**ผู้ดูแล**: Fingrow Team

---

## 🎉 สำเร็จแล้ว!

เมื่อทำตามขั้นตอนเสร็จแล้ว เว็บไซต์ Fingrow ของคุณจะออนไลน์และเข้าถึงได้จากทั่วโลก! 🌍

**URL ตัวอย่าง**:
- Vercel: `https://fingrow.vercel.app`
- Netlify: `https://fingrow.netlify.app`  
- Railway: `https://fingrow-production.up.railway.app`
- GitHub Pages: `https://ducklor-adv.github.io/Fingrow/`
