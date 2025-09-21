import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Modal,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// Mock reviews data
const mockReviews = [
  {
    id: 'r1',
    productId: 'p1',
    buyerName: '@sakura',
    rating: 5,
    comment: 'สินค้าดีมาก ตรงตามที่อธิบายไว้ ผู้ขายใจดีมาก ส่งไวแพ็คดี แนะนำเลยครับ',
    date: '2025-09-10',
    images: ['https://via.placeholder.com/100'],
    helpful: 12,
    verified: true,
  },
  {
    id: 'r2',
    productId: 'p1',
    buyerName: '@mike',
    rating: 4,
    comment: 'ของดี แต่มีรอยขีดข่วนนิดหน่อย โดยรวมพอใจครับ',
    date: '2025-09-08',
    images: [],
    helpful: 8,
    verified: true,
  },
  {
    id: 'r3',
    productId: 'p1',
    buyerName: '@anna',
    rating: 5,
    comment: 'คุณภาพดีเยี่ยม จัดส่งรวดเร็ว ขอบคุณครับ 👍',
    date: '2025-09-05',
    images: [],
    helpful: 15,
    verified: true,
  },
];

// Mock seller profile data
const mockSellerProfile = {
  username: '@ananya',
  name: 'อนัญญา จันทร์เพ็ญ',
  avatar: 'https://via.placeholder.com/100',
  joinDate: '2024-06-15',
  verifiedWorldID: true,
  verifiedPhone: true,
  verifiedEmail: true,
  stats: {
    totalSales: 128,
    rating: 4.8,
    totalReviews: 95,
    responseRate: 98,
    responseTime: '< 1 ชม.',
    shippingTime: '1-2 วัน',
  },
  badges: [
    { id: 'top_seller', name: 'ผู้ขายยอดนิยม', color: '#f59e0b' },
    { id: 'fast_shipper', name: 'ส่งไว', color: '#10b981' },
    { id: 'great_communication', name: 'สื่อสารดี', color: '#3b82f6' },
  ],
  recentReviews: mockReviews.slice(0, 3),
};

// Star Rating Component
const StarRating = ({ rating, size = 16, color = '#f59e0b', onRate, interactive = false }) => {
  const [currentRating, setCurrentRating] = useState(rating);

  const handlePress = (newRating) => {
    if (interactive) {
      setCurrentRating(newRating);
      onRate?.(newRating);
    }
  };

  return (
    <View style={styles.starContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => handlePress(star)}
          disabled={!interactive}
          hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
        >
          <Ionicons
            name={star <= currentRating ? 'star' : 'star-outline'}
            size={size}
            color={star <= currentRating ? color : '#3f3f46'}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
};

// Rating Summary Component
const RatingSummary = ({ reviews }) => {
  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
    : 0;

  const ratingBreakdown = [5, 4, 3, 2, 1].map(star => {
    const count = reviews.filter(review => review.rating === star).length;
    const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
    return { star, count, percentage };
  });

  return (
    <View style={styles.ratingSummaryContainer}>
      <View style={styles.averageRatingSection}>
        <Text style={styles.averageRatingNumber}>
          {averageRating.toFixed(1)}
        </Text>
        <StarRating rating={averageRating} size={20} />
        <Text style={styles.totalReviewsText}>
          จาก {totalReviews} รีวิว
        </Text>
      </View>

      <View style={styles.ratingBreakdown}>
        {ratingBreakdown.map(({ star, count, percentage }) => (
          <View key={star} style={styles.ratingBreakdownRow}>
            <Text style={styles.ratingBreakdownStar}>{star}</Text>
            <Ionicons name="star" size={14} color="#f59e0b" />
            <View style={styles.ratingProgressBar}>
              <View
                style={[styles.ratingProgressFill, { width: `${percentage}%` }]}
              />
            </View>
            <Text style={styles.ratingCount}>{count}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// Individual Review Component
const ReviewItem = ({ review, onHelpful }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <View style={styles.reviewItem}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewerInfo}>
          <View style={styles.reviewerAvatar}>
            <Text style={styles.reviewerAvatarText}>
              {review.buyerName.charAt(1).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.reviewerName}>{review.buyerName}</Text>
            <View style={styles.reviewMeta}>
              <StarRating rating={review.rating} size={14} />
              <Text style={styles.reviewDate}>{formatDate(review.date)}</Text>
            </View>
          </View>
        </View>
        {review.verified && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#10b981" />
            <Text style={styles.verifiedText}>ยืนยันซื้อแล้ว</Text>
          </View>
        )}
      </View>

      <Text style={styles.reviewComment}>{review.comment}</Text>

      {review.images.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reviewImages}>
          {review.images.map((image, index) => (
            <Image key={index} source={{ uri: image }} style={styles.reviewImage} />
          ))}
        </ScrollView>
      )}

      <View style={styles.reviewActions}>
        <TouchableOpacity
          style={styles.helpfulButton}
          onPress={() => onHelpful?.(review.id)}
        >
          <Ionicons name="thumbs-up-outline" size={16} color="#a1a1aa" />
          <Text style={styles.helpfulText}>
            มีประโยชน์ ({review.helpful})
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Write Review Modal
const WriteReviewModal = ({ visible, product, onClose, onSubmit }) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [images, setImages] = useState([]);

  const handleSubmit = () => {
    if (!comment.trim()) {
      alert('กรุณาเขียนรีวิว');
      return;
    }

    const newReview = {
      id: `r${Date.now()}`,
      productId: product?.id,
      buyerName: '@you',
      rating,
      comment: comment.trim(),
      date: new Date().toISOString().split('T')[0],
      images,
      helpful: 0,
      verified: true,
    };

    onSubmit(newReview);

    // Reset form
    setRating(5);
    setComment('');
    setImages([]);
  };

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.writeReviewContainer}>
        <View style={styles.writeReviewHeader}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#f4f4f5" />
          </TouchableOpacity>
          <Text style={styles.writeReviewTitle}>เขียนรีวิว</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.writeReviewContent}>
          <View style={styles.productInfo}>
            <Image source={{ uri: product?.image }} style={styles.productImage} />
            <Text style={styles.productTitle}>{product?.title}</Text>
          </View>

          <View style={styles.ratingSection}>
            <Text style={styles.ratingLabel}>ให้คะแนนสินค้านี้</Text>
            <StarRating
              rating={rating}
              size={32}
              interactive={true}
              onRate={setRating}
            />
          </View>

          <View style={styles.commentSection}>
            <Text style={styles.commentLabel}>แชร์ประสบการณ์ของคุณ</Text>
            <TextInput
              style={styles.commentInput}
              value={comment}
              onChangeText={setComment}
              placeholder="บอกเล่าเกี่ยวกับคุณภาพสินค้า การบริการ หรือสิ่งที่ผู้ซื้อคนอื่นควรรู้..."
              placeholderTextColor="#71717a"
              multiline
              maxLength={500}
              textAlignVertical="top"
            />
            <Text style={styles.characterCount}>
              {comment.length}/500
            </Text>
          </View>

          <View style={styles.imageSection}>
            <Text style={styles.imageLabel}>เพิ่มรูปภาพ (ไม่บังคับ)</Text>
            <TouchableOpacity style={styles.addImageButton}>
              <Ionicons name="camera" size={24} color="#10b981" />
              <Text style={styles.addImageText}>เพิ่มรูปภาพ</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, !comment.trim() && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!comment.trim()}
          >
            <Text style={styles.submitButtonText}>ส่งรีวิว</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
};

// Seller Profile Modal
const SellerProfileModal = ({ visible, seller, onClose }) => {
  if (!seller) return null;

  const formatJoinDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
    });
  };

  const renderBadge = (badge) => (
    <View key={badge.id} style={[styles.badge, { backgroundColor: `${badge.color}20` }]}>
      <Text style={[styles.badgeText, { color: badge.color }]}>
        {badge.name}
      </Text>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.sellerProfileContainer}>
        <View style={styles.sellerProfileHeader}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="arrow-back" size={24} color="#f4f4f5" />
          </TouchableOpacity>
          <Text style={styles.sellerProfileTitle}>โปรไฟล์ผู้ขาย</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.sellerProfileContent}>
          {/* Seller Info */}
          <View style={styles.sellerInfo}>
            <Image source={{ uri: seller.avatar }} style={styles.sellerAvatar} />
            <View style={styles.sellerDetails}>
              <View style={styles.sellerNameRow}>
                <Text style={styles.sellerName}>{seller.name}</Text>
                {seller.verifiedWorldID && (
                  <Ionicons name="shield-checkmark" size={20} color="#10b981" />
                )}
              </View>
              <Text style={styles.sellerUsername}>{seller.username}</Text>
              <Text style={styles.joinDate}>
                สมาชิกตั้งแต่ {formatJoinDate(seller.joinDate)}
              </Text>
            </View>
          </View>

          {/* Verification Status */}
          <View style={styles.verificationSection}>
            <Text style={styles.sectionTitle}>การยืนยันตัวตน</Text>
            <View style={styles.verificationList}>
              <View style={styles.verificationItem}>
                <Ionicons
                  name={seller.verifiedWorldID ? "checkmark-circle" : "close-circle"}
                  size={16}
                  color={seller.verifiedWorldID ? "#10b981" : "#ef4444"}
                />
                <Text style={styles.verificationText}>World ID</Text>
              </View>
              <View style={styles.verificationItem}>
                <Ionicons
                  name={seller.verifiedPhone ? "checkmark-circle" : "close-circle"}
                  size={16}
                  color={seller.verifiedPhone ? "#10b981" : "#ef4444"}
                />
                <Text style={styles.verificationText}>เบอร์โทรศัพท์</Text>
              </View>
              <View style={styles.verificationItem}>
                <Ionicons
                  name={seller.verifiedEmail ? "checkmark-circle" : "close-circle"}
                  size={16}
                  color={seller.verifiedEmail ? "#10b981" : "#ef4444"}
                />
                <Text style={styles.verificationText}>อีเมล</Text>
              </View>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>สถิติการขาย</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{seller.stats.totalSales}</Text>
                <Text style={styles.statLabel}>ยอดขายทั้งหมด</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{seller.stats.rating}</Text>
                <Text style={styles.statLabel}>คะแนนเฉลี่ย</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{seller.stats.responseRate}%</Text>
                <Text style={styles.statLabel}>อัตราตอบกลับ</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{seller.stats.responseTime}</Text>
                <Text style={styles.statLabel}>เวลาตอบกลับ</Text>
              </View>
            </View>
          </View>

          {/* Badges */}
          <View style={styles.badgesSection}>
            <Text style={styles.sectionTitle}>ป้ายความสำเร็จ</Text>
            <View style={styles.badgesContainer}>
              {seller.badges.map(renderBadge)}
            </View>
          </View>

          {/* Recent Reviews */}
          <View style={styles.recentReviewsSection}>
            <Text style={styles.sectionTitle}>รีวิวล่าสุด</Text>
            {seller.recentReviews.map((review) => (
              <ReviewItem key={review.id} review={review} />
            ))}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

// Main Reviews Component
const ReviewsSystem = ({ product, reviews = mockReviews, onWriteReview }) => {
  const [showWriteReview, setShowWriteReview] = useState(false);
  const [showSellerProfile, setShowSellerProfile] = useState(false);
  const [allReviews, setAllReviews] = useState(reviews);

  const productReviews = allReviews.filter(review => review.productId === product?.id);

  const handleSubmitReview = (newReview) => {
    setAllReviews(prev => [newReview, ...prev]);
    setShowWriteReview(false);
    onWriteReview?.(newReview);
  };

  const handleHelpful = (reviewId) => {
    setAllReviews(prev => prev.map(review =>
      review.id === reviewId
        ? { ...review, helpful: review.helpful + 1 }
        : review
    ));
  };

  return (
    <View style={styles.reviewsContainer}>
      {/* Reviews Header */}
      <View style={styles.reviewsHeader}>
        <Text style={styles.reviewsTitle}>รีวิวและคะแนน</Text>
        <TouchableOpacity
          style={styles.writeReviewButton}
          onPress={() => setShowWriteReview(true)}
        >
          <Text style={styles.writeReviewButtonText}>เขียนรีวิว</Text>
        </TouchableOpacity>
      </View>

      {/* Rating Summary */}
      <RatingSummary reviews={productReviews} />

      {/* Seller Link */}
      <TouchableOpacity
        style={styles.sellerLink}
        onPress={() => setShowSellerProfile(true)}
      >
        <Text style={styles.sellerLinkText}>ดูโปรไฟล์ผู้ขาย</Text>
        <Ionicons name="chevron-forward" size={16} color="#10b981" />
      </TouchableOpacity>

      {/* Reviews List */}
      <View style={styles.reviewsList}>
        {productReviews.length === 0 ? (
          <View style={styles.noReviewsContainer}>
            <Ionicons name="chatbubble-outline" size={48} color="#3f3f46" />
            <Text style={styles.noReviewsText}>ยังไม่มีรีวิว</Text>
            <Text style={styles.noReviewsSubtext}>เป็นคนแรกที่รีวิวสินค้านี้</Text>
          </View>
        ) : (
          productReviews.map((review) => (
            <ReviewItem
              key={review.id}
              review={review}
              onHelpful={handleHelpful}
            />
          ))
        )}
      </View>

      {/* Modals */}
      <WriteReviewModal
        visible={showWriteReview}
        product={product}
        onClose={() => setShowWriteReview(false)}
        onSubmit={handleSubmitReview}
      />

      <SellerProfileModal
        visible={showSellerProfile}
        seller={mockSellerProfile}
        onClose={() => setShowSellerProfile(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  reviewsContainer: {
    backgroundColor: '#09090b',
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  reviewsTitle: {
    color: '#f4f4f5',
    fontSize: 18,
    fontWeight: '600',
  },
  writeReviewButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  writeReviewButtonText: {
    color: '#065f46',
    fontSize: 14,
    fontWeight: '500',
  },
  ratingSummaryContainer: {
    backgroundColor: '#27272a',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  averageRatingSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  averageRatingNumber: {
    color: '#f4f4f5',
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  totalReviewsText: {
    color: '#a1a1aa',
    fontSize: 14,
    marginTop: 4,
  },
  ratingBreakdown: {
    gap: 4,
  },
  ratingBreakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingBreakdownStar: {
    color: '#f4f4f5',
    fontSize: 14,
    width: 12,
  },
  ratingProgressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#3f3f46',
    borderRadius: 4,
    overflow: 'hidden',
  },
  ratingProgressFill: {
    height: '100%',
    backgroundColor: '#f59e0b',
  },
  ratingCount: {
    color: '#a1a1aa',
    fontSize: 14,
    width: 20,
    textAlign: 'right',
  },
  starContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  sellerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 8,
  },
  sellerLinkText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  },
  reviewsList: {
    paddingHorizontal: 16,
  },
  reviewItem: {
    backgroundColor: '#27272a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reviewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3f3f46',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reviewerAvatarText: {
    color: '#f4f4f5',
    fontSize: 16,
    fontWeight: 'bold',
  },
  reviewerName: {
    color: '#f4f4f5',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  reviewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewDate: {
    color: '#a1a1aa',
    fontSize: 12,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  verifiedText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '500',
  },
  reviewComment: {
    color: '#f4f4f5',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  reviewImages: {
    marginBottom: 12,
  },
  reviewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#3f3f46',
  },
  reviewActions: {
    flexDirection: 'row',
  },
  helpfulButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  helpfulText: {
    color: '#a1a1aa',
    fontSize: 12,
  },
  noReviewsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noReviewsText: {
    color: '#f4f4f5',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
  },
  noReviewsSubtext: {
    color: '#a1a1aa',
    fontSize: 14,
    marginTop: 4,
  },
  writeReviewContainer: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  writeReviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  writeReviewTitle: {
    color: '#f4f4f5',
    fontSize: 18,
    fontWeight: '600',
  },
  writeReviewContent: {
    flex: 1,
    padding: 16,
  },
  productInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#3f3f46',
  },
  productTitle: {
    color: '#f4f4f5',
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  ratingSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  ratingLabel: {
    color: '#f4f4f5',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  commentSection: {
    marginBottom: 24,
  },
  commentLabel: {
    color: '#f4f4f5',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  commentInput: {
    backgroundColor: '#27272a',
    borderRadius: 12,
    padding: 16,
    color: '#f4f4f5',
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  characterCount: {
    color: '#71717a',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  imageSection: {
    marginBottom: 32,
  },
  imageLabel: {
    color: '#f4f4f5',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  addImageText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#3f3f46',
  },
  submitButtonText: {
    color: '#065f46',
    fontSize: 16,
    fontWeight: '600',
  },
  sellerProfileContainer: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  sellerProfileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  sellerProfileTitle: {
    color: '#f4f4f5',
    fontSize: 18,
    fontWeight: '600',
  },
  sellerProfileContent: {
    flex: 1,
    padding: 16,
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  sellerAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
    backgroundColor: '#3f3f46',
  },
  sellerDetails: {
    flex: 1,
  },
  sellerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sellerName: {
    color: '#f4f4f5',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  sellerUsername: {
    color: '#10b981',
    fontSize: 16,
    marginBottom: 4,
  },
  joinDate: {
    color: '#a1a1aa',
    fontSize: 14,
  },
  verificationSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#f4f4f5',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  verificationList: {
    backgroundColor: '#27272a',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  verificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verificationText: {
    color: '#f4f4f5',
    fontSize: 14,
  },
  statsSection: {
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#27272a',
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
  },
  statNumber: {
    color: '#10b981',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: '#a1a1aa',
    fontSize: 12,
    textAlign: 'center',
  },
  badgesSection: {
    marginBottom: 20,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  recentReviewsSection: {
    marginBottom: 20,
  },
});

export default ReviewsSystem;
export { StarRating, RatingSummary };