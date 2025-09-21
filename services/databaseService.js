import { supabase, TABLES, dbHelpers } from '../lib/supabase';

// User service
export const userService = {
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from(TABLES.USERS)
      .select('*')
      .eq('world_id', user.id)
      .single();

    return error ? null : data;
  },

  async createUser(userData) {
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .insert({
        ...userData,
        referral_code: generateReferralCode(userData.username),
      })
      .select()
      .single();

    return { data, error };
  },

  async updateUser(userId, updates) {
    return dbHelpers.update(TABLES.USERS, updates, { id: userId });
  },

  async getUserByReferralCode(referralCode) {
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .select('id, username, referral_code')
      .eq('referral_code', referralCode)
      .single();

    return { data, error };
  },

  async getUserReferrals(userId) {
    return dbHelpers.select(TABLES.REFERRALS, '*', { referrer_id: userId });
  },
};

// Product service
export const productService = {
  async getProducts(filters = {}, options = {}) {
    let query = supabase
      .from(TABLES.PRODUCTS)
      .select(`
        *,
        seller:users!seller_id(id, username, trust_score, is_verified),
        category:categories!category_id(name, name_th, slug)
      `)
      .eq('status', 'active')
      .eq('is_available', true);

    if (filters.category_id) {
      query = query.eq('category_id', filters.category_id);
    }

    if (filters.condition) {
      query = query.in('condition', filters.condition);
    }

    if (filters.price_min && filters.price_max) {
      query = query.gte('price_local', filters.price_min).lte('price_local', filters.price_max);
    }

    if (filters.location) {
      // Basic location filter - could be enhanced with PostGIS
      query = query.ilike('location->city', `%${filters.location}%`);
    }

    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    // Sorting
    if (options.sortBy) {
      const ascending = options.sortOrder !== 'desc';
      switch (options.sortBy) {
        case 'price':
          query = query.order('price_local', { ascending });
          break;
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'popular':
          query = query.order('view_count', { ascending: false });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }
    } else {
      query = query.order('created_at', { ascending: false });
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    return query;
  },

  async getProduct(productId) {
    const { data, error } = await supabase
      .from(TABLES.PRODUCTS)
      .select(`
        *,
        seller:users!seller_id(*),
        category:categories!category_id(*),
        images:product_images(*),
        reviews:reviews(rating, comment, reviewer:users!reviewer_id(username))
      `)
      .eq('id', productId)
      .single();

    return { data, error };
  },

  async createProduct(productData) {
    const { data, error } = await supabase
      .from(TABLES.PRODUCTS)
      .insert(productData)
      .select()
      .single();

    return { data, error };
  },

  async updateProduct(productId, updates) {
    return dbHelpers.update(TABLES.PRODUCTS, updates, { id: productId });
  },

  async incrementViewCount(productId) {
    const { data, error } = await supabase.rpc('increment_view_count', {
      product_id: productId
    });

    return { data, error };
  },

  async getUserProducts(userId, status = 'active') {
    return dbHelpers.select(TABLES.PRODUCTS, '*',
      { seller_id: userId, status },
      { orderBy: { column: 'created_at', ascending: false } }
    );
  },
};

// Category service
export const categoryService = {
  async getCategories(parentId = null) {
    return dbHelpers.select(
      TABLES.CATEGORIES,
      '*',
      { parent_id: parentId, is_active: true },
      { orderBy: { column: 'sort_order' } }
    );
  },

  async getCategoryById(categoryId) {
    const { data, error } = await supabase
      .from(TABLES.CATEGORIES)
      .select('*')
      .eq('id', categoryId)
      .single();

    return { data, error };
  },
};

// Order service
export const orderService = {
  async createOrder(orderData) {
    const orderNumber = generateOrderNumber();

    const { data, error } = await supabase
      .from(TABLES.ORDERS)
      .insert({
        ...orderData,
        order_number: orderNumber,
      })
      .select()
      .single();

    return { data, error };
  },

  async createOrderItems(orderItems) {
    return dbHelpers.insert(TABLES.ORDER_ITEMS, orderItems);
  },

  async getUserOrders(userId, type = 'buyer') {
    const filterField = type === 'buyer' ? 'buyer_id' : 'seller_id';

    return dbHelpers.select(
      TABLES.ORDERS,
      `
        *,
        order_items:order_items(*),
        buyer:users!buyer_id(username),
        seller:users!seller_id(username)
      `,
      { [filterField]: userId },
      { orderBy: { column: 'order_date', ascending: false } }
    );
  },

  async updateOrderStatus(orderId, status) {
    const updates = { status };

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
};

// Favorites service
export const favoriteService = {
  async getUserFavorites(userId) {
    const { data, error } = await supabase
      .from(TABLES.FAVORITES)
      .select(`
        *,
        product:products!product_id(
          *,
          seller:users!seller_id(username, trust_score)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    return { data, error };
  },

  async addToFavorites(userId, productId) {
    const { data, error } = await supabase
      .from(TABLES.FAVORITES)
      .insert({ user_id: userId, product_id: productId })
      .select()
      .single();

    return { data, error };
  },

  async removeFromFavorites(userId, productId) {
    return dbHelpers.delete(TABLES.FAVORITES, {
      user_id: userId,
      product_id: productId
    });
  },

  async isFavorite(userId, productId) {
    const { data, error } = await supabase
      .from(TABLES.FAVORITES)
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .single();

    return { isFavorite: !!data, error };
  },
};

// Chat service
export const chatService = {
  async getChatRooms(userId) {
    const { data, error } = await supabase
      .from(TABLES.CHATS)
      .select(`
        *,
        product:products!product_id(title, price_local, currency_code, images),
        buyer:users!buyer_id(username, avatar_url),
        seller:users!seller_id(username, avatar_url),
        last_message:messages!chat_room_id(content, created_at)
      `)
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .eq('is_active', true)
      .order('last_message_at', { ascending: false });

    return { data, error };
  },

  async getChatRoom(productId, buyerId, sellerId) {
    const { data, error } = await supabase
      .from(TABLES.CHATS)
      .select('*')
      .eq('product_id', productId)
      .eq('buyer_id', buyerId)
      .eq('seller_id', sellerId)
      .single();

    return { data, error };
  },

  async createChatRoom(productId, buyerId, sellerId) {
    const { data, error } = await supabase
      .from(TABLES.CHATS)
      .insert({
        product_id: productId,
        buyer_id: buyerId,
        seller_id: sellerId,
      })
      .select()
      .single();

    return { data, error };
  },

  async getMessages(chatRoomId, limit = 50) {
    return dbHelpers.select(
      TABLES.MESSAGES,
      `
        *,
        sender:users!sender_id(username, avatar_url)
      `,
      { chat_room_id: chatRoomId, is_deleted: false },
      {
        orderBy: { column: 'created_at', ascending: false },
        limit
      }
    );
  },

  async sendMessage(messageData) {
    const { data, error } = await supabase
      .from(TABLES.MESSAGES)
      .insert(messageData)
      .select()
      .single();

    // Update chat room last message time
    if (data) {
      await supabase
        .from(TABLES.CHATS)
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', messageData.chat_room_id);
    }

    return { data, error };
  },

  async markMessagesAsRead(chatRoomId, userId) {
    return dbHelpers.update(
      TABLES.MESSAGES,
      { is_read: true, read_at: new Date().toISOString() },
      {
        chat_room_id: chatRoomId,
        is_read: false,
        sender_id: { operator: 'neq', value: userId }
      }
    );
  },
};

// Review service
export const reviewService = {
  async createReview(reviewData) {
    return dbHelpers.insert(TABLES.REVIEWS, reviewData);
  },

  async getUserReviews(userId, type = 'received') {
    const filterField = type === 'received' ? 'reviewed_user_id' : 'reviewer_id';

    return dbHelpers.select(
      TABLES.REVIEWS,
      `
        *,
        reviewer:users!reviewer_id(username, avatar_url),
        product:products!product_id(title, images)
      `,
      { [filterField]: userId, is_visible: true },
      { orderBy: { column: 'created_at', ascending: false } }
    );
  },

  async getProductReviews(productId) {
    return dbHelpers.select(
      TABLES.REVIEWS,
      `
        *,
        reviewer:users!reviewer_id(username, avatar_url)
      `,
      { product_id: productId, is_visible: true },
      { orderBy: { column: 'created_at', ascending: false } }
    );
  },
};

// Earnings service
export const earningsService = {
  async getUserEarnings(userId) {
    return dbHelpers.select(
      TABLES.EARNINGS,
      '*',
      { user_id: userId },
      { orderBy: { column: 'created_at', ascending: false } }
    );
  },

  async createEarning(earningData) {
    return dbHelpers.insert(TABLES.EARNINGS, earningData);
  },

  async getTotalEarnings(userId) {
    const { data, error } = await supabase
      .from(TABLES.EARNINGS)
      .select('amount_wld, amount_local, currency_code, earning_type')
      .eq('user_id', userId)
      .eq('status', 'confirmed');

    if (error) return { data: null, error };

    const totals = data.reduce((acc, earning) => {
      acc.total_wld += parseFloat(earning.amount_wld);
      acc.total_local += parseFloat(earning.amount_local);

      if (!acc.by_type[earning.earning_type]) {
        acc.by_type[earning.earning_type] = {
          wld: 0,
          local: 0,
          count: 0
        };
      }

      acc.by_type[earning.earning_type].wld += parseFloat(earning.amount_wld);
      acc.by_type[earning.earning_type].local += parseFloat(earning.amount_local);
      acc.by_type[earning.earning_type].count++;

      return acc;
    }, {
      total_wld: 0,
      total_local: 0,
      by_type: {}
    });

    return { data: totals, error: null };
  },
};

// Notification service
export const notificationService = {
  async getUserNotifications(userId, limit = 20) {
    return dbHelpers.select(
      TABLES.NOTIFICATIONS,
      '*',
      { user_id: userId },
      {
        orderBy: { column: 'created_at', ascending: false },
        limit
      }
    );
  },

  async createNotification(notificationData) {
    return dbHelpers.insert(TABLES.NOTIFICATIONS, notificationData);
  },

  async markAsRead(notificationId) {
    return dbHelpers.update(
      TABLES.NOTIFICATIONS,
      { is_read: true, read_at: new Date().toISOString() },
      { id: notificationId }
    );
  },

  async markAllAsRead(userId) {
    return dbHelpers.update(
      TABLES.NOTIFICATIONS,
      { is_read: true, read_at: new Date().toISOString() },
      { user_id: userId, is_read: false }
    );
  },
};

// Address service
export const addressService = {
  async getUserAddresses(userId) {
    return dbHelpers.select(
      TABLES.ADDRESSES,
      '*',
      { user_id: userId, is_active: true },
      { orderBy: { column: 'is_default', ascending: false } }
    );
  },

  async createAddress(addressData) {
    // If this is the default address, unset others
    if (addressData.is_default) {
      await supabase
        .from(TABLES.ADDRESSES)
        .update({ is_default: false })
        .eq('user_id', addressData.user_id);
    }

    return dbHelpers.insert(TABLES.ADDRESSES, addressData);
  },

  async updateAddress(addressId, updates) {
    // If setting as default, unset others
    if (updates.is_default) {
      const { data: address } = await supabase
        .from(TABLES.ADDRESSES)
        .select('user_id')
        .eq('id', addressId)
        .single();

      if (address) {
        await supabase
          .from(TABLES.ADDRESSES)
          .update({ is_default: false })
          .eq('user_id', address.user_id);
      }
    }

    return dbHelpers.update(TABLES.ADDRESSES, updates, { id: addressId });
  },

  async deleteAddress(addressId) {
    return dbHelpers.update(
      TABLES.ADDRESSES,
      { is_active: false },
      { id: addressId }
    );
  },
};

// Utility functions
function generateReferralCode(username) {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 6);
  return `${username.substring(0, 4).toUpperCase()}${timestamp}${randomStr}`.toUpperCase();
}

function generateOrderNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();

  return `FG${year}${month}${day}${random}`;
}