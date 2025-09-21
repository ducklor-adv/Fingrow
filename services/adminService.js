import { initDatabase, getDatabase, TABLES, dbHelpers } from '../lib/database.js';

// Initialize database on service import
let dbInitialized = false;

const ensureDbInitialized = async () => {
  if (!dbInitialized) {
    await initDatabase();
    dbInitialized = true;
  }
};

// Admin Dashboard Service
export const adminService = {
  // Dashboard Statistics
  async getDashboardStats() {
    await ensureDbInitialized();

    try {
      const [usersResult, productsResult, ordersResult, earningsResult] = await Promise.all([
        dbHelpers.select(TABLES.USERS, 'id, created_at', { is_active: 1 }),
        dbHelpers.select(TABLES.PRODUCTS, 'id, created_at', { status: 'active' }),
        dbHelpers.select(TABLES.ORDERS, 'total_amount, currency_code, order_date'),
        dbHelpers.select(TABLES.EARNINGS, 'amount_wld', { status: 'confirmed' })
      ]);

      const users = usersResult.data || [];
      const products = productsResult.data || [];
      const orders = ordersResult.data || [];
      const earnings = earningsResult.data || [];

      // Calculate total sales in THB (assuming average rate)
      const totalSales = orders.reduce((sum, order) => {
        return sum + parseFloat(order.total_amount || 0);
      }, 0);

      // Calculate total WLD pool
      const totalWLD = earnings.reduce((sum, earning) => {
        return sum + parseFloat(earning.amount_wld || 0);
      }, 0);

      // Get monthly growth
      const currentMonth = new Date().getMonth();
      const lastMonth = currentMonth - 1;

      const thisMonthUsers = users.filter(user =>
        new Date(user.created_at).getMonth() === currentMonth
      ).length;

      const lastMonthUsers = users.filter(user =>
        new Date(user.created_at).getMonth() === lastMonth
      ).length;

      const userGrowth = lastMonthUsers > 0 ?
        ((thisMonthUsers - lastMonthUsers) / lastMonthUsers * 100).toFixed(1) : 0;

      return {
        data: {
          totalUsers: users.length,
          totalProducts: products.length,
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
    await ensureDbInitialized();

    try {
      let filters = { is_active: 1 };

      // Basic search implementation for SQLite
      const { data: allUsers, error } = await dbHelpers.select(
        TABLES.USERS,
        '*',
        filters
      );

      if (error) return { data: [], error };

      let filteredUsers = allUsers;

      if (search) {
        const searchLower = search.toLowerCase();
        filteredUsers = allUsers.filter(user =>
          (user.username && user.username.toLowerCase().includes(searchLower)) ||
          (user.email && user.email.toLowerCase().includes(searchLower)) ||
          (user.full_name && user.full_name.toLowerCase().includes(searchLower))
        );
      }

      // Sort by created_at desc
      filteredUsers.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      // Pagination
      const totalCount = filteredUsers.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

      // Get referral counts for each user
      for (let user of paginatedUsers) {
        const { data: referrals } = await dbHelpers.select(
          TABLES.REFERRALS, '*', { referrer_id: user.id }
        );

        const { data: orders } = await dbHelpers.select(
          TABLES.ORDERS, '*', { buyer_id: user.id }
        );

        user.referrals_count = referrals?.length || 0;
        user.total_orders = orders?.length || 0;
      }

      return {
        data: paginatedUsers,
        error: null,
        totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit)
      };
    } catch (error) {
      return { data: [], error };
    }
  },

  async updateUserStatus(userId, updates) {
    await ensureDbInitialized();
    return await dbHelpers.update(TABLES.USERS, updates, { id: userId });
  },

  async banUser(userId, reason) {
    await ensureDbInitialized();
    return await dbHelpers.update(TABLES.USERS, {
      is_suspended: 1,
      admin_notes: reason,
      updated_at: new Date().toISOString()
    }, { id: userId });
  },

  // Product Management
  async getAllProducts(status = 'all', page = 1, limit = 20) {
    await ensureDbInitialized();

    try {
      let filters = {};

      if (status !== 'all') {
        filters.status = status;
      }

      const { data: products, error } = await dbHelpers.select(
        TABLES.PRODUCTS,
        '*',
        filters
      );

      if (error) return { data: [], error };

      // Sort by created_at desc
      products.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      // Pagination
      const totalCount = products.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedProducts = products.slice(startIndex, endIndex);

      // Get seller, category, and order count info
      for (let product of paginatedProducts) {
        const { data: seller } = await dbHelpers.select(
          TABLES.USERS, 'username, email, trust_score', { id: product.seller_id }
        );

        const { data: category } = await dbHelpers.select(
          TABLES.CATEGORIES, 'name, name_th', { id: product.category_id }
        );

        const { data: orderItems } = await dbHelpers.select(
          TABLES.ORDER_ITEMS, '*', { product_id: product.id }
        );

        product.seller = seller?.[0] || null;
        product.category = category?.[0] || null;
        product.order_count = orderItems?.length || 0;
      }

      return {
        data: paginatedProducts,
        error: null,
        totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit)
      };
    } catch (error) {
      return { data: [], error };
    }
  },

  async updateProductStatus(productId, status, reason = '') {
    await ensureDbInitialized();

    const updates = {
      status,
      updated_at: new Date().toISOString()
    };

    if (reason) {
      updates.admin_notes = reason;
    }

    return await dbHelpers.update(TABLES.PRODUCTS, updates, { id: productId });
  },

  async getReportedProducts() {
    await ensureDbInitialized();

    const { data: products, error } = await dbHelpers.select(
      TABLES.PRODUCTS, '*', { status: 'reported' }
    );

    if (error || !products) return { data: [], error };

    // Get seller info
    for (let product of products) {
      const { data: seller } = await dbHelpers.select(
        TABLES.USERS, 'username, trust_score', { id: product.seller_id }
      );

      product.seller = seller?.[0] || null;
      product.reports_count = 1; // Placeholder
    }

    return { data: products, error: null };
  },

  // Order Management
  async getAllOrders(page = 1, limit = 20, status = 'all') {
    await ensureDbInitialized();

    try {
      let filters = {};

      if (status !== 'all') {
        filters.status = status;
      }

      const { data: orders, error } = await dbHelpers.select(
        TABLES.ORDERS,
        '*',
        filters
      );

      if (error) return { data: [], error };

      // Sort by order_date desc
      orders.sort((a, b) => new Date(b.order_date) - new Date(a.order_date));

      // Pagination
      const totalCount = orders.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedOrders = orders.slice(startIndex, endIndex);

      // Get buyer, seller, and order items info
      for (let order of paginatedOrders) {
        const { data: buyer } = await dbHelpers.select(
          TABLES.USERS, 'username, email', { id: order.buyer_id }
        );

        const { data: seller } = await dbHelpers.select(
          TABLES.USERS, 'username, email', { id: order.seller_id }
        );

        const { data: orderItems } = await dbHelpers.select(
          TABLES.ORDER_ITEMS, '*', { order_id: order.id }
        );

        // Get product info for each order item
        for (let item of orderItems || []) {
          const { data: product } = await dbHelpers.select(
            TABLES.PRODUCTS, 'title, images', { id: item.product_id }
          );

          item.product = product?.[0] || null;
        }

        order.buyer = buyer?.[0] || null;
        order.seller = seller?.[0] || null;
        order.order_items = orderItems || [];
      }

      return {
        data: paginatedOrders,
        error: null,
        totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit)
      };
    } catch (error) {
      return { data: [], error };
    }
  },

  async updateOrderStatus(orderId, status) {
    await ensureDbInitialized();

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

    return await dbHelpers.update(TABLES.ORDERS, updates, { id: orderId });
  },

  // Earnings and Referral Management
  async getEarningsOverview() {
    await ensureDbInitialized();

    try {
      const { data: earnings, error } = await dbHelpers.select(
        TABLES.EARNINGS,
        'earning_type, amount_wld, amount_local, currency_code, status, created_at'
      );

      if (error || !earnings) return { data: null, error };

      const overview = earnings.reduce((acc, earning) => {
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
      const totalCommunityFees = earnings
        .filter(e => e.earning_type === 'community_share')
        .reduce((sum, e) => sum + parseFloat(e.amount_wld), 0);

      const totalPaidCommissions = earnings
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
    await ensureDbInitialized();

    const { data: earnings, error } = await dbHelpers.select(
      TABLES.EARNINGS,
      '*',
      { status: 'pending' },
      { orderBy: { column: 'created_at', ascending: false } }
    );

    if (error || !earnings) return { data: [], error };

    // Get user and order info
    for (let earning of earnings) {
      const { data: user } = await dbHelpers.select(
        TABLES.USERS, 'username, email', { id: earning.user_id }
      );

      const { data: order } = await dbHelpers.select(
        TABLES.ORDERS, 'order_number, total_amount', { id: earning.source_order_id }
      );

      earning.user = user?.[0] || null;
      earning.source_order = order?.[0] || null;
    }

    return { data: earnings, error: null };
  },

  async approveEarning(earningId) {
    await ensureDbInitialized();

    return await dbHelpers.update(TABLES.EARNINGS, {
      status: 'confirmed',
      paid_at: new Date().toISOString()
    }, { id: earningId });
  },

  // Analytics and Reporting
  async getSalesAnalytics(period = '6months') {
    await ensureDbInitialized();

    try {
      const months = period === '6months' ? 6 : 12;
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const { data: orders, error } = await dbHelpers.select(
        TABLES.ORDERS,
        'total_amount, currency_code, order_date, status',
        { status: 'completed' }
      );

      if (error || !orders) return { data: null, error };

      // Filter by date
      const filteredOrders = orders.filter(order =>
        new Date(order.order_date) >= startDate
      );

      // Group by month
      const monthlyData = {};
      filteredOrders.forEach(order => {
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
    await ensureDbInitialized();

    try {
      const months = period === '6months' ? 6 : 12;
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const { data: users, error } = await dbHelpers.select(
        TABLES.USERS,
        'created_at'
      );

      if (error || !users) return { data: null, error };

      // Filter by date
      const filteredUsers = users.filter(user =>
        new Date(user.created_at) >= startDate
      );

      // Group by month
      const monthlyData = {};
      filteredUsers.forEach(user => {
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
    await ensureDbInitialized();

    try {
      const { data: products, error } = await dbHelpers.select(
        TABLES.PRODUCTS,
        'category_id',
        { status: 'active' }
      );

      if (error || !products) return { data: null, error };

      const categoryStats = {};

      // Get category info for each product
      for (let product of products) {
        const { data: category } = await dbHelpers.select(
          TABLES.CATEGORIES, 'name, name_th', { id: product.category_id }
        );

        const categoryName = category?.[0]?.name_th || category?.[0]?.name || 'ไม่ระบุ';

        if (!categoryStats[categoryName]) {
          categoryStats[categoryName] = 0;
        }

        categoryStats[categoryName]++;
      }

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
    await ensureDbInitialized();

    try {
      let filters = {};

      if (status !== 'all') {
        filters.is_visible = status === 'visible' ? 1 : 0;
      }

      const { data: reviews, error } = await dbHelpers.select(
        TABLES.REVIEWS,
        '*',
        filters
      );

      if (error) return { data: [], error };

      // Sort by created_at desc
      reviews.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      // Pagination
      const totalCount = reviews.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedReviews = reviews.slice(startIndex, endIndex);

      // Get reviewer, reviewed_user, and product info
      for (let review of paginatedReviews) {
        const { data: reviewer } = await dbHelpers.select(
          TABLES.USERS, 'username, avatar_url', { id: review.reviewer_id }
        );

        const { data: reviewedUser } = await dbHelpers.select(
          TABLES.USERS, 'username', { id: review.reviewed_user_id }
        );

        const { data: product } = await dbHelpers.select(
          TABLES.PRODUCTS, 'title, images', { id: review.product_id }
        );

        review.reviewer = reviewer?.[0] || null;
        review.reviewed_user = reviewedUser?.[0] || null;
        review.product = product?.[0] || null;
      }

      return {
        data: paginatedReviews,
        error: null,
        totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit)
      };
    } catch (error) {
      return { data: [], error };
    }
  },

  async updateReviewStatus(reviewId, isVisible) {
    await ensureDbInitialized();

    return await dbHelpers.update(TABLES.REVIEWS, {
      is_visible: isVisible ? 1 : 0,
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