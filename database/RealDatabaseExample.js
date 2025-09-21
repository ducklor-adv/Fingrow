// Example: How to use Real Supabase Database instead of Mock Database
import { supabase, TABLES, dbHelpers } from '../lib/supabase.js';

// Real Database Service Class
class RealDatabaseService {

  // ============ USER OPERATIONS ============

  async getAllUsers(page = 1, limit = 50, search = '') {
    try {
      let query = supabase
        .from(TABLES.USERS)
        .select('*');

      // Add search filter
      if (search) {
        query = query.or(`username.ilike.%${search}%,email.ilike.%${search}%,full_name.ilike.%${search}%`);
      }

      // Add pagination
      const from = (page - 1) * limit;
      query = query.range(from, from + limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        data: data || [],
        total: count || 0,
        page: page,
        totalPages: Math.ceil((count || 0) / limit)
      };
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  async createUser(userData) {
    try {
      const { data, error } = await supabase
        .from(TABLES.USERS)
        .insert([userData])
        .select()
        .single();

      if (error) throw error;
      return { success: true, user: data };
    } catch (error) {
      console.error('Error creating user:', error);
      return { success: false, message: error.message };
    }
  }

  async updateUser(userId, updateData) {
    try {
      const { data, error } = await supabase
        .from(TABLES.USERS)
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async deleteUser(userId) {
    try {
      const { data, error } = await supabase
        .from(TABLES.USERS)
        .delete()
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, deletedUser: data };
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  // ============ PRODUCT OPERATIONS ============

  async getProducts(page = 1, limit = 10, category = '', status = '') {
    try {
      let query = supabase
        .from(TABLES.PRODUCTS)
        .select(`
          *,
          seller:seller_id (
            id,
            username,
            full_name,
            profile_image,
            seller_rating
          ),
          category:category_id (
            id,
            name,
            name_th
          )
        `);

      // Add filters
      if (category) query = query.eq('category_id', category);
      if (status) query = query.eq('status', status);

      // Add pagination
      const from = (page - 1) * limit;
      query = query.range(from, from + limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        data: data || [],
        total: count || 0,
        page: page,
        totalPages: Math.ceil((count || 0) / limit)
      };
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  }

  // ============ ORDER OPERATIONS ============

  async getOrders(page = 1, limit = 10, status = '') {
    try {
      let query = supabase
        .from(TABLES.ORDERS)
        .select(`
          *,
          buyer:buyer_id (
            id,
            username,
            full_name,
            profile_image
          ),
          seller:seller_id (
            id,
            username,
            full_name,
            profile_image
          ),
          order_items (
            *,
            product:product_id (
              id,
              title,
              images
            )
          )
        `);

      // Add status filter
      if (status) query = query.eq('status', status);

      // Add pagination
      const from = (page - 1) * limit;
      query = query.range(from, from + limit - 1)
                  .order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        data: data || [],
        total: count || 0,
        page: page,
        totalPages: Math.ceil((count || 0) / limit)
      };
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }
  }

  // ============ AUTHENTICATION ============

  async loginUser(username, password) {
    try {
      // Note: In production, use Supabase Auth instead of plain password
      // This is simplified for demo purposes
      const { data, error } = await supabase
        .from(TABLES.USERS)
        .select('*')
        .or(`username.eq.${username},email.eq.${username}`)
        .eq('password', password) // WARNING: Don't store plain passwords in production!
        .eq('is_active', true)
        .single();

      if (error) throw error;

      // Update last login
      await this.updateUser(data.id, {
        last_login: new Date().toISOString()
      });

      return { success: true, user: data };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Invalid credentials' };
    }
  }

  // ============ DASHBOARD STATISTICS ============

  async getDashboardStats() {
    try {
      // Get all stats in parallel
      const [
        usersResult,
        productsResult,
        ordersResult,
        salesResult
      ] = await Promise.all([
        supabase.from(TABLES.USERS).select('id, is_active', { count: 'exact', head: true }),
        supabase.from(TABLES.PRODUCTS).select('id, status', { count: 'exact', head: true }),
        supabase.from(TABLES.ORDERS).select('id, status', { count: 'exact', head: true }),
        supabase.from(TABLES.ORDERS).select('total_amount').eq('status', 'completed')
      ]);

      // Calculate totals
      const totalUsers = usersResult.count || 0;
      const totalProducts = productsResult.count || 0;
      const totalOrders = ordersResult.count || 0;

      const totalSales = salesResult.data?.reduce((sum, order) =>
        sum + (order.total_amount || 0), 0) || 0;

      return {
        totalUsers,
        totalProducts,
        totalOrders,
        totalSales,
        // Add more stats as needed
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  }

  // ============ REAL-TIME SUBSCRIPTIONS ============

  subscribeToOrders(callback) {
    return supabase
      .channel('orders-channel')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: TABLES.ORDERS
      }, callback)
      .subscribe();
  }

  subscribeToUsers(callback) {
    return supabase
      .channel('users-channel')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: TABLES.USERS
      }, callback)
      .subscribe();
  }
}

// Export instance
export const realDB = new RealDatabaseService();

// Example usage:
export const exampleUsage = {
  async showExamples() {
    try {
      // Get users
      const users = await realDB.getAllUsers(1, 10, 'alice');
      console.log('Users:', users);

      // Get products
      const products = await realDB.getProducts(1, 10);
      console.log('Products:', products);

      // Get orders
      const orders = await realDB.getOrders(1, 10, 'completed');
      console.log('Orders:', orders);

      // Login user
      const loginResult = await realDB.loginUser('alice_smith', '123456');
      console.log('Login:', loginResult);

      // Get dashboard stats
      const stats = await realDB.getDashboardStats();
      console.log('Stats:', stats);

    } catch (error) {
      console.error('Example error:', error);
    }
  }
};