# Fingrow V3 - ระบบ Marketplace Documentation

## 📋 ภาพรวมระบบ

**Fingrow V3** เป็น Secondhand Marketplace ที่รองรับ Worldcoin Integration พร้อมระบบ MLM Referral แบบ 5-line/7-level

### 🏗️ สถาปัตยกรรมระบบ

```
D:\Google Drive\FingrowV3\
├── index.html              # Landing Page หลัก
├── admin/                  # Admin Dashboard (Desktop)
│   ├── index.html         # Dashboard หลัก
│   └── js/
│       ├── admin.js       # FingrowAdmin class
│       └── mockDatabase.js # MockDatabase class
├── mobile/                # Mobile Web App
│   └── index.html        # Mobile marketplace
└── node_modules/         # Expo React Native dependencies
```

## 🧩 Component หลัก

### 1. Landing Page (`index.html`)
- **Purpose**: หน้าแรกเลือกเข้าสู่ระบบ Admin หรือ Mobile
- **Features**:
  - Navigation ไป Admin Dashboard
  - Navigation ไป Mobile App
  - Project info display

### 2. Admin Dashboard (`admin/index.html`)
- **Purpose**: ระบบจัดการสำหรับ Admin (Desktop)
- **Key Classes**: `FingrowAdmin`
- **Features**:
  - Dashboard analytics
  - User management
  - Product management
  - Order tracking
  - MLM Referral system
  - WLD price tracking

### 3. Mobile App (`mobile/index.html`)
- **Purpose**: Marketplace สำหรับผู้ใช้ทั่วไป (Mobile-first)
- **Features**:
  - Product browsing/search
  - User authentication
  - Shopping cart
  - Order management
  - Real-time chat
  - Multi-currency (THB/WLD)

## 📊 ฐานข้อมูล Mock (MockDatabase)

### การจัดเก็บข้อมูล
```javascript
// ข้อมูลหลักจัดเก็บใน localStorage
localStorage.setItem('fingrow_users', JSON.stringify(users))
localStorage.setItem('fingrow_products', JSON.stringify(products))
localStorage.setItem('fingrow_orders', JSON.stringify(orders))
```

### 🧑‍💼 User Schema
```javascript
{
  id: number,
  username: string,
  email: string,
  password: string, // เก็บเป็น plain text (สำหรับ demo)
  full_name: string,
  phone: string,
  profile_image: string, // URL
  wallet_balance: number, // THB
  wld_balance: number, // WLD
  referral_code: string, // รหัสแนะนำตัวเอง
  referred_by: number, // ID ของผู้แนะนำ
  status: 'active' | 'inactive',

  // ที่อยู่แบบโครงสร้าง
  address_number: string,
  address_street: string,
  address_subdistrict: string,
  address_district: string,
  address_province: string,
  address_postal_code: string,

  // Legacy field (สำหรับ migration)
  shipping_address: string,

  created_at: string, // YYYY-MM-DD
  last_login: string  // YYYY-MM-DD
}
```

### 🛍️ Product Schema
```javascript
{
  id: number,
  title: string,
  description: string,
  price_thb: number,
  price_wld: number,
  seller_id: number,
  category: string, // 'เสื้อผ้า', 'อิเล็กทรอนิกส์', ฯลฯ
  condition: 'ใหม่' | 'ใกล้ใหม่' | 'ดี' | 'พอใช้',
  images: string[], // Array ของ URLs
  status: 'available' | 'sold' | 'pending',
  created_at: string,
  updated_at: string,
  location: string,
  shipping_included: boolean
}
```

### 📦 Order Schema
```javascript
{
  id: number,
  buyer_id: number,
  seller_id: number,
  product_id: number,
  quantity: number,
  total: number,
  currency: 'THB' | 'WLD',
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled',
  shipping_address: string,
  payment_method: string,
  created_at: string,
  updated_at: string
}
```

## 🔧 Main Classes & Methods

### 📱 MockDatabase Class
```javascript
class MockDatabase {
  // Core Methods
  constructor()
  initializeData()
  normalizeUsers(raw) // ⚠️ ป้องกัน users.find error

  // User Management
  async login(username, password)
  async register(userData)
  getUser(userId)
  updateUser(userId, userData)
  getUsers(page, limit, filters)

  // Product Management
  getProducts(page, limit, filters)
  addProduct(productData)
  updateProduct(productId, updates)
  deleteProduct(productId)

  // Order Management
  getOrders(page, limit, filters)
  createOrder(orderData)
  updateOrderStatus(orderId, status)

  // Analytics
  getDashboardStats()
  getTopSellers(limit)

  // Utility
  saveData()
  resetData()
}
```

### 🖥️ FingrowAdmin Class
```javascript
class FingrowAdmin {
  // Properties
  currentUser: object
  stats: object
  mockDB: MockDatabase

  // Core Methods
  init()
  normalizeUsers(raw) // ⚠️ ป้องกัน users.find error
  checkAuth()
  loadDashboardData()

  // UI Management
  updateDashboardStats()
  loadCharts()
  showSection(sectionId)

  // User Management
  loadUsers()
  editUser(userId)
  saveUserEdit()
  toggleUserStatus(userId)

  // Navigation
  showError(message)
  showSuccess(message)
  refreshDashboard()
}
```

## 🌍 API Integration

### Worldcoin (WLD) Price API
```javascript
// CoinGecko API integration
const API_URL = 'https://api.coingecko.com/api/v3/simple/price'
const params = '?ids=worldcoin-wld&vs_currencies=usd,thb&include_24hr_change=true'

// Update ทุก 5 นาที
setInterval(loadWLDPrice, 300000)
```

### Supabase Integration (พร้อมใช้งาน)
```javascript
// Environment variables (.env)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🔐 Authentication Flow

### Login Process
```javascript
async function handleLogin(username, password) {
  // 1. เรียก database.login()
  const result = await database.login(username, password)

  // 2. ตรวจสอบ normalizeUsers ป้องกัน error
  const users = database.getUsers()
  const normalizedUsers = normalizeUsers(users || [])
  const fullUser = normalizedUsers.find(u => u.id === result.user.id)

  // 3. จัดการ address migration
  // 4. เก็บ session ใน localStorage
  // 5. redirect ไปหน้าที่เหมาะสม
}
```

## 🔄 MLM Referral System

### โครงสร้างระบบ
- **5-line system**: แต่ละคนสามารถแนะนำได้ไม่จำกัด
- **7-level deep**: รับค่าคอมมิชชั่นลึกลงไป 7 ชั้น
- **Commission calculation**: คำนวณจากยอดขายของลูกทีม

### Implementation
```javascript
// การติดตาม referral
user.referral_code = generateReferralCode(user.username)
user.referred_by = referrerUserId

// การคำนวณคอมมิชชั่น (ในการพัฒนาต่อ)
function calculateCommission(userId, saleAmount, level) {
  const commissionRates = [0.1, 0.05, 0.03, 0.02, 0.01, 0.005, 0.002]
  return saleAmount * commissionRates[level - 1] || 0
}
```

## ⚠️ ปัญหาที่เคยเกิดและแก้ไขแล้ว

### 1. TypeError: users.find is not a function
**สาเหตุ**: ข้อมูล users จาก localStorage ไม่ได้เป็น Array เสมอ
**แก้ไข**: เพิ่มฟังก์ชัน `normalizeUsers()` ใน:
- `admin/js/mockDatabase.js`
- `admin/js/admin.js`
- `mobile/index.html`

### 2. Favicon 404 Error
**แก้ไข**: เพิ่ม SVG emoji favicon
```html
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌱</text></svg>">
```

## 🚀 การรัน Development Server

### Expo Development
```bash
npx expo start
# Server จะรันที่ port อัตโนมัติ (เช่น :51224)
# Metro bundler ที่ localhost:8081
```

### การเข้าถึง
- **Landing**: http://127.0.0.1:51224/
- **Admin**: http://127.0.0.1:51224/admin/
- **Mobile**: http://127.0.0.1:51224/mobile/

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Mobile**: PWA (Progressive Web App)
- **Database**: localStorage (Mock), Supabase (Production ready)
- **Charts**: Chart.js
- **Styling**: Tailwind CSS, Custom CSS
- **Icons**: Font Awesome
- **Development**: Expo CLI
- **APIs**: CoinGecko (WLD price), Worldcoin API

## 📈 Key Features Status

✅ **Completed**:
- User authentication & management
- Product listing & search
- Order management
- Dashboard analytics
- WLD price tracking
- Responsive mobile design
- MLM referral system structure

🚧 **In Progress**:
- Real-time chat system
- Payment integration
- Notification system
- Advanced MLM commission calculation

## 🔍 การ Debug และ Troubleshooting

### Console Logs
```javascript
// Debug logs มีอยู่ใน:
console.debug('[MockDatabase] normalizeUsers input:', data)
console.debug('[FingrowAdmin] normalizeUsers input:', data)
console.debug('[Mobile] normalizeUsers input:', data)
```

### Common Issues
1. **LocalStorage corruption**: ใช้ `database.resetData()` เพื่อรีเซ็ต
2. **Port conflicts**: Expo จะหา port อื่นอัตโนมัติ
3. **Users data type error**: `normalizeUsers()` จะจัดการให้

---

## 📝 Notes สำหรับ AI Assistant

เมื่อต้องการขอความช่วยเหลือจาก AI อื่น ให้แนบไฟล์นี้และบอกว่า:

1. **ระบบใช้ MockDatabase**: ข้อมูลเก็บใน localStorage
2. **มี normalizeUsers**: ป้องกัน users.find error
3. **โครงสร้างแบบ Multi-page**: landing → admin/mobile
4. **Development environment**: ใช้ Expo CLI
5. **Key Classes**: MockDatabase, FingrowAdmin
6. **หลีกเลี่ยงการสร้างไฟล์ใหม่**: ควรแก้ไขไฟล์เดิม

ระบบนี้ยังอยู่ในระหว่างการพัฒนา หากมีส่วนที่ไม่ชัดเจนหรือต้องการข้อมูลเพิ่มเติม สามารถดูโค้ดใน directory ที่กำหนดได้เลย