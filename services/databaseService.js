import { initDatabase, getDatabase, TABLES, dbHelpers } from '../lib/database.js';

// Initialize database on service import
let dbInitialized = false;

const ensureDbInitialized = async () => {
  if (!dbInitialized) {
    await initDatabase();
    dbInitialized = true;
  }
};

// User service
export const userService = {
  async getCurrentUser(worldId) {
    await ensureDbInitialized();

    const { data, error } = await dbHelpers.select(
      TABLES.USERS,
      '*',
      { world_id: worldId }
    );

    return { data: data?.[0] || null, error };
  },

  async createUser(userData) {
    await ensureDbInitialized();

    const userToInsert = {
      ...userData,
      referral_code: generateReferralCode(userData.username),
    };

    return await dbHelpers.insert(TABLES.USERS, userToInsert);
  },

  async updateUser(userId, updates) {
    await ensureDbInitialized();
    return await dbHelpers.update(TABLES.USERS, updates, { id: userId });
  },

  async getUserByReferralCode(referralCode) {
    await ensureDbInitialized();

    const { data, error } = await dbHelpers.select(
      TABLES.USERS,
      'id, username, referral_code',
      { referral_code: referralCode }
    );

    return { data: data?.[0] || null, error };
  },

  async getUserReferrals(userId) {
    await ensureDbInitialized();
    return await dbHelpers.select(TABLES.REFERRALS, '*', { referrer_id: userId });
  },
};

// Product service
export const productService = {
  async getProducts(filters = {}, options = {}) {
    await ensureDbInitialized();

    let queryFilters = {
      status: 'active',
      is_available: 1
    };

    if (filters.category_id) {
      queryFilters.category_id = filters.category_id;
    }

    if (filters.condition && Array.isArray(filters.condition)) {
      queryFilters.condition = filters.condition;
    }

    if (filters.price_min && filters.price_max) {
      queryFilters.price_local = {
        operator: 'gte',
        value: filters.price_min
      };
    }

    // For SQLite, we'll handle complex joins differently
    const { data: products, error } = await dbHelpers.select(
      TABLES.PRODUCTS,
      '*',
      queryFilters,
      options
    );

    if (error || !products) return { data: null, error };

    // Get seller and category info separately
    for (let product of products) {
      const { data: seller } = await dbHelpers.select(
        TABLES.USERS,
        'id, username, trust_score, is_verified',
        { id: product.seller_id }
      );

      const { data: category } = await dbHelpers.select(
        TABLES.CATEGORIES,
        'name, name_th, slug',
        { id: product.category_id }
      );

      product.seller = seller?.[0] || null;
      product.category = category?.[0] || null;
    }

    return { data: products, error: null };
  },

  async getProduct(productId) {
    await ensureDbInitialized();

    const { data: products, error } = await dbHelpers.select(
      TABLES.PRODUCTS,
      '*',
      { id: productId }
    );

    if (error || !products?.[0]) return { data: null, error };

    const product = products[0];

    // Get related data
    const { data: seller } = await dbHelpers.select(
      TABLES.USERS, '*', { id: product.seller_id }
    );

    const { data: category } = await dbHelpers.select(
      TABLES.CATEGORIES, '*', { id: product.category_id }
    );

    const { data: images } = await dbHelpers.select(
      TABLES.PRODUCT_IMAGES, '*', { product_id: productId }
    );

    const { data: reviews } = await dbHelpers.select(
      TABLES.REVIEWS, '*', { product_id: productId }
    );

    // Add reviewer info to reviews
    for (let review of reviews || []) {
      const { data: reviewer } = await dbHelpers.select(
        TABLES.USERS, 'username', { id: review.reviewer_id }
      );
      review.reviewer = reviewer?.[0] || null;
    }

    product.seller = seller?.[0] || null;
    product.category = category?.[0] || null;
    product.images = images || [];
    product.reviews = reviews || [];

    return { data: product, error: null };
  },

  async createProduct(productData) {
    await ensureDbInitialized();
    return await dbHelpers.insert(TABLES.PRODUCTS, productData);
  },

  async updateProduct(productId, updates) {
    await ensureDbInitialized();
    return await dbHelpers.update(TABLES.PRODUCTS, updates, { id: productId });
  },

  async incrementViewCount(productId) {
    await ensureDbInitialized();

    // Get current view count
    const { data } = await dbHelpers.select(
      TABLES.PRODUCTS,
      'view_count',
      { id: productId }
    );

    const currentCount = data?.[0]?.view_count || 0;

    return await dbHelpers.update(
      TABLES.PRODUCTS,
      { view_count: currentCount + 1 },
      { id: productId }
    );
  },

  async getUserProducts(userId, status = 'active') {
    await ensureDbInitialized();
    return await dbHelpers.select(
      TABLES.PRODUCTS,
      '*',
      { seller_id: userId, status },
      { orderBy: { column: 'created_at', ascending: false } }
    );
  },
};

// Category service
export const categoryService = {
  async getCategories(parentId = null) {
    await ensureDbInitialized();
    return await dbHelpers.select(
      TABLES.CATEGORIES,
      '*',
      { parent_id: parentId, is_active: 1 },
      { orderBy: { column: 'sort_order' } }
    );
  },

  async getCategoryById(categoryId) {
    await ensureDbInitialized();
    const { data, error } = await dbHelpers.select(
      TABLES.CATEGORIES,
      '*',
      { id: categoryId }
    );

    return { data: data?.[0] || null, error };
  },
};

// Order service
export const orderService = {
  async createOrder(orderData) {
    await ensureDbInitialized();

    const orderToInsert = {
      ...orderData,
      order_number: generateOrderNumber(),
    };

    return await dbHelpers.insert(TABLES.ORDERS, orderToInsert);
  },

  async createOrderItems(orderItems) {
    await ensureDbInitialized();
    return await dbHelpers.insert(TABLES.ORDER_ITEMS, orderItems);
  },

  async getUserOrders(userId, type = 'buyer') {
    await ensureDbInitialized();

    const filterField = type === 'buyer' ? 'buyer_id' : 'seller_id';

    const { data: orders, error } = await dbHelpers.select(
      TABLES.ORDERS,
      '*',
      { [filterField]: userId },
      { orderBy: { column: 'order_date', ascending: false } }
    );

    if (error || !orders) return { data: null, error };

    // Get order items and user info
    for (let order of orders) {
      const { data: orderItems } = await dbHelpers.select(
        TABLES.ORDER_ITEMS, '*', { order_id: order.id }
      );

      const { data: buyer } = await dbHelpers.select(
        TABLES.USERS, 'username', { id: order.buyer_id }
      );

      const { data: seller } = await dbHelpers.select(
        TABLES.USERS, 'username', { id: order.seller_id }
      );

      order.order_items = orderItems || [];
      order.buyer = buyer?.[0] || null;
      order.seller = seller?.[0] || null;
    }

    return { data: orders, error: null };
  },

  async updateOrderStatus(orderId, status) {
    await ensureDbInitialized();

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

    return await dbHelpers.update(TABLES.ORDERS, updates, { id: orderId });
  },
};

// Favorites service
export const favoriteService = {
  async getUserFavorites(userId) {
    await ensureDbInitialized();

    const { data: favorites, error } = await dbHelpers.select(
      TABLES.FAVORITES,
      '*',
      { user_id: userId },
      { orderBy: { column: 'created_at', ascending: false } }
    );

    if (error || !favorites) return { data: null, error };

    // Get product info for each favorite
    for (let favorite of favorites) {
      const { data: products } = await dbHelpers.select(
        TABLES.PRODUCTS, '*', { id: favorite.product_id }
      );

      if (products?.[0]) {
        const { data: seller } = await dbHelpers.select(
          TABLES.USERS, 'username, trust_score', { id: products[0].seller_id }
        );

        products[0].seller = seller?.[0] || null;
        favorite.product = products[0];
      }
    }

    return { data: favorites, error: null };
  },

  async addToFavorites(userId, productId) {
    await ensureDbInitialized();
    return await dbHelpers.insert(TABLES.FAVORITES, {
      user_id: userId,
      product_id: productId
    });
  },

  async removeFromFavorites(userId, productId) {
    await ensureDbInitialized();
    return await dbHelpers.delete(TABLES.FAVORITES, {
      user_id: userId,
      product_id: productId
    });
  },

  async isFavorite(userId, productId) {
    await ensureDbInitialized();
    const { data, error } = await dbHelpers.select(
      TABLES.FAVORITES,
      'id',
      { user_id: userId, product_id: productId }
    );

    return { isFavorite: !!data?.[0], error };
  },
};

// Chat service
export const chatService = {
  async getChatRooms(userId) {
    await ensureDbInitialized();

    // SQLite doesn't support OR in our helper, so we'll need to do two queries
    const { data: buyerRooms } = await dbHelpers.select(
      TABLES.CHAT_ROOMS, '*', { buyer_id: userId, is_active: 1 }
    );

    const { data: sellerRooms } = await dbHelpers.select(
      TABLES.CHAT_ROOMS, '*', { seller_id: userId, is_active: 1 }
    );

    const allRooms = [...(buyerRooms || []), ...(sellerRooms || [])];

    // Get related data for each room
    for (let room of allRooms) {
      const { data: product } = await dbHelpers.select(
        TABLES.PRODUCTS,
        'title, price_local, currency_code, images',
        { id: room.product_id }
      );

      const { data: buyer } = await dbHelpers.select(
        TABLES.USERS,
        'username, avatar_url',
        { id: room.buyer_id }
      );

      const { data: seller } = await dbHelpers.select(
        TABLES.USERS,
        'username, avatar_url',
        { id: room.seller_id }
      );

      const { data: lastMessage } = await dbHelpers.select(
        TABLES.MESSAGES,
        'content, created_at',
        { chat_room_id: room.id },
        { orderBy: { column: 'created_at', ascending: false }, limit: 1 }
      );

      room.product = product?.[0] || null;
      room.buyer = buyer?.[0] || null;
      room.seller = seller?.[0] || null;
      room.last_message = lastMessage?.[0] || null;
    }

    // Sort by last_message_at
    allRooms.sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));

    return { data: allRooms, error: null };
  },

  async getChatRoom(productId, buyerId, sellerId) {
    await ensureDbInitialized();

    const { data, error } = await dbHelpers.select(
      TABLES.CHAT_ROOMS,
      '*',
      {
        product_id: productId,
        buyer_id: buyerId,
        seller_id: sellerId
      }
    );

    return { data: data?.[0] || null, error };
  },

  async createChatRoom(productId, buyerId, sellerId) {
    await ensureDbInitialized();

    return await dbHelpers.insert(TABLES.CHAT_ROOMS, {
      product_id: productId,
      buyer_id: buyerId,
      seller_id: sellerId,
    });
  },

  async getMessages(chatRoomId, limit = 50) {
    await ensureDbInitialized();

    const { data: messages, error } = await dbHelpers.select(
      TABLES.MESSAGES,
      '*',
      { chat_room_id: chatRoomId, is_deleted: 0 },
      {
        orderBy: { column: 'created_at', ascending: false },
        limit
      }
    );

    if (error || !messages) return { data: null, error };

    // Get sender info for each message
    for (let message of messages) {
      const { data: sender } = await dbHelpers.select(
        TABLES.USERS,
        'username, avatar_url',
        { id: message.sender_id }
      );

      message.sender = sender?.[0] || null;
    }

    return { data: messages, error: null };
  },

  async sendMessage(messageData) {
    await ensureDbInitialized();

    const result = await dbHelpers.insert(TABLES.MESSAGES, messageData);

    // Update chat room last message time
    if (result.data) {
      await dbHelpers.update(
        TABLES.CHAT_ROOMS,
        { last_message_at: new Date().toISOString() },
        { id: messageData.chat_room_id }
      );
    }

    return result;
  },

  async markMessagesAsRead(chatRoomId, userId) {
    await ensureDbInitialized();

    // Get unread messages from other users
    const { data: messages } = await dbHelpers.select(
      TABLES.MESSAGES,
      'id',
      {
        chat_room_id: chatRoomId,
        is_read: 0
      }
    );

    // Filter out messages from the current user
    const messagesToUpdate = messages?.filter(msg => msg.sender_id !== userId) || [];

    // Update each message
    for (let message of messagesToUpdate) {
      await dbHelpers.update(
        TABLES.MESSAGES,
        { is_read: 1, read_at: new Date().toISOString() },
        { id: message.id }
      );
    }

    return { data: { updated: messagesToUpdate.length }, error: null };
  },
};

// Review service
export const reviewService = {
  async createReview(reviewData) {
    await ensureDbInitialized();
    return await dbHelpers.insert(TABLES.REVIEWS, reviewData);
  },

  async getUserReviews(userId, type = 'received') {
    await ensureDbInitialized();

    const filterField = type === 'received' ? 'reviewed_user_id' : 'reviewer_id';

    const { data: reviews, error } = await dbHelpers.select(
      TABLES.REVIEWS,
      '*',
      { [filterField]: userId, is_visible: 1 },
      { orderBy: { column: 'created_at', ascending: false } }
    );

    if (error || !reviews) return { data: null, error };

    // Get reviewer and product info
    for (let review of reviews) {
      const { data: reviewer } = await dbHelpers.select(
        TABLES.USERS,
        'username, avatar_url',
        { id: review.reviewer_id }
      );

      const { data: product } = await dbHelpers.select(
        TABLES.PRODUCTS,
        'title, images',
        { id: review.product_id }
      );

      review.reviewer = reviewer?.[0] || null;
      review.product = product?.[0] || null;
    }

    return { data: reviews, error: null };
  },

  async getProductReviews(productId) {
    await ensureDbInitialized();

    const { data: reviews, error } = await dbHelpers.select(
      TABLES.REVIEWS,
      '*',
      { product_id: productId, is_visible: 1 },
      { orderBy: { column: 'created_at', ascending: false } }
    );

    if (error || !reviews) return { data: null, error };

    // Get reviewer info
    for (let review of reviews) {
      const { data: reviewer } = await dbHelpers.select(
        TABLES.USERS,
        'username, avatar_url',
        { id: review.reviewer_id }
      );

      review.reviewer = reviewer?.[0] || null;
    }

    return { data: reviews, error: null };
  },
};

// Earnings service
export const earningsService = {
  async getUserEarnings(userId) {
    await ensureDbInitialized();
    return await dbHelpers.select(
      TABLES.EARNINGS,
      '*',
      { user_id: userId },
      { orderBy: { column: 'created_at', ascending: false } }
    );
  },

  async createEarning(earningData) {
    await ensureDbInitialized();
    return await dbHelpers.insert(TABLES.EARNINGS, earningData);
  },

  async getTotalEarnings(userId) {
    await ensureDbInitialized();

    const { data: earnings, error } = await dbHelpers.select(
      TABLES.EARNINGS,
      'amount_wld, amount_local, currency_code, earning_type',
      { user_id: userId, status: 'confirmed' }
    );

    if (error || !earnings) return { data: null, error };

    const totals = earnings.reduce((acc, earning) => {
      acc.total_wld += parseFloat(earning.amount_wld || 0);
      acc.total_local += parseFloat(earning.amount_local || 0);

      if (!acc.by_type[earning.earning_type]) {
        acc.by_type[earning.earning_type] = {
          wld: 0,
          local: 0,
          count: 0
        };
      }

      acc.by_type[earning.earning_type].wld += parseFloat(earning.amount_wld || 0);
      acc.by_type[earning.earning_type].local += parseFloat(earning.amount_local || 0);
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
    await ensureDbInitialized();
    return await dbHelpers.select(
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
    await ensureDbInitialized();
    return await dbHelpers.insert(TABLES.NOTIFICATIONS, notificationData);
  },

  async markAsRead(notificationId) {
    await ensureDbInitialized();
    return await dbHelpers.update(
      TABLES.NOTIFICATIONS,
      { is_read: 1, read_at: new Date().toISOString() },
      { id: notificationId }
    );
  },

  async markAllAsRead(userId) {
    await ensureDbInitialized();
    return await dbHelpers.update(
      TABLES.NOTIFICATIONS,
      { is_read: 1, read_at: new Date().toISOString() },
      { user_id: userId, is_read: 0 }
    );
  },
};

// Address service
export const addressService = {
  async getUserAddresses(userId) {
    await ensureDbInitialized();
    return await dbHelpers.select(
      TABLES.ADDRESSES,
      '*',
      { user_id: userId, is_active: 1 },
      { orderBy: { column: 'is_default', ascending: false } }
    );
  },

  async createAddress(addressData) {
    await ensureDbInitialized();

    // If this is the default address, unset others
    if (addressData.is_default) {
      await dbHelpers.update(
        TABLES.ADDRESSES,
        { is_default: 0 },
        { user_id: addressData.user_id }
      );
    }

    return await dbHelpers.insert(TABLES.ADDRESSES, addressData);
  },

  async updateAddress(addressId, updates) {
    await ensureDbInitialized();

    // If setting as default, unset others
    if (updates.is_default) {
      const { data } = await dbHelpers.select(
        TABLES.ADDRESSES,
        'user_id',
        { id: addressId }
      );

      if (data?.[0]) {
        await dbHelpers.update(
          TABLES.ADDRESSES,
          { is_default: 0 },
          { user_id: data[0].user_id }
        );
      }
    }

    return await dbHelpers.update(TABLES.ADDRESSES, updates, { id: addressId });
  },

  async deleteAddress(addressId) {
    await ensureDbInitialized();
    return await dbHelpers.update(
      TABLES.ADDRESSES,
      { is_active: 0 },
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