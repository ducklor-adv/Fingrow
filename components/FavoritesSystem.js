import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { favoriteService, userService } from '../services/databaseService';

// Context for managing favorites
import { createContext, useContext } from 'react';

const FavoritesContext = createContext({
  favorites: [],
  addToFavorites: () => {},
  removeFromFavorites: () => {},
  isFavorite: () => false,
  clearAllFavorites: () => {},
});

export const FavoritesProvider = ({ children }) => {
  const [favorites, setFavorites] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    initializeUser();
  }, []);

  const initializeUser = async () => {
    try {
      const user = await userService.getCurrentUser();
      if (user) {
        setCurrentUser(user);
        loadFavorites(user.id);
      }
    } catch (error) {
      console.log('Error initializing user:', error);
    }
  };

  const loadFavorites = async (userId) => {
    try {
      const { data, error } = await favoriteService.getUserFavorites(userId);
      if (data && !error) {
        // Transform data to match component expectations
        const transformedFavorites = data.map(fav => ({
          id: fav.product.id,
          title: fav.product.title,
          priceLocal: fav.product.price_local,
          seller: `@${fav.product.seller.username}`,
          pct: fav.product.community_percentage,
          condition: fav.product.condition,
          image: fav.product.images?.[0] || "https://via.placeholder.com/150",
          savedAt: fav.created_at,
        }));
        setFavorites(transformedFavorites);
      }
    } catch (error) {
      console.log('Error loading favorites:', error);
    }
  };

  const addToFavorites = async (item) => {
    if (!currentUser) return;

    try {
      const { data, error } = await favoriteService.addToFavorites(currentUser.id, item.id);
      if (data && !error) {
        const newFavorite = {
          ...item,
          savedAt: new Date().toISOString(),
        };
        const newFavorites = [newFavorite, ...favorites.filter(fav => fav.id !== item.id)];
        setFavorites(newFavorites);
      }
    } catch (error) {
      console.log('Error adding to favorites:', error);
    }
  };

  const removeFromFavorites = async (itemId) => {
    if (!currentUser) return;

    try {
      const { error } = await favoriteService.removeFromFavorites(currentUser.id, itemId);
      if (!error) {
        const newFavorites = favorites.filter(fav => fav.id !== itemId);
        setFavorites(newFavorites);
      }
    } catch (error) {
      console.log('Error removing from favorites:', error);
    }
  };

  const isFavorite = (itemId) => {
    return favorites.some(fav => fav.id === itemId);
  };

  const clearAllFavorites = async () => {
    if (!currentUser) return;

    try {
      // Remove all favorites from database
      await Promise.all(
        favorites.map(fav =>
          favoriteService.removeFromFavorites(currentUser.id, fav.id)
        )
      );
      setFavorites([]);
    } catch (error) {
      console.log('Error clearing favorites:', error);
    }
  };

  return (
    <FavoritesContext.Provider value={{
      favorites,
      addToFavorites,
      removeFromFavorites,
      isFavorite,
      clearAllFavorites,
    }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => useContext(FavoritesContext);

// Favorite Heart Button Component
export const FavoriteButton = ({ item, size = 24, style = {} }) => {
  const { addToFavorites, removeFromFavorites, isFavorite } = useFavorites();
  const isLiked = isFavorite(item.id);

  const toggleFavorite = () => {
    if (isLiked) {
      removeFromFavorites(item.id);
    } else {
      addToFavorites(item);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.favoriteButton, style]}
      onPress={toggleFavorite}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Ionicons
        name={isLiked ? "heart" : "heart-outline"}
        size={size}
        color={isLiked ? "#ef4444" : "#a1a1aa"}
      />
    </TouchableOpacity>
  );
};

// Favorites List Modal
const FavoritesModal = ({ visible, onClose, onSelectItem, currency }) => {
  const { favorites, removeFromFavorites, clearAllFavorites } = useFavorites();

  const formatNumber = (number, locale) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(number);

  const toWLD = (localPrice, rate) => (rate ? localPrice / rate : 0);

  const formatRelativeTime = (dateString) => {
    const now = new Date();
    const savedDate = new Date(dateString);
    const diffInHours = Math.floor((now - savedDate) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'เมื่อสักครู่';
    if (diffInHours < 24) return `${diffInHours} ชั่วโมงที่แล้ว`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} วันที่แล้ว`;
    const diffInWeeks = Math.floor(diffInDays / 7);
    return `${diffInWeeks} สัปดาห์ที่แล้ว`;
  };

  const handleClearAll = () => {
    Alert.alert(
      'ล้างรายการโปรด',
      'คุณต้องการลบสินค้าที่บันทึกไว้ทั้งหมดหรือไม่?',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ลบทั้งหมด',
          style: 'destructive',
          onPress: clearAllFavorites,
        },
      ]
    );
  };

  const handleRemoveItem = (itemId, itemTitle) => {
    Alert.alert(
      'ลบออกจากรายการโปรด',
      `ลบ "${itemTitle}" ออกจากรายการโปรด?`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ลบ',
          style: 'destructive',
          onPress: () => removeFromFavorites(itemId),
        },
      ]
    );
  };

  const renderFavoriteItem = ({ item }) => {
    const wldPrice = toWLD(item.priceLocal, currency.rate);

    return (
      <View style={styles.favoriteItem}>
        <TouchableOpacity
          style={styles.favoriteItemContent}
          onPress={() => {
            onSelectItem(item);
            onClose();
          }}
        >
          <Image source={{ uri: item.image }} style={styles.favoriteItemImage} />
          <View style={styles.favoriteItemDetails}>
            <Text style={styles.favoriteItemTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.favoriteItemCondition}>
              สภาพ: {item.condition} • {item.seller}
            </Text>
            <View style={styles.favoriteItemPrice}>
              <View>
                <Text style={styles.favoriteItemPriceLocal}>
                  {formatNumber(item.priceLocal, currency.locale)} {currency.code}
                </Text>
                <Text style={styles.favoriteItemPriceWLD}>
                  ≈ {formatNumber(wldPrice, currency.locale)} WLD
                </Text>
              </View>
              <Text style={styles.favoriteItemCommunity}>
                ชุมชน {item.pct}%
              </Text>
            </View>
            <Text style={styles.favoriteItemSavedAt}>
              บันทึกไว้ {formatRelativeTime(item.savedAt)}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveItem(item.id, item.title)}
        >
          <Ionicons name="trash-outline" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>
    );
  };

  const EmptyFavorites = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="heart-outline" size={64} color="#3f3f46" />
      <Text style={styles.emptyTitle}>ไม่มีรายการโปรด</Text>
      <Text style={styles.emptySubtitle}>
        กดไอคอนหัวใจที่สินค้าเพื่อบันทึกไว้ที่นี่
      </Text>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="arrow-back" size={24} color="#f4f4f5" />
          </TouchableOpacity>

          <View style={styles.modalHeaderCenter}>
            <Text style={styles.modalTitle}>รายการโปรด</Text>
            <Text style={styles.modalSubtitle}>
              {favorites.length} รายการ
            </Text>
          </View>

          {favorites.length > 0 && (
            <TouchableOpacity onPress={handleClearAll}>
              <Text style={styles.clearAllButton}>ล้างทั้งหมด</Text>
            </TouchableOpacity>
          )}
        </View>

        {favorites.length === 0 ? (
          <EmptyFavorites />
        ) : (
          <FlatList
            data={favorites}
            renderItem={renderFavoriteItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.favoritesList}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </Modal>
  );
};

// Main Favorites System Component
const FavoritesSystem = ({ children, currency }) => {
  const [showFavorites, setShowFavorites] = useState(false);
  const { favorites } = useFavorites();

  const openFavorites = () => {
    setShowFavorites(true);
  };

  const closeFavorites = () => {
    setShowFavorites(false);
  };

  const handleSelectItem = (item) => {
    // This would typically navigate to the product detail
    console.log('Selected favorite item:', item);
  };

  return (
    <>
      {children({ openFavorites, favoritesCount: favorites.length })}

      <FavoritesModal
        visible={showFavorites}
        onClose={closeFavorites}
        onSelectItem={handleSelectItem}
        currency={currency}
      />
    </>
  );
};

const styles = StyleSheet.create({
  favoriteButton: {
    padding: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  modalHeaderCenter: {
    alignItems: 'center',
  },
  modalTitle: {
    color: '#f4f4f5',
    fontSize: 18,
    fontWeight: '600',
  },
  modalSubtitle: {
    color: '#a1a1aa',
    fontSize: 12,
    marginTop: 2,
  },
  clearAllButton: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '500',
  },
  favoritesList: {
    padding: 16,
  },
  favoriteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(39, 39, 42, 0.7)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  favoriteItemContent: {
    flex: 1,
    flexDirection: 'row',
  },
  favoriteItemImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#27272a',
    marginRight: 12,
  },
  favoriteItemDetails: {
    flex: 1,
  },
  favoriteItemTitle: {
    color: '#f4f4f5',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  favoriteItemCondition: {
    color: '#a1a1aa',
    fontSize: 12,
    marginBottom: 6,
  },
  favoriteItemPrice: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  favoriteItemPriceLocal: {
    color: '#f4f4f5',
    fontSize: 14,
    fontWeight: '600',
  },
  favoriteItemPriceWLD: {
    color: '#a1a1aa',
    fontSize: 11,
  },
  favoriteItemCommunity: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '500',
  },
  favoriteItemSavedAt: {
    color: '#71717a',
    fontSize: 10,
  },
  removeButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: '#f4f4f5',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#a1a1aa',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default FavoritesSystem;
export { FavoritesProvider, FavoriteButton };