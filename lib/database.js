import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

// Get directory paths for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = dirname(__dirname);

// Ensure data directory exists
const dataDir = join(projectRoot, 'data');
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

// SQLite database configuration
const DB_PATH = join(dataDir, 'fingrow.db');

// Global database instance
let db = null;

// Initialize SQLite database
export const initDatabase = async () => {
  try {
    if (db) return db;

    // Create database connection
    db = new Database(DB_PATH);

    // Enable foreign keys
    db.pragma('foreign_keys = ON');

    await createTables();
    console.log('SQLite database initialized successfully');
    return db;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

// Get database instance
export const getDatabase = () => {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
};

// Database tables structure
export const TABLES = {
  USERS: 'users',
  PRODUCTS: 'products',
  CATEGORIES: 'categories',
  ORDERS: 'orders',
  ORDER_ITEMS: 'order_items',
  CHAT_ROOMS: 'chat_rooms',
  MESSAGES: 'messages',
  REVIEWS: 'reviews',
  FAVORITES: 'favorites',
  REFERRALS: 'referrals',
  EARNINGS: 'earnings',
  ADDRESSES: 'addresses',
  NOTIFICATIONS: 'notifications',
  PAYMENT_METHODS: 'payment_methods',
  PRODUCT_IMAGES: 'product_images'
};

// Create all tables
const createTables = async () => {
  const database = getDatabase();

  // Enable foreign keys (already done in initDatabase)
  database.pragma('foreign_keys = ON');

  // Users table
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      world_id TEXT UNIQUE,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE,
      phone TEXT,
      full_name TEXT,
      avatar_url TEXT,
      bio TEXT,
      location TEXT,
      preferred_currency TEXT DEFAULT 'THB',
      language TEXT DEFAULT 'th',
      is_verified INTEGER DEFAULT 0,
      verification_level INTEGER DEFAULT 0,
      trust_score REAL DEFAULT 0.0,
      total_sales INTEGER DEFAULT 0,
      total_purchases INTEGER DEFAULT 0,
      referrer_id TEXT,
      referral_code TEXT UNIQUE NOT NULL,
      referral_level INTEGER DEFAULT 1,
      total_referrals INTEGER DEFAULT 0,
      active_referrals INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      is_suspended INTEGER DEFAULT 0,
      last_login TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (referrer_id) REFERENCES users(id)
    )
  `);

  // Categories table
  database.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      name_th TEXT,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      icon TEXT,
      parent_id TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES categories(id)
    )
  `);

  // Products table
  database.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      seller_id TEXT NOT NULL,
      category_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      condition TEXT NOT NULL,
      price_local REAL NOT NULL,
      currency_code TEXT NOT NULL DEFAULT 'THB',
      original_price REAL,
      location TEXT NOT NULL,
      shipping_options TEXT,
      pickup_available INTEGER DEFAULT 0,
      brand TEXT,
      model TEXT,
      year_purchased INTEGER,
      warranty_remaining INTEGER,
      included_accessories TEXT,
      images TEXT NOT NULL,
      videos TEXT,
      quantity INTEGER DEFAULT 1,
      is_available INTEGER DEFAULT 1,
      is_featured INTEGER DEFAULT 0,
      community_percentage REAL DEFAULT 2.0,
      view_count INTEGER DEFAULT 0,
      favorite_count INTEGER DEFAULT 0,
      inquiry_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      featured_until TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (seller_id) REFERENCES users(id),
      FOREIGN KEY (category_id) REFERENCES categories(id)
    )
  `);

  // Product images table
  database.exec(`
    CREATE TABLE IF NOT EXISTS product_images (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      image_url TEXT NOT NULL,
      is_primary INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      alt_text TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `);

  // Orders table
  database.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_number TEXT UNIQUE NOT NULL,
      buyer_id TEXT NOT NULL,
      seller_id TEXT NOT NULL,
      subtotal REAL NOT NULL,
      shipping_cost REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      community_fee REAL NOT NULL,
      total_amount REAL NOT NULL,
      currency_code TEXT NOT NULL,
      wld_rate REAL NOT NULL,
      total_wld REAL NOT NULL,
      shipping_address TEXT NOT NULL,
      shipping_method TEXT,
      tracking_number TEXT,
      status TEXT DEFAULT 'pending',
      payment_status TEXT DEFAULT 'pending',
      order_date TEXT DEFAULT CURRENT_TIMESTAMP,
      confirmed_at TEXT,
      shipped_at TEXT,
      delivered_at TEXT,
      completed_at TEXT,
      buyer_notes TEXT,
      seller_notes TEXT,
      admin_notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (buyer_id) REFERENCES users(id),
      FOREIGN KEY (seller_id) REFERENCES users(id)
    )
  `);

  // Order items table
  database.exec(`
    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL,
      product_title TEXT NOT NULL,
      product_condition TEXT NOT NULL,
      product_image TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  // Reviews table
  database.exec(`
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      reviewer_id TEXT NOT NULL,
      reviewed_user_id TEXT NOT NULL,
      product_id TEXT,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      title TEXT,
      comment TEXT,
      images TEXT,
      communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
      item_quality_rating INTEGER CHECK (item_quality_rating >= 1 AND item_quality_rating <= 5),
      shipping_rating INTEGER CHECK (shipping_rating >= 1 AND shipping_rating <= 5),
      is_verified_purchase INTEGER DEFAULT 1,
      is_visible INTEGER DEFAULT 1,
      seller_response TEXT,
      seller_response_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (reviewer_id) REFERENCES users(id),
      FOREIGN KEY (reviewed_user_id) REFERENCES users(id),
      FOREIGN KEY (product_id) REFERENCES products(id),
      UNIQUE(order_id, reviewer_id, reviewed_user_id)
    )
  `);

  // Favorites table
  database.exec(`
    CREATE TABLE IF NOT EXISTS favorites (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (product_id) REFERENCES products(id),
      UNIQUE(user_id, product_id)
    )
  `);

  // Chat rooms table
  database.exec(`
    CREATE TABLE IF NOT EXISTS chat_rooms (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      buyer_id TEXT NOT NULL,
      seller_id TEXT NOT NULL,
      current_offer_amount REAL,
      current_offer_currency TEXT,
      offer_status TEXT DEFAULT 'none',
      is_active INTEGER DEFAULT 1,
      last_message_at TEXT DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (buyer_id) REFERENCES users(id),
      FOREIGN KEY (seller_id) REFERENCES users(id),
      UNIQUE(product_id, buyer_id, seller_id)
    )
  `);

  // Messages table
  database.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      chat_room_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      message_type TEXT DEFAULT 'text',
      content TEXT,
      images TEXT,
      offer_amount REAL,
      offer_currency TEXT,
      offer_expires_at TEXT,
      is_read INTEGER DEFAULT 0,
      read_at TEXT,
      is_deleted INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (chat_room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
      FOREIGN KEY (sender_id) REFERENCES users(id)
    )
  `);

  // Referrals table
  database.exec(`
    CREATE TABLE IF NOT EXISTS referrals (
      id TEXT PRIMARY KEY,
      referrer_id TEXT NOT NULL,
      referee_id TEXT NOT NULL,
      level INTEGER NOT NULL,
      first_purchase_made INTEGER DEFAULT 0,
      first_purchase_date TEXT,
      total_purchases_made INTEGER DEFAULT 0,
      total_purchase_value REAL DEFAULT 0,
      total_commission_earned REAL DEFAULT 0,
      last_commission_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (referrer_id) REFERENCES users(id),
      FOREIGN KEY (referee_id) REFERENCES users(id),
      UNIQUE(referrer_id, referee_id)
    )
  `);

  // Earnings table
  database.exec(`
    CREATE TABLE IF NOT EXISTS earnings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      source_order_id TEXT,
      source_user_id TEXT,
      earning_type TEXT NOT NULL,
      amount_wld REAL NOT NULL,
      amount_local REAL NOT NULL,
      currency_code TEXT NOT NULL,
      referral_level INTEGER,
      commission_rate REAL,
      status TEXT DEFAULT 'pending',
      paid_at TEXT,
      payment_transaction_id TEXT,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (source_order_id) REFERENCES orders(id),
      FOREIGN KEY (source_user_id) REFERENCES users(id)
    )
  `);

  // Addresses table
  database.exec(`
    CREATE TABLE IF NOT EXISTS addresses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      label TEXT NOT NULL,
      recipient_name TEXT NOT NULL,
      phone TEXT,
      address_line1 TEXT NOT NULL,
      address_line2 TEXT,
      city TEXT NOT NULL,
      state_province TEXT,
      postal_code TEXT NOT NULL,
      country TEXT NOT NULL,
      coordinates TEXT,
      is_default INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Notifications table
  database.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      data TEXT,
      is_read INTEGER DEFAULT 0,
      read_at TEXT,
      push_sent INTEGER DEFAULT 0,
      push_sent_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Payment methods table
  database.exec(`
    CREATE TABLE IF NOT EXISTS payment_methods (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      provider TEXT,
      account_details TEXT,
      display_name TEXT,
      is_verified INTEGER DEFAULT 0,
      is_default INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Create indexes
  database.exec('CREATE INDEX IF NOT EXISTS idx_users_referrer_id ON users(referrer_id);');
  database.exec('CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);');
  database.exec('CREATE INDEX IF NOT EXISTS idx_users_world_id ON users(world_id);');
  database.exec('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);');

  database.exec('CREATE INDEX IF NOT EXISTS idx_products_seller_id ON products(seller_id);');
  database.exec('CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);');
  database.exec('CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);');
  database.exec('CREATE INDEX IF NOT EXISTS idx_products_is_available ON products(is_available);');

  database.exec('CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON orders(buyer_id);');
  database.exec('CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON orders(seller_id);');
  database.exec('CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);');

  database.exec('CREATE INDEX IF NOT EXISTS idx_messages_chat_room_id ON messages(chat_room_id);');
  database.exec('CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);');

  database.exec('CREATE INDEX IF NOT EXISTS idx_earnings_user_id ON earnings(user_id);');
  database.exec('CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);');

  console.log('All tables created successfully');
};

// Helper functions for common database operations
export const dbHelpers = {
  // Generate UUID
  generateId: () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },

  // Generic select with filters
  async select(table, columns = '*', filters = {}, options = {}) {
    const database = getDatabase();

    let sql = `SELECT ${columns} FROM ${table}`;
    const params = [];

    // Add WHERE clause
    const whereConditions = [];
    Object.entries(filters).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        const placeholders = value.map(() => '?').join(',');
        whereConditions.push(`${key} IN (${placeholders})`);
        params.push(...value);
      } else if (typeof value === 'object' && value.operator) {
        let operator = value.operator;
        switch (operator) {
          case 'gte': operator = '>='; break;
          case 'lte': operator = '<='; break;
          case 'gt': operator = '>'; break;
          case 'lt': operator = '<'; break;
          case 'like': operator = 'LIKE'; break;
          case 'ilike': operator = 'LIKE'; break;
          default: operator = '=';
        }
        whereConditions.push(`${key} ${operator} ?`);
        params.push(value.value);
      } else {
        whereConditions.push(`${key} = ?`);
        params.push(value);
      }
    });

    if (whereConditions.length > 0) {
      sql += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    // Add ORDER BY clause
    if (options.orderBy) {
      const direction = options.orderBy.ascending === false ? 'DESC' : 'ASC';
      sql += ` ORDER BY ${options.orderBy.column} ${direction}`;
    }

    // Add LIMIT clause
    if (options.limit) {
      sql += ` LIMIT ${options.limit}`;
    }

    try {
      const stmt = database.prepare(sql);
      const result = stmt.all(...params);
      return { data: result, error: null };
    } catch (error) {
      console.error('Select error:', error);
      return { data: null, error };
    }
  },

  // Generic insert
  async insert(table, data) {
    const database = getDatabase();

    if (Array.isArray(data)) {
      // Multiple insert
      const results = [];
      for (const item of data) {
        const result = await this.insert(table, item);
        results.push(result);
      }
      return { data: results, error: null };
    }

    // Add ID if not present
    if (!data.id) {
      data.id = this.generateId();
    }

    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(',');

    const sql = `INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`;

    try {
      const stmt = database.prepare(sql);
      const result = stmt.run(...values);
      return { data: { ...data, id: data.id }, error: null };
    } catch (error) {
      console.error('Insert error:', error);
      return { data: null, error };
    }
  },

  // Generic update
  async update(table, data, filters = {}) {
    const database = getDatabase();

    // Add updated_at timestamp
    data.updated_at = new Date().toISOString();

    const setClause = Object.keys(data).map(key => `${key} = ?`).join(',');
    const setValues = Object.values(data);

    let sql = `UPDATE ${table} SET ${setClause}`;
    const params = [...setValues];

    // Add WHERE clause
    const whereConditions = [];
    Object.entries(filters).forEach(([key, value]) => {
      whereConditions.push(`${key} = ?`);
      params.push(value);
    });

    if (whereConditions.length > 0) {
      sql += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    try {
      const stmt = database.prepare(sql);
      const result = stmt.run(...params);
      return { data: { changes: result.changes }, error: null };
    } catch (error) {
      console.error('Update error:', error);
      return { data: null, error };
    }
  },

  // Generic delete
  async delete(table, filters = {}) {
    const database = getDatabase();

    let sql = `DELETE FROM ${table}`;
    const params = [];

    // Add WHERE clause
    const whereConditions = [];
    Object.entries(filters).forEach(([key, value]) => {
      whereConditions.push(`${key} = ?`);
      params.push(value);
    });

    if (whereConditions.length > 0) {
      sql += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    try {
      const stmt = database.prepare(sql);
      const result = stmt.run(...params);
      return { data: { changes: result.changes }, error: null };
    } catch (error) {
      console.error('Delete error:', error);
      return { data: null, error };
    }
  },

  // Execute raw SQL
  async executeRaw(sql, params = []) {
    const database = getDatabase();

    try {
      if (sql.trim().toLowerCase().startsWith('select')) {
        const stmt = database.prepare(sql);
        const result = stmt.all(...params);
        return { data: result, error: null };
      } else {
        const stmt = database.prepare(sql);
        const result = stmt.run(...params);
        return { data: result, error: null };
      }
    } catch (error) {
      console.error('Raw SQL error:', error);
      return { data: null, error };
    }
  }
};