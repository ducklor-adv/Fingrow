import { supabase, TABLES, dbHelpers } from '../lib/supabase';

// Admin Dashboard Service
export const adminService = {
  // Dashboard Statistics
  async getDashboardStats() {
    try {
      const [
        usersResult,
        productsResult,
        ordersResult,
        earningsResult
      ] = await Promise.all([
        supabase.from(TABLES.USERS).select('id, created_at').eq('is_active', true),
        supabase.from(TABLES.PRODUCTS).select('id, created_at').eq('status', 'active'),
        supabase.from(TABLES.ORDERS).select('total_amount, currency_code, order_date'),
        supabase.from(TABLES.EARNINGS).select('amount_wld').eq('status', 'confirmed')
      ]);

      // Calculate total sales in THB (assuming average rate)
      const totalSales = ordersResult.data?.reduce((sum, order) => {
        return sum + parseFloat(order.total_amount || 0);
      }, 0) || 0;

      // Calculate total WLD pool
      const totalWLD = earningsResult.data?.reduce((sum, earning) => {
        return sum + parseFloat(earning.amount_wld || 0);
      }, 0) || 0;

      // Get monthly growth
      const currentMonth = new Date().getMonth();
      const lastMonth = currentMonth - 1;

      const thisMonthUsers = usersResult.data?.filter(user =>
        new Date(user.created_at).getMonth() === currentMonth
      ).length || 0;

      const lastMonthUsers = usersResult.data?.filter(user =>
        new Date(user.created_at).getMonth() === lastMonth
      ).length || 0;

      const userGrowth = lastMonthUsers > 0 ?
        ((thisMonthUsers - lastMonthUsers) / lastMonthUsers * 100).toFixed(1) : 0;

      return {
        data: {
          totalUsers: usersResult.data?.length || 0,
          totalProducts: productsResult.data?.length || 0,
          totalSales: totalSales,
          totalWLD: totalWLD,
          userGrowth: parseFloat(userGrowth),
          thisMonthUsers,
          lastMonthUsers
        },
        error: null
      };
    } catch (error) {
      return { data: null, error };
    }
  },

  // User Management
  async getAllUsers(page = 1, limit = 20, search = '') {
    try {
      let query = supabase
        .from(TABLES.USERS)
        .select(`
          *,
          referrals_count:referrals!referrer_id(count),
          total_orders:orders!buyer_id(count)
        `)
        .eq('is_active', true);

      if (search) {
        query = query.or(`username.ilike.%${search}%,email.ilike.%${search}%,full_name.ilike.%${search}%`);
      }

      query = query
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      const { data, error, count } = await query;

      return {
        data: data || [],
        error,
        totalCount: count,
        currentPage: page,
        totalPages: Math.ceil(count / limit)
      };
    } catch (error) {
      return { data: [], error };
    }
  },

  async updateUserStatus(userId, updates) {
    return dbHelpers.update(TABLES.USERS, updates, { id: userId });
  },

  async banUser(userId, reason) {
    return dbHelpers.update(TABLES.USERS, {
      is_suspended: true,
      admin_notes: reason,
      updated_at: new Date().toISOString()
    }, { id: userId });
  },

  // Product Management
  async getAllProducts(status = 'all', page = 1, limit = 20) {
    try {
      let query = supabase
        .from(TABLES.PRODUCTS)
        .select(`
          *,
          seller:users!seller_id(username, email, trust_score),
          category:categories!category_id(name, name_th),
          order_count:order_items(count)
        `);

      if (status !== 'all') {
        query = query.eq('status', status);
      }

      query = query
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      const { data, error, count } = await query;

      return {
        data: data || [],
        error,
        totalCount: count,
        currentPage: page,
        totalPages: Math.ceil(count / limit)
      };
    } catch (error) {
      return { data: [], error };
    }
  },

  async updateProductStatus(productId, status, reason = '') {
    const updates = {
      status,
      updated_at: new Date().toISOString()
    };

    if (reason) {
      updates.admin_notes = reason;
    }

    return dbHelpers.update(TABLES.PRODUCTS, updates, { id: productId });
  },

  async getReportedProducts() {
    // This would typically come from a reports table
    // For now, return products that might need attention
    return dbHelpers.select(TABLES.PRODUCTS, `
      *,
      seller:users!seller_id(username, trust_score),
      reports_count
    `, { status: 'reported' });
  },

  // Order Management
  async getAllOrders(page = 1, limit = 20, status = 'all') {
    try {
      let query = supabase
        .from(TABLES.ORDERS)
        .select(`
          *,
          buyer:users!buyer_id(username, email),
          seller:users!seller_id(username, email),
          order_items:order_items(
            *,
            product:products!product_id(title, images)
          )
        `);

      if (status !== 'all') {
        query = query.eq('status', status);
      }

      query = query
        .order('order_date', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      const { data, error, count } = await query;

      return {
        data: data || [],
        error,
        totalCount: count,
        currentPage: page,
        totalPages: Math.ceil(count / limit)
      };
    } catch (error) {
      return { data: [], error };
    }
  },

  async updateOrderStatus(orderId, status) {
    const updates = {
      status,
      updated_at: new Date().toISOString()
    };

    // Add timestamp based on status
    const timestamp = new Date().toISOString();
    switch (status) {
      case 'confirmed':
        updates.confirmed_at = timestamp;
        break;
      case 'shipped':
        updates.shipped_at = timestamp;
        break;
      case 'delivered':
        updates.delivered_at = timestamp;
        break;
      case 'completed':
        updates.completed_at = timestamp;
        break;
    }

    return dbHelpers.update(TABLES.ORDERS, updates, { id: orderId });
  },

  // Earnings and Referral Management
  async getEarningsOverview() {
    try {
      const { data, error } = await supabase
        .from(TABLES.EARNINGS)
        .select('earning_type, amount_wld, amount_local, currency_code, status, created_at');

      if (error) return { data: null, error };

      const overview = data.reduce((acc, earning) => {
        const type = earning.earning_type;

        if (!acc[type]) {
          acc[type] = {
            total_wld: 0,
            total_local: 0,
            count: 0,
            confirmed: 0,
            pending: 0
          };
        }

        acc[type].total_wld += parseFloat(earning.amount_wld);
        acc[type].total_local += parseFloat(earning.amount_local);
        acc[type].count++;

        if (earning.status === 'confirmed') {
          acc[type].confirmed++;
        } else {
          acc[type].pending++;
        }

        return acc;
      }, {});

      // Calculate community pool
      const totalCommunityFees = data
        .filter(e => e.earning_type === 'community_share')
        .reduce((sum, e) => sum + parseFloat(e.amount_wld), 0);

      const totalPaidCommissions = data
        .filter(e => e.earning_type === 'referral_commission' && e.status === 'confirmed')
        .reduce((sum, e) => sum + parseFloat(e.amount_wld), 0);

      const communityPool = totalCommunityFees - totalPaidCommissions;

      return {
        data: {
          overview,
          communityPool,
          totalCommunityFees,
          totalPaidCommissions
        },
        error: null
      };
    } catch (error) {
      return { data: null, error };
    }
  },

  async getPendingEarnings() {
    return dbHelpers.select(TABLES.EARNINGS, `
      *,
      user:users!user_id(username, email),
      source_order:orders!source_order_id(order_number, total_amount)
    `, { status: 'pending' }, {
      orderBy: { column: 'created_at', ascending: false }
    });
  },

  async approveEarning(earningId) {
    return dbHelpers.update(TABLES.EARNINGS, {
      status: 'confirmed',
      paid_at: new Date().toISOString()
    }, { id: earningId });
  },

  // Analytics and Reporting
  async getSalesAnalytics(period = '6months') {
    try {
      const months = period === '6months' ? 6 : 12;
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const { data, error } = await supabase
        .from(TABLES.ORDERS)
        .select('total_amount, currency_code, order_date, status')
        .gte('order_date', startDate.toISOString())
        .eq('status', 'completed');

      if (error) return { data: null, error };

      // Group by month
      const monthlyData = {};
      data.forEach(order => {
        const date = new Date(order.order_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            month: monthKey,
            sales: 0,
            orders: 0
          };
        }

        monthlyData[monthKey].sales += parseFloat(order.total_amount);
        monthlyData[monthKey].orders++;
      });

      const salesData = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));

      return { data: salesData, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async getUserGrowthAnalytics(period = '6months') {
    try {
      const months = period === '6months' ? 6 : 12;
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const { data, error } = await supabase
        .from(TABLES.USERS)
        .select('created_at')
        .gte('created_at', startDate.toISOString());

      if (error) return { data: null, error };

      // Group by month
      const monthlyData = {};
      data.forEach(user => {
        const date = new Date(user.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            month: monthKey,
            newUsers: 0
          };
        }

        monthlyData[monthKey].newUsers++;
      });

      const userGrowthData = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));

      return { data: userGrowthData, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async getCategoryStats() {
    try {
      const { data, error } = await supabase
        .from(TABLES.PRODUCTS)
        .select(`
          category_id,
          category:categories!category_id(name, name_th)
        `)
        .eq('status', 'active');

      if (error) return { data: null, error };

      const categoryStats = data.reduce((acc, product) => {
        const categoryName = product.category?.name_th || product.category?.name || 'ไม่ระบุ';

        if (!acc[categoryName]) {
          acc[categoryName] = 0;
        }

        acc[categoryName]++;
        return acc;
      }, {});

      // Sort by count
      const sortedStats = Object.entries(categoryStats)
        .sort((a, b) => b[1] - a[1])
        .map(([category, count]) => ({ category, count }));

      return { data: sortedStats, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Review Management
  async getAllReviews(page = 1, limit = 20, status = 'all') {
    try {
      let query = supabase
        .from(TABLES.REVIEWS)
        .select(`
          *,
          reviewer:users!reviewer_id(username, avatar_url),
          reviewed_user:users!reviewed_user_id(username),
          product:products!product_id(title, images)
        `);

      if (status !== 'all') {
        query = query.eq('is_visible', status === 'visible');
      }

      query = query
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      const { data, error, count } = await query;

      return {
        data: data || [],
        error,
        totalCount: count,
        currentPage: page,
        totalPages: Math.ceil(count / limit)
      };
    } catch (error) {
      return { data: [], error };
    }
  },

  async updateReviewStatus(reviewId, isVisible) {
    return dbHelpers.update(TABLES.REVIEWS, {
      is_visible: isVisible,
      updated_at: new Date().toISOString()
    }, { id: reviewId });
  },

  // System Settings
  async getSystemSettings() {
    // This would typically come from a settings table
    // For now, return default settings
    return {
      data: {
        appName: 'Fingrow',
        commissionRate: 5,
        minQualification: 500,
        maxReferralLevels: 7,
        communityShareRange: { min: 1, max: 7 },
        defaultCurrency: 'THB',
        supportedCurrencies: ['THB', 'USD', 'EUR', 'SGD'],
        notifications: {
          email: true,
          push: true,
          sms: false
        }
      },
      error: null
    };
  },

  async updateSystemSettings(settings) {
    // This would typically update a settings table
    // For now, just return success
    return { data: settings, error: null };
  }
};

// Utility functions for admin dashboard
export const adminUtils = {
  formatCurrency(amount, currency = 'THB') {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  },

  formatNumber(number) {
    return new Intl.NumberFormat('th-TH').format(number);
  },

  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  getStatusColor(status) {
    const colors = {
      active: 'emerald',
      inactive: 'gray',
      suspended: 'red',
      pending: 'yellow',
      confirmed: 'emerald',
      completed: 'emerald',
      cancelled: 'red',
      shipped: 'blue',
      delivered: 'purple'
    };
    return colors[status] || 'gray';
  },

  calculateGrowthPercentage(current, previous) {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous * 100).toFixed(1);
  }
};