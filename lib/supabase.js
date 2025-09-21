import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://your-project-url.supabase.co';
const supabaseAnonKey = 'your-anon-key';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database tables structure based on the app requirements
export const TABLES = {
  USERS: 'users',
  PRODUCTS: 'products',
  CATEGORIES: 'categories',
  ORDERS: 'orders',
  ORDER_ITEMS: 'order_items',
  CHATS: 'chats',
  MESSAGES: 'messages',
  REVIEWS: 'reviews',
  FAVORITES: 'favorites',
  REFERRALS: 'referrals',
  EARNINGS: 'earnings',
  ADDRESSES: 'addresses',
  NOTIFICATIONS: 'notifications',
  PAYMENT_METHODS: 'payment_methods',
};

// Helper functions for common database operations
export const dbHelpers = {
  // Generic select with filters
  async select(table, columns = '*', filters = {}, options = {}) {
    let query = supabase.from(table).select(columns);

    Object.entries(filters).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        query = query.in(key, value);
      } else if (typeof value === 'object' && value.operator) {
        query = query[value.operator](key, value.value);
      } else {
        query = query.eq(key, value);
      }
    });

    if (options.orderBy) {
      query = query.order(options.orderBy.column, {
        ascending: options.orderBy.ascending !== false
      });
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    return query;
  },

  // Generic insert
  async insert(table, data) {
    return supabase.from(table).insert(data);
  },

  // Generic update
  async update(table, data, filters = {}) {
    let query = supabase.from(table).update(data);

    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    return query;
  },

  // Generic delete
  async delete(table, filters = {}) {
    let query = supabase.from(table).delete();

    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    return query;
  },
};