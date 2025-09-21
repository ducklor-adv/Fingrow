# Fingrow V3 - System Blueprint & Audit Plan

## 1. System Blueprint

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
│  │                  │      MockDatabase Class             │                 ││
│  │                  │  ┌─────────────┐ ┌─────────────┐    │                 ││
│  │                  │  │ Users       │ │ Products    │    │                 ││
│  │                  │  │ normalizeUsers│ │ normalize   │    │                 ││
│  │                  │  └─────────────┘ └─────────────┘    │                 ││
│  │                  │  ┌─────────────┐ ┌─────────────┐    │                 ││
│  │                  │  │ Orders      │ │ Analytics   │    │                 ││
│  │                  │  │ MLM Engine  │ │ WLD Price   │    │                 ││
│  │                  │  └─────────────┘ └─────────────┘    │                 ││
│  │                  └─────────────────────────────────────┘                 ││
│  │                                    │                                     ││
│  │                                    ▼                                     ││
│  │           ┌────────────────┐  ┌──────────────────┐  ┌─────────────────┐  ││
│  │ CURRENT:  │ localStorage   │  │ CoinGecko API    │  │ Expo Dev Server │  ││
│  │           │ fingrow_*      │  │ WLD Price        │  │ localhost:8081  │  ││
│  │           └────────────────┘  └──────────────────┘  └─────────────────┘  ││
│  │                                                                          ││
│  │ TARGET:   ┌────────────────┐  ┌──────────────────┐  ┌─────────────────┐  ││
│  │           │ Supabase       │  │ Worldcoin API    │  │ Production      │  ││
│  │           │ PostgreSQL     │  │ Auth & Payment   │  │ Server          │  ││
│  │           └────────────────┘  └──────────────────┘  └─────────────────┘  ││
│  └──────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘

Data Flow:
User -> Landing -> Admin/Mobile -> MockDatabase -> localStorage
             ↓
     CoinGecko API (WLD Price) -> 5min refresh
             ↓
     MLM Tree Traversal (7 levels) -> Commission Distribution
```

## 2. Data Model Specification

### Core Entities

```typescript
// Enhanced User Schema
interface User {
  id: number;                    // PRIMARY KEY
  username: string;              // UNIQUE, NOT NULL, 3-20 chars
  email: string;                 // UNIQUE, NOT NULL, valid email
  password_hash: string;         // bcrypt hash, NOT NULL
  full_name: string;             // NOT NULL, 2-100 chars
  phone: string;                 // 10-15 digits, optional
  profile_image: string | null;  // URL, optional

  // Financial
  wallet_balance: number;        // DEFAULT 0, >= 0
  wld_balance: number;           // DEFAULT 0, >= 0

  // Referral System
  referral_code: string;         // UNIQUE, 6-char alphanumeric
  referred_by: number | null;    // FK to users.id

  // Address (Structured)
  address_number: string | null;
  address_street: string | null;
  address_subdistrict: string | null;
  address_district: string | null;
  address_province: string | null;
  address_postal_code: string | null;

  // Legacy (for migration)
  shipping_address: string | null;

  // Status & Timestamps
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;            // ISO 8601
  last_login: string | null;     // ISO 8601
}

// Enhanced Product Schema
interface Product {
  id: number;                    // PRIMARY KEY
  title: string;                 // NOT NULL, 5-200 chars
  description: string;           // NOT NULL, 10-2000 chars
  price_thb: number;             // NOT NULL, > 0
  price_wld: number;             // NOT NULL, > 0, calculated
  seller_id: number;             // FK to users.id, NOT NULL

  // Classification
  category: string;              // NOT NULL, predefined list
  condition: 'ใหม่' | 'ใกล้ใหม่' | 'ดี' | 'พอใช้';

  // Media & Details
  images: string[];              // Array of URLs, min 1
  location: string;              // NOT NULL
  shipping_included: boolean;    // DEFAULT false

  // Status & Timestamps
  status: 'available' | 'sold' | 'pending' | 'hidden';
  created_at: string;            // ISO 8601
  updated_at: string;            // ISO 8601
}

// Enhanced Order Schema
interface Order {
  id: number;                    // PRIMARY KEY
  buyer_id: number;              // FK to users.id, NOT NULL
  seller_id: number;             // FK to users.id, NOT NULL
  product_id: number;            // FK to products.id, NOT NULL

  // Order Details
  quantity: number;              // DEFAULT 1, > 0
  total: number;                 // NOT NULL, > 0
  currency: 'THB' | 'WLD';       // NOT NULL

  // Status & Processing
  status: 'pending' | 'confirmed' | 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'disputed';
  payment_method: string;        // NOT NULL
  shipping_address: string;      // NOT NULL
  tracking_number: string | null;

  // Timestamps
  created_at: string;            // ISO 8601
  updated_at: string;            // ISO 8601
  shipped_at: string | null;     // ISO 8601
  delivered_at: string | null;   // ISO 8601
}

// Commission Record
interface Commission {
  id: number;                    // PRIMARY KEY
  order_id: number;              // FK to orders.id, NOT NULL
  referrer_id: number;           // FK to users.id, NOT NULL
  level: number;                 // 1-7, NOT NULL
  amount: number;                // > 0, NOT NULL
  currency: 'THB' | 'WLD';       // NOT NULL
  status: 'pending' | 'paid' | 'cancelled';
  created_at: string;            // ISO 8601
}
```

### Normalization Functions

```javascript
// Enhanced normalization with validation
function normalizeUsers(raw) {
  const result = _normalizeToArray(raw);
  return result.map(user => ({
    ...user,
    id: parseInt(user.id) || 0,
    wallet_balance: parseFloat(user.wallet_balance) || 0,
    wld_balance: parseFloat(user.wld_balance) || 0,
    status: ['active', 'inactive', 'suspended'].includes(user.status) ? user.status : 'active'
  }));
}

function normalizeProducts(raw) {
  const result = _normalizeToArray(raw);
  return result.map(product => ({
    ...product,
    id: parseInt(product.id) || 0,
    price_thb: parseFloat(product.price_thb) || 0,
    price_wld: parseFloat(product.price_wld) || 0,
    seller_id: parseInt(product.seller_id) || 0,
    images: Array.isArray(product.images) ? product.images : []
  }));
}

function normalizeOrders(raw) {
  const result = _normalizeToArray(raw);
  return result.map(order => ({
    ...order,
    id: parseInt(order.id) || 0,
    buyer_id: parseInt(order.buyer_id) || 0,
    seller_id: parseInt(order.seller_id) || 0,
    product_id: parseInt(order.product_id) || 0,
    total: parseFloat(order.total) || 0,
    quantity: parseInt(order.quantity) || 1
  }));
}

function _normalizeToArray(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      return _normalizeToArray(JSON.parse(raw));
    } catch {
      return [];
    }
  }
  if (raw && typeof raw === 'object') {
    if (Array.isArray(raw.data)) return raw.data;
    const values = Object.values(raw);
    if (values.length > 0 && typeof values[0] === 'object') return values;
  }
  return [];
}
```

## 3. State Machines

### Order State Machine
```
┌─────────┐   confirm    ┌───────────┐   pay      ┌──────┐
│ pending ├─────────────►│ confirmed ├───────────►│ paid │
└────┬────┘              └─────┬─────┘            └───┬──┘
     │                         │                      │
     │cancel                   │cancel                │ship
     ▼                         ▼                      ▼
┌───────────┐              ┌───────────┐         ┌─────────┐
│ cancelled │              │ cancelled │         │ shipped │
└───────────┘              └───────────┘         └────┬────┘
                                                      │
                                              deliver │ │ dispute
                                                      ▼ ▼
                                               ┌──────────┐ ┌──────────┐
                                               │delivered │ │ disputed │
                                               └──────────┘ └──────────┘
```

### Authentication State Machine
```
┌─────────────┐  login   ┌────────────┐  success  ┌───────────┐
│ logged_out  ├─────────►│ logging_in ├──────────►│ logged_in │
└─────────────┘          └─────┬──────┘           └─────┬─────┘
      ▲                        │                        │
      │                        │fail                    │
      │                        ▼                        │timeout/logout
      │                 ┌─────────────┐                 │
      └─────────────────│ login_error │◄────────────────┘
                        └─────────────┘
```

## 4. Core Flow Diagrams

### Login Flow
```
User Input → Validation → MockDatabase.login() → normalizeUsers()
    ↓
Session Creation → localStorage persistence → Address Migration
    ↓
UI Update → Redirect to Dashboard/Marketplace
```

### Product Management Flow
```
Product Input → Validation → Price Calculation (THB ↔ WLD)
    ↓
Image Upload → MockDatabase.addProduct() → normalizeProducts()
    ↓
Update UI → Refresh Product List → Cache WLD Rate
```

### Checkout & Commission Flow
```
Order Creation → Payment Processing → Order Status Update
    ↓
MLM Tree Traversal (7 levels) → Commission Calculation
    ↓
Commission Distribution → Wallet Updates → Notification Queue
```

### Referral Attachment Flow
```
Registration → Validate Referral Code → Find Referrer
    ↓
Check Cycle Prevention → Attach to MLM Tree → Generate Own Code
```

## 5. Integration Specifications

### WLD Price API Integration
```javascript
class WLDPriceManager {
  constructor() {
    this.baseURL = 'https://api.coingecko.com/api/v3/simple/price';
    this.params = '?ids=worldcoin-wld&vs_currencies=usd,thb&include_24hr_change=true';
    this.cache = { price: null, timestamp: null, ttl: 5 * 60 * 1000 }; // 5 min
    this.retryConfig = { attempts: 3, backoff: 1000 };
  }

  async getCurrentPrice(forceFresh = false) {
    if (!forceFresh && this._isValidCache()) {
      return this.cache.price;
    }

    try {
      const price = await this._fetchWithRetry();
      this._updateCache(price);
      return price;
    } catch (error) {
      console.error('WLD price fetch failed:', error);
      return this.cache.price || { thb: 100, usd: 3.0 }; // fallback
    }
  }

  toTHB(wldAmount) {
    const rate = this.cache.price?.thb || 100;
    return parseFloat((wldAmount * rate).toFixed(2));
  }

  toWLD(thbAmount) {
    const rate = this.cache.price?.thb || 100;
    return parseFloat((thbAmount / rate).toFixed(6));
  }

  _isValidCache() {
    return this.cache.price && (Date.now() - this.cache.timestamp) < this.cache.ttl;
  }

  async _fetchWithRetry() {
    for (let i = 0; i < this.retryConfig.attempts; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(`${this.baseURL}${this.params}`, {
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        return data['worldcoin-wld'];
      } catch (error) {
        if (i === this.retryConfig.attempts - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, this.retryConfig.backoff * (i + 1)));
      }
    }
  }

  _updateCache(price) {
    this.cache = {
      price,
      timestamp: Date.now(),
      ttl: this.cache.ttl
    };
  }
}
```

### Supabase Migration Plan

#### Phase 1: Table DDL
```sql
-- Users table
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL CHECK (length(username) BETWEEN 3 AND 20),
  email TEXT UNIQUE NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL CHECK (length(full_name) BETWEEN 2 AND 100),
  phone TEXT CHECK (phone ~* '^[0-9]{10,15}$'),
  profile_image TEXT,
  wallet_balance DECIMAL(10,2) DEFAULT 0 CHECK (wallet_balance >= 0),
  wld_balance DECIMAL(15,6) DEFAULT 0 CHECK (wld_balance >= 0),
  referral_code TEXT UNIQUE NOT NULL,
  referred_by BIGINT REFERENCES users(id),
  address_number TEXT,
  address_street TEXT,
  address_subdistrict TEXT,
  address_district TEXT,
  address_province TEXT,
  address_postal_code TEXT,
  shipping_address TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

-- Products table
CREATE TABLE products (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 5 AND 200),
  description TEXT NOT NULL CHECK (length(description) BETWEEN 10 AND 2000),
  price_thb DECIMAL(10,2) NOT NULL CHECK (price_thb > 0),
  price_wld DECIMAL(15,6) NOT NULL CHECK (price_wld > 0),
  seller_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  condition TEXT CHECK (condition IN ('ใหม่', 'ใกล้ใหม่', 'ดี', 'พอใช้')),
  images JSONB NOT NULL DEFAULT '[]',
  location TEXT NOT NULL,
  shipping_included BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'sold', 'pending', 'hidden')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders table
CREATE TABLE orders (
  id BIGSERIAL PRIMARY KEY,
  buyer_id BIGINT NOT NULL REFERENCES users(id),
  seller_id BIGINT NOT NULL REFERENCES users(id),
  product_id BIGINT NOT NULL REFERENCES products(id),
  quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
  total DECIMAL(10,2) NOT NULL CHECK (total > 0),
  currency TEXT NOT NULL CHECK (currency IN ('THB', 'WLD')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'paid', 'shipped', 'delivered', 'cancelled', 'disputed')),
  payment_method TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  tracking_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ
);

-- Commissions table
CREATE TABLE commissions (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id),
  referrer_id BIGINT NOT NULL REFERENCES users(id),
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 7),
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL CHECK (currency IN ('THB', 'WLD')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Phase 2: RLS Policies
```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid()::text = id::text);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid()::text = id::text);

-- Products policies
CREATE POLICY "Anyone can view available products" ON products FOR SELECT USING (status = 'available');
CREATE POLICY "Users can manage own products" ON products FOR ALL USING (auth.uid()::text = seller_id::text);

-- Orders policies
CREATE POLICY "Users can view own orders" ON orders FOR SELECT USING (
  auth.uid()::text = buyer_id::text OR auth.uid()::text = seller_id::text
);
```

#### Phase 3: Migration Steps
1. Export localStorage data using `MockDatabase.exportData()`
2. Transform data format using migration scripts
3. Import to Supabase using batch inserts
4. Update client code to use Supabase client
5. Test data integrity and user flows

## 6. Security & Reliability Checklist

### Authentication & Authorization
- [ ] Hash passwords using bcryptjs (minimum 12 rounds)
- [ ] Implement secure session management with TTL
- [ ] Add rate limiting for login attempts (5 attempts per 15 minutes)
- [ ] Validate all user inputs on both client and server side
- [ ] Implement CSRF protection for state-changing operations

### Data Protection
- [ ] Sanitize all user-generated content
- [ ] Validate file uploads (type, size, content)
- [ ] Implement proper error handling without information leakage
- [ ] Add audit logging for sensitive operations
- [ ] Encrypt sensitive data in localStorage

### System Reliability
- [ ] Implement circuit breaker for external API calls
- [ ] Add graceful degradation for WLD price failures
- [ ] Handle localStorage corruption with automatic recovery
- [ ] Implement retry mechanisms with exponential backoff
- [ ] Add health checks for critical system components

### Code Security Patches

#### Password Hashing Implementation
```javascript
// Add to mockDatabase.js
async _hashPassword(password) {
  // For demo: simple hash. Production: use bcryptjs
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'fingrow_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async _verifyPassword(password, hash) {
  const computed = await this._hashPassword(password);
  return computed === hash;
}

// Update login method
async login(username, password) {
  const normalizedUsers = this.normalizeUsers(this.users || []);
  const user = normalizedUsers.find(u =>
    (u.username === username || u.email === username)
  );

  if (!user || user.status !== 'active') {
    return { success: false, message: 'Invalid credentials or inactive account' };
  }

  // Check if password is already hashed
  const isValidPassword = user.password.length === 64
    ? await this._verifyPassword(password, user.password)
    : user.password === password; // Legacy support

  if (!isValidPassword) {
    return { success: false, message: 'Invalid credentials' };
  }

  // Update last login
  user.last_login = new Date().toISOString().split('T')[0];
  this.updateUser(user.id, { last_login: user.last_login });

  return { success: true, user: { ...user, password: undefined } }; // Remove password from response
}
```

#### Session Management
```javascript
class SessionManager {
  constructor() {
    this.sessionKey = 'fingrow_session';
    this.ttl = 24 * 60 * 60 * 1000; // 24 hours
  }

  createSession(user) {
    const session = {
      userId: user.id,
      username: user.username,
      role: user.role || 'user',
      createdAt: Date.now(),
      expiresAt: Date.now() + this.ttl
    };

    localStorage.setItem(this.sessionKey, JSON.stringify(session));
    return session;
  }

  getSession() {
    try {
      const sessionData = localStorage.getItem(this.sessionKey);
      if (!sessionData) return null;

      const session = JSON.parse(sessionData);
      if (Date.now() > session.expiresAt) {
        this.clearSession();
        return null;
      }

      return session;
    } catch (error) {
      console.error('Session parsing error:', error);
      this.clearSession();
      return null;
    }
  }

  clearSession() {
    localStorage.removeItem(this.sessionKey);
  }

  isAuthenticated() {
    return this.getSession() !== null;
  }
}
```

## 7. MLM Commission Algorithm

```javascript
class MLMCommissionEngine {
  constructor(database) {
    this.db = database;
    this.commissionRates = [0.1, 0.05, 0.03, 0.02, 0.01, 0.005, 0.002]; // 7 levels
    this.maxDepth = 7;
  }

  async calculateCommissions(orderId, saleAmount, currency = 'THB') {
    try {
      const order = await this.db.getOrder(orderId);
      if (!order) throw new Error('Order not found');

      const seller = await this.db.getUser(order.seller_id);
      if (!seller || !seller.referred_by) {
        return { commissions: [], total: 0 }; // No referral chain
      }

      const commissions = [];
      const visited = new Set(); // Prevent cycles
      let currentReferrerId = seller.referred_by;
      let level = 1;

      while (currentReferrerId && level <= this.maxDepth) {
        // Cycle detection
        if (visited.has(currentReferrerId)) {
          console.warn(`MLM cycle detected at user ${currentReferrerId}, breaking chain`);
          break;
        }
        visited.add(currentReferrerId);

        const referrer = await this.db.getUser(currentReferrerId);
        if (!referrer || referrer.status !== 'active') {
          break; // Skip inactive users
        }

        const rate = this.commissionRates[level - 1];
        const amount = parseFloat((saleAmount * rate).toFixed(2));

        if (amount > 0) {
          commissions.push({
            orderId,
            referrerId: currentReferrerId,
            referrerUsername: referrer.username,
            level,
            amount,
            currency,
            rate
          });
        }

        currentReferrerId = referrer.referred_by;
        level++;
      }

      const totalCommission = commissions.reduce((sum, c) => sum + c.amount, 0);

      return {
        commissions,
        total: totalCommission,
        levels: commissions.length
      };
    } catch (error) {
      console.error('Commission calculation error:', error);
      return { commissions: [], total: 0, error: error.message };
    }
  }

  async distributeCommissions(orderId) {
    const order = await this.db.getOrder(orderId);
    const result = await this.calculateCommissions(orderId, order.total, order.currency);

    const promises = result.commissions.map(async (commission) => {
      // Create commission record
      await this.db.createCommission({
        order_id: orderId,
        referrer_id: commission.referrerId,
        level: commission.level,
        amount: commission.amount,
        currency: commission.currency,
        status: 'pending'
      });

      // Update referrer wallet
      const referrer = await this.db.getUser(commission.referrerId);
      const balanceField = commission.currency === 'WLD' ? 'wld_balance' : 'wallet_balance';
      const newBalance = (referrer[balanceField] || 0) + commission.amount;

      await this.db.updateUser(commission.referrerId, {
        [balanceField]: newBalance
      });

      return commission;
    });

    const distributedCommissions = await Promise.all(promises);

    console.log(`💰 Distributed ${result.total} ${order.currency} in commissions across ${result.levels} levels for order ${orderId}`);

    return {
      ...result,
      commissions: distributedCommissions
    };
  }

  // Utility: Get referral tree (for admin dashboard)
  async getReferralTree(userId, maxDepth = 3) {
    const tree = { user: await this.db.getUser(userId), children: [] };
    const visited = new Set([userId]);

    const buildBranch = async (parentId, currentDepth) => {
      if (currentDepth >= maxDepth) return [];

      const normalizedUsers = this.db.normalizeUsers(this.db.users || []);
      const directReferrals = normalizedUsers.filter(u =>
        u.referred_by === parentId && !visited.has(u.id)
      );

      const branches = await Promise.all(
        directReferrals.map(async (user) => {
          visited.add(user.id);
          return {
            user,
            children: await buildBranch(user.id, currentDepth + 1)
          };
        })
      );

      return branches;
    };

    tree.children = await buildBranch(userId, 0);
    return tree;
  }
}
```

## 8. Code Audit & Patches

### Critical Issues Found

#### 1. Plain Text Password Storage
**Location**: `mockDatabase.js` - login method
**Risk**: High - Credentials easily compromised
**Patch**: Implement password hashing (see Section 6)

#### 2. Fragile Array Operations
**Location**: Multiple files - `.find()` operations
**Risk**: Medium - Runtime errors on data corruption
**Status**: ✅ Fixed with `normalizeUsers/Products/Orders`

#### 3. Missing Input Validation
**Location**: All user input handlers
**Risk**: High - XSS, injection attacks
**Patch**:
```javascript
// Add to mockDatabase.js
_validateUserInput(userData) {
  const errors = [];

  if (!userData.username || userData.username.length < 3 || userData.username.length > 20) {
    errors.push('Username must be 3-20 characters');
  }

  if (!userData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
    errors.push('Invalid email format');
  }

  if (!userData.password || userData.password.length < 6) {
    errors.push('Password must be at least 6 characters');
  }

  // Sanitize strings
  ['username', 'email', 'full_name'].forEach(field => {
    if (userData[field]) {
      userData[field] = userData[field].replace(/[<>\"']/g, ''); // Basic XSS prevention
    }
  });

  return { isValid: errors.length === 0, errors, sanitizedData: userData };
}

// Update register method
async register(userData) {
  const validation = this._validateUserInput(userData);
  if (!validation.isValid) {
    return { success: false, message: validation.errors.join(', ') };
  }

  // Continue with existing logic using validation.sanitizedData
}
```

#### 4. Missing Error Boundaries
**Location**: All async operations
**Risk**: Medium - Poor user experience on failures
**Patch**:
```javascript
// Global error handler
window.addEventListener('unhandledrejection', event => {
  console.error('Unhandled promise rejection:', event.reason);
  showNotification('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง', 'error');
  event.preventDefault();
});

// Wrapper for async operations
async function safeAsync(operation, fallback = null) {
  try {
    return await operation();
  } catch (error) {
    console.error('Async operation failed:', error);
    return fallback;
  }
}
```

### handleLogin() Improvements
```javascript
// Enhanced handleLogin with security
async function handleLogin(username, password) {
  try {
    // Rate limiting check
    const attempts = parseInt(localStorage.getItem('login_attempts') || '0');
    const lastAttempt = parseInt(localStorage.getItem('last_login_attempt') || '0');
    const now = Date.now();

    if (attempts >= 5 && (now - lastAttempt) < 15 * 60 * 1000) {
      throw new Error('Too many login attempts. Please try again in 15 minutes.');
    }

    // Input validation
    if (!username || !password) {
      throw new Error('Username and password are required');
    }

    // Sanitize input
    username = username.trim().substring(0, 50);

    const result = await database.login(username, password);

    if (result.success) {
      // Reset login attempts
      localStorage.removeItem('login_attempts');
      localStorage.removeItem('last_login_attempt');

      // Create session
      const sessionManager = new SessionManager();
      sessionManager.createSession(result.user);

      // Enhanced user data loading with error handling
      if (typeof database.getUsers === 'function') {
        try {
          const users = database.getUsers();
          const normalizedUsers = normalizeUsers(users || []);
          const fullUser = normalizedUsers.find(u => u.id === result.user.id);

          if (fullUser) {
            // Address migration logic
            await migrateUserAddress(fullUser);
            // Store enhanced user data
            sessionStorage.setItem('current_user', JSON.stringify(fullUser));
          }
        } catch (error) {
          console.warn('Error loading full user data:', error);
        }
      }

      showNotification('เข้าสู่ระบบสำเร็จ', 'success');
      redirectToDashboard();
    } else {
      // Increment failed attempts
      localStorage.setItem('login_attempts', (attempts + 1).toString());
      localStorage.setItem('last_login_attempt', now.toString());

      throw new Error(result.message || 'Invalid credentials');
    }
  } catch (error) {
    console.error('Login error:', error);
    showNotification(error.message, 'error');
  }
}
```

## 9. Admin Dashboard UX Fixes

### Loading States & Skeletons
```javascript
// Loading skeleton component
function createLoadingSkeleton(type = 'card') {
  const skeletons = {
    card: `
      <div class="animate-pulse bg-gray-800 rounded-lg p-6">
        <div class="h-4 bg-gray-700 rounded w-3/4 mb-4"></div>
        <div class="h-8 bg-gray-700 rounded w-1/2 mb-2"></div>
        <div class="h-3 bg-gray-700 rounded w-1/3"></div>
      </div>
    `,
    table: `
      <tr class="animate-pulse">
        <td class="py-4"><div class="h-4 bg-gray-700 rounded w-24"></div></td>
        <td class="py-4"><div class="h-4 bg-gray-700 rounded w-32"></div></td>
        <td class="py-4"><div class="h-4 bg-gray-700 rounded w-20"></div></td>
      </tr>
    `,
    chart: `
      <div class="animate-pulse bg-gray-800 rounded-lg p-6 h-80">
        <div class="h-4 bg-gray-700 rounded w-1/3 mb-6"></div>
        <div class="h-64 bg-gray-700 rounded"></div>
      </div>
    `
  };

  return skeletons[type] || skeletons.card;
}

// Enhanced loading states in admin.js
async loadUsers() {
  const container = document.getElementById('users-container');

  // Show loading skeleton
  container.innerHTML = Array(5).fill().map(() => createLoadingSkeleton('table')).join('');

  try {
    const users = await this.mockDB.getUsers();
    // Render actual data
    this.renderUsers(users);
  } catch (error) {
    // Show error state
    container.innerHTML = `
      <div class="text-center py-12">
        <i class="fas fa-exclamation-triangle text-yellow-500 text-4xl mb-4"></i>
        <h3 class="text-xl text-white mb-2">ไม่สามารถโหลดข้อมูลได้</h3>
        <p class="text-gray-400 mb-4">${error.message}</p>
        <button onclick="admin.loadUsers()" class="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded">
          ลองอีกครั้ง
        </button>
      </div>
    `;
  }
}
```

### Notification System
```javascript
class NotificationManager {
  constructor() {
    this.container = this.createContainer();
    this.notifications = new Map();
  }

  createContainer() {
    const container = document.createElement('div');
    container.id = 'notification-container';
    container.className = 'fixed top-4 right-4 z-50 space-y-2';
    document.body.appendChild(container);
    return container;
  }

  show(message, type = 'info', duration = 4000) {
    const id = Date.now().toString();
    const notification = this.createNotification(id, message, type);

    this.container.appendChild(notification);
    this.notifications.set(id, notification);

    // Auto remove
    setTimeout(() => this.remove(id), duration);

    // Slide in animation
    requestAnimationFrame(() => {
      notification.style.transform = 'translateX(0)';
      notification.style.opacity = '1';
    });

    return id;
  }

  createNotification(id, message, type) {
    const colors = {
      success: 'bg-emerald-600',
      error: 'bg-red-600',
      warning: 'bg-yellow-600',
      info: 'bg-blue-600'
    };

    const icons = {
      success: 'fa-check-circle',
      error: 'fa-exclamation-circle',
      warning: 'fa-exclamation-triangle',
      info: 'fa-info-circle'
    };

    const div = document.createElement('div');
    div.className = `${colors[type]} text-white px-6 py-4 rounded-lg shadow-lg transform translate-x-full opacity-0 transition-all duration-300 max-w-sm`;
    div.innerHTML = `
      <div class="flex items-center">
        <i class="fas ${icons[type]} mr-3"></i>
        <span class="flex-1">${message}</span>
        <button onclick="notifications.remove('${id}')" class="ml-3 text-white hover:text-gray-200">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;

    return div;
  }

  remove(id) {
    const notification = this.notifications.get(id);
    if (!notification) return;

    notification.style.transform = 'translateX(full)';
    notification.style.opacity = '0';

    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
      this.notifications.delete(id);
    }, 300);
  }

  clear() {
    this.notifications.forEach((_, id) => this.remove(id));
  }
}

// Global instance
const notifications = new NotificationManager();

// Update existing show functions
function showSuccess(message) {
  notifications.show(message, 'success');
}

function showError(message) {
  notifications.show(message, 'error');
}
```

### Enhanced Pagination
```javascript
class DataTable {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.options = {
      pageSize: 10,
      searchable: true,
      sortable: true,
      ...options
    };
    this.data = [];
    this.filteredData = [];
    this.currentPage = 1;
    this.sortColumn = null;
    this.sortDirection = 'asc';
    this.searchTerm = '';
  }

  setData(data) {
    this.data = data;
    this.filteredData = [...data];
    this.currentPage = 1;
    this.render();
  }

  search(term) {
    this.searchTerm = term.toLowerCase();
    this.filteredData = this.data.filter(item =>
      Object.values(item).some(value =>
        String(value).toLowerCase().includes(this.searchTerm)
      )
    );
    this.currentPage = 1;
    this.render();
  }

  sort(column) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.filteredData.sort((a, b) => {
      const aVal = a[column];
      const bVal = b[column];
      const direction = this.sortDirection === 'asc' ? 1 : -1;

      return aVal > bVal ? direction : aVal < bVal ? -direction : 0;
    });

    this.render();
  }

  goToPage(page) {
    const totalPages = Math.ceil(this.filteredData.length / this.options.pageSize);
    this.currentPage = Math.max(1, Math.min(page, totalPages));
    this.render();
  }

  render() {
    const startIndex = (this.currentPage - 1) * this.options.pageSize;
    const endIndex = startIndex + this.options.pageSize;
    const pageData = this.filteredData.slice(startIndex, endIndex);
    const totalPages = Math.ceil(this.filteredData.length / this.options.pageSize);

    // Render table content
    this.renderTable(pageData);

    // Render pagination
    this.renderPagination(totalPages);
  }

  renderPagination(totalPages) {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;

    const pages = [];
    const current = this.currentPage;

    // Previous button
    pages.push(`
      <button ${current === 1 ? 'disabled' : ''}
              onclick="dataTable.goToPage(${current - 1})"
              class="px-3 py-2 mx-1 rounded ${current === 1 ? 'bg-gray-700 text-gray-500' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}">
        ←
      </button>
    `);

    // Page numbers
    for (let i = Math.max(1, current - 2); i <= Math.min(totalPages, current + 2); i++) {
      pages.push(`
        <button onclick="dataTable.goToPage(${i})"
                class="px-3 py-2 mx-1 rounded ${i === current ? 'bg-emerald-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}">
          ${i}
        </button>
      `);
    }

    // Next button
    pages.push(`
      <button ${current === totalPages ? 'disabled' : ''}
              onclick="dataTable.goToPage(${current + 1})"
              class="px-3 py-2 mx-1 rounded ${current === totalPages ? 'bg-gray-700 text-gray-500' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}">
        →
      </button>
    `);

    pagination.innerHTML = `
      <div class="flex justify-between items-center mt-4">
        <div class="text-gray-400 text-sm">
          แสดง ${startIndex + 1}-${Math.min(endIndex, this.filteredData.length)} จาก ${this.filteredData.length} รายการ
        </div>
        <div class="flex items-center">
          ${pages.join('')}
        </div>
      </div>
    `;
  }
}
```

## 10. DevOps & Tooling

### package.json Scripts
```json
{
  "name": "fingrow-v3",
  "version": "3.0.0",
  "description": "Secondhand Marketplace with Worldcoin Integration",
  "scripts": {
    "dev": "expo start --clear",
    "build": "expo build:web",
    "lint": "eslint admin/js mobile/index.html --ext .js,.html",
    "lint:fix": "eslint admin/js mobile/index.html --ext .js,.html --fix",
    "format": "prettier --write \"**/*.{js,html,css,md}\"",
    "format:check": "prettier --check \"**/*.{js,html,css,md}\"",
    "test": "echo \"No tests yet\" && exit 0",
    "audit": "echo \"Running security audit...\" && npm audit",
    "clean": "rm -rf .expo dist",
    "backup": "node scripts/backup-data.js",
    "migrate": "node scripts/migrate-to-supabase.js"
  },
  "devDependencies": {
    "eslint": "^8.0.0",
    "prettier": "^3.0.0"
  }
}
```

### .eslintrc.json
```json
{
  "env": {
    "browser": true,
    "es2021": true
  },
  "extends": [
    "eslint:recommended"
  ],
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "script"
  },
  "rules": {
    "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "no-console": ["warn", { "allow": ["warn", "error", "debug"] }],
    "prefer-const": "error",
    "no-var": "error",
    "eqeqeq": "error",
    "curly": "error",
    "semi": ["error", "always"],
    "quotes": ["error", "single", { "allowTemplateLiterals": true }],
    "indent": ["error", 2],
    "no-trailing-spaces": "error",
    "object-curly-spacing": ["error", "always"],
    "array-bracket-spacing": ["error", "never"],
    "max-len": ["warn", { "code": 120 }]
  },
  "globals": {
    "Chart": "readonly",
    "MockDatabase": "readonly",
    "FingrowAdmin": "readonly",
    "normalizeUsers": "readonly",
    "notifications": "readonly"
  }
}
```

### .prettierrc
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 120,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "bracketSameLine": false,
  "arrowParens": "avoid",
  "endOfLine": "lf",
  "htmlWhitespaceSensitivity": "css",
  "overrides": [
    {
      "files": "*.html",
      "options": {
        "printWidth": 100,
        "htmlWhitespaceSensitivity": "ignore"
      }
    }
  ]
}
```

### Development Scripts

#### scripts/backup-data.js
```javascript
// Backup localStorage data
const fs = require('fs');
const path = require('path');

function backupLocalStorage() {
  const backupDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `fingrow-backup-${timestamp}.json`);

  // This would typically run in browser context
  console.log(`Backup script created. Run this in browser console:

    const data = {
      users: localStorage.getItem('fingrow_users'),
      products: localStorage.getItem('fingrow_products'),
      orders: localStorage.getItem('fingrow_orders'),
      timestamp: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fingrow-backup-${timestamp}.json';
    a.click();
  `);
}

backupLocalStorage();
```

## Manual Test Plans

### Test Plan 1: Authentication Security
1. Open browser console and run `localStorage.clear()`
2. Try login with invalid credentials → Should show rate limiting after 5 attempts
3. Login with valid credentials → Should hash password and create session
4. Close browser and reopen → Should maintain session within TTL
5. Check session storage for encrypted user data

### Test Plan 2: Data Normalization
1. Manually corrupt localStorage: `localStorage.setItem('fingrow_users', 'invalid_json')`
2. Try to load admin dashboard → Should gracefully handle and create defaults
3. Set users as object instead of array → Should normalize correctly
4. Verify all `.find()` operations work without errors

### Test Plan 3: MLM Commission Flow
1. Create user A with referral code
2. Register user B using A's referral code
3. User B creates and sells a product
4. Check that commission is calculated and distributed to A
5. Verify commission records are created in database

### Test Plan 4: WLD Price Integration
1. Disable internet connection
2. Load application → Should show cached/fallback WLD price
3. Re-enable connection → Should update price within 5 minutes
4. Test currency conversion in product creation

### Test Plan 5: Admin Dashboard UX
1. Load dashboard with slow network → Should show loading skeletons
2. Cause API error → Should show error state with retry button
3. Test pagination with large dataset → Should handle smoothly
4. Test search and sorting functionality

---

This blueprint provides a comprehensive roadmap for transforming Fingrow V3 from a prototype into a production-ready marketplace. The focus remains on vanilla JavaScript, security hardening, and maintaining the existing architecture while adding robustness and user experience improvements.