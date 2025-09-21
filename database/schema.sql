-- Fingrow Database Schema
-- This schema supports the complete Fingrow mobile marketplace app

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table with referral system support
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  world_id VARCHAR(255) UNIQUE, -- World ID for authentication
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20),
  full_name VARCHAR(255),
  avatar_url TEXT,
  bio TEXT,

  -- Location and preferences
  location JSONB, -- {city, country, coordinates}
  preferred_currency VARCHAR(3) DEFAULT 'THB',
  language VARCHAR(2) DEFAULT 'th',

  -- Verification and reputation
  is_verified BOOLEAN DEFAULT false,
  verification_level INTEGER DEFAULT 0, -- 0: none, 1: phone, 2: email, 3: worldid, 4: full
  trust_score DECIMAL(3,2) DEFAULT 0.00, -- 0.00 to 5.00
  total_sales INTEGER DEFAULT 0,
  total_purchases INTEGER DEFAULT 0,

  -- Referral system (5-line/7-level MLM)
  referrer_id UUID REFERENCES users(id),
  referral_code VARCHAR(20) UNIQUE NOT NULL,
  referral_level INTEGER DEFAULT 1, -- 1-7 levels
  total_referrals INTEGER DEFAULT 0,
  active_referrals INTEGER DEFAULT 0, -- referrals who made purchases

  -- Account status
  is_active BOOLEAN DEFAULT true,
  is_suspended BOOLEAN DEFAULT false,
  last_login TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  name_th VARCHAR(100), -- Thai translation
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  icon VARCHAR(100), -- Icon name for mobile app
  parent_id UUID REFERENCES categories(id),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL REFERENCES users(id),
  category_id UUID NOT NULL REFERENCES categories(id),

  -- Basic product info
  title VARCHAR(255) NOT NULL,
  description TEXT,
  condition VARCHAR(20) NOT NULL, -- 'ใหม่', 'ดีมาก', 'ดี', 'ปานกลาง', 'เก่า'

  -- Pricing in local currency
  price_local DECIMAL(15,2) NOT NULL,
  currency_code VARCHAR(3) NOT NULL DEFAULT 'THB',
  original_price DECIMAL(15,2), -- Original retail price

  -- Location and shipping
  location JSONB NOT NULL, -- Seller's location for this item
  shipping_options JSONB, -- Array of shipping methods and costs
  pickup_available BOOLEAN DEFAULT false,

  -- Product specifications
  brand VARCHAR(100),
  model VARCHAR(100),
  year_purchased INTEGER,
  warranty_remaining INTEGER, -- months
  included_accessories TEXT[],

  -- Media
  images TEXT[] NOT NULL, -- Array of image URLs
  videos TEXT[], -- Array of video URLs

  -- Availability
  quantity INTEGER DEFAULT 1,
  is_available BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,

  -- Community profit sharing
  community_percentage DECIMAL(4,2) DEFAULT 2.00, -- 2% default for community

  -- Stats
  view_count INTEGER DEFAULT 0,
  favorite_count INTEGER DEFAULT 0,
  inquiry_count INTEGER DEFAULT 0,

  -- Status
  status VARCHAR(20) DEFAULT 'active', -- active, sold, suspended, deleted
  featured_until TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product images table for better organization
CREATE TABLE product_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  alt_text VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(20) UNIQUE NOT NULL,
  buyer_id UUID NOT NULL REFERENCES users(id),
  seller_id UUID NOT NULL REFERENCES users(id),

  -- Order amounts (in buyer's preferred currency)
  subtotal DECIMAL(15,2) NOT NULL,
  shipping_cost DECIMAL(15,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  community_fee DECIMAL(15,2) NOT NULL, -- Community profit sharing amount
  total_amount DECIMAL(15,2) NOT NULL,
  currency_code VARCHAR(3) NOT NULL,

  -- WLD conversion (at time of order)
  wld_rate DECIMAL(15,8) NOT NULL, -- Exchange rate used
  total_wld DECIMAL(15,8) NOT NULL, -- Total in WLD

  -- Shipping information
  shipping_address JSONB NOT NULL,
  shipping_method VARCHAR(50),
  tracking_number VARCHAR(100),

  -- Order status
  status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, shipped, delivered, completed, cancelled, disputed
  payment_status VARCHAR(20) DEFAULT 'pending', -- pending, paid, failed, refunded

  -- Timestamps
  order_date TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Notes
  buyer_notes TEXT,
  seller_notes TEXT,
  admin_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order items table
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(15,2) NOT NULL,
  total_price DECIMAL(15,2) NOT NULL,

  -- Product snapshot at time of order
  product_title VARCHAR(255) NOT NULL,
  product_condition VARCHAR(20) NOT NULL,
  product_image TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews and ratings table
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id),
  reviewer_id UUID NOT NULL REFERENCES users(id),
  reviewed_user_id UUID NOT NULL REFERENCES users(id),
  product_id UUID REFERENCES products(id),

  -- Review content
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  comment TEXT,
  images TEXT[], -- Photo reviews

  -- Review categories
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  item_quality_rating INTEGER CHECK (item_quality_rating >= 1 AND item_quality_rating <= 5),
  shipping_rating INTEGER CHECK (shipping_rating >= 1 AND shipping_rating <= 5),

  -- Status
  is_verified_purchase BOOLEAN DEFAULT true,
  is_visible BOOLEAN DEFAULT true,

  -- Response
  seller_response TEXT,
  seller_response_date TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(order_id, reviewer_id, reviewed_user_id)
);

-- Favorites/Wishlist table
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  product_id UUID NOT NULL REFERENCES products(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, product_id)
);

-- Chat rooms table
CREATE TABLE chat_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id),
  buyer_id UUID NOT NULL REFERENCES users(id),
  seller_id UUID NOT NULL REFERENCES users(id),

  -- Current offer information
  current_offer_amount DECIMAL(15,2),
  current_offer_currency VARCHAR(3),
  offer_status VARCHAR(20) DEFAULT 'none', -- none, pending, accepted, rejected, countered

  -- Room status
  is_active BOOLEAN DEFAULT true,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(product_id, buyer_id, seller_id)
);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id),

  -- Message content
  message_type VARCHAR(20) DEFAULT 'text', -- text, image, offer, system
  content TEXT,
  images TEXT[],

  -- Offer-specific data
  offer_amount DECIMAL(15,2),
  offer_currency VARCHAR(3),
  offer_expires_at TIMESTAMPTZ,

  -- Message status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Referrals tracking table
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID NOT NULL REFERENCES users(id),
  referee_id UUID NOT NULL REFERENCES users(id),
  level INTEGER NOT NULL, -- 1-7 for MLM levels

  -- Tracking
  first_purchase_made BOOLEAN DEFAULT false,
  first_purchase_date TIMESTAMPTZ,
  total_purchases_made INTEGER DEFAULT 0,
  total_purchase_value DECIMAL(15,2) DEFAULT 0,

  -- Commission tracking
  total_commission_earned DECIMAL(15,8) DEFAULT 0, -- In WLD
  last_commission_date TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(referrer_id, referee_id)
);

-- Earnings table for commission tracking
CREATE TABLE earnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  source_order_id UUID REFERENCES orders(id),
  source_user_id UUID REFERENCES users(id), -- Who generated this earning

  -- Earning details
  earning_type VARCHAR(30) NOT NULL, -- referral_commission, community_share, direct_sale
  amount_wld DECIMAL(15,8) NOT NULL,
  amount_local DECIMAL(15,2) NOT NULL,
  currency_code VARCHAR(3) NOT NULL,

  -- Commission details (for referrals)
  referral_level INTEGER, -- 1-7 for MLM
  commission_rate DECIMAL(5,4), -- Percentage used for calculation

  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, paid, cancelled
  paid_at TIMESTAMPTZ,
  payment_transaction_id VARCHAR(255),

  -- Notes
  description TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User addresses table
CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),

  -- Address information
  label VARCHAR(50) NOT NULL, -- 'Home', 'Work', etc.
  recipient_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  address_line1 VARCHAR(255) NOT NULL,
  address_line2 VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  state_province VARCHAR(100),
  postal_code VARCHAR(20) NOT NULL,
  country VARCHAR(2) NOT NULL, -- ISO country code

  -- Location data
  coordinates JSONB, -- {lat, lng}

  -- Status
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),

  -- Notification content
  type VARCHAR(30) NOT NULL, -- order_update, message, earning, system, promotion
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  data JSONB, -- Additional data for mobile app navigation

  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,

  -- Delivery
  push_sent BOOLEAN DEFAULT false,
  push_sent_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment methods table (for future use)
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),

  -- Payment method info
  type VARCHAR(20) NOT NULL, -- worldcoin, bank_transfer, credit_card
  provider VARCHAR(50),
  account_details JSONB, -- Encrypted sensitive data
  display_name VARCHAR(100),

  -- Status
  is_verified BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_referrer_id ON users(referrer_id);
CREATE INDEX idx_users_referral_code ON users(referral_code);
CREATE INDEX idx_users_world_id ON users(world_id);
CREATE INDEX idx_users_email ON users(email);

CREATE INDEX idx_products_seller_id ON products(seller_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_is_available ON products(is_available);
CREATE INDEX idx_products_created_at ON products(created_at);
CREATE INDEX idx_products_price_local ON products(price_local);

CREATE INDEX idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX idx_orders_seller_id ON orders(seller_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_order_date ON orders(order_date);

CREATE INDEX idx_reviews_reviewed_user_id ON reviews(reviewed_user_id);
CREATE INDEX idx_reviews_product_id ON reviews(product_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);

CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_favorites_product_id ON favorites(product_id);

CREATE INDEX idx_messages_chat_room_id ON messages(chat_room_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

CREATE INDEX idx_earnings_user_id ON earnings(user_id);
CREATE INDEX idx_earnings_earning_type ON earnings(earning_type);
CREATE INDEX idx_earnings_status ON earnings(status);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_type ON notifications(type);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chat_rooms_updated_at BEFORE UPDATE ON chat_rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_addresses_updated_at BEFORE UPDATE ON addresses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment_methods FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();