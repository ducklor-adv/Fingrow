-- ========================================
-- Reset Database: Keep Only Anatta999
-- ========================================
-- This script will delete ALL data except Anatta999 user
-- Use with caution!

-- Step 1: Delete all notifications
DELETE FROM notifications;

-- Step 2: Delete all reviews
DELETE FROM reviews;

-- Step 3: Delete all order items
DELETE FROM order_items;

-- Step 4: Delete all orders
DELETE FROM orders;

-- Step 5: Delete all products
DELETE FROM products;

-- Step 6: Delete all addresses except Anatta999's
DELETE FROM addresses WHERE user_id != (SELECT id FROM users WHERE username = 'Anatta999');

-- Step 7: Delete all earnings
DELETE FROM earnings;

-- Step 8: Delete fingrow_dna except Anatta999
DELETE FROM fingrow_dna WHERE user_id != (SELECT id FROM users WHERE username = 'Anatta999');

-- Step 9: Delete all users except Anatta999
DELETE FROM users WHERE username != 'Anatta999';

-- Step 10: Reset Anatta999 stats to zero
UPDATE users
SET total_invites = 0,
    active_invites = 0,
    total_sales = 0,
    total_purchases = 0
WHERE username = 'Anatta999';

-- Step 11: Reset Anatta999 DNA stats to zero
UPDATE fingrow_dna
SET child_count = 0,
    follower_count = 0,
    own_finpoint = 0,
    total_finpoint = 0
WHERE user_id = (SELECT id FROM users WHERE username = 'Anatta999');

-- Step 12: Verify results
SELECT 'Users Count:' as info, COUNT(*) as count FROM users
UNION ALL
SELECT 'Products Count:', COUNT(*) FROM products
UNION ALL
SELECT 'Orders Count:', COUNT(*) FROM orders
UNION ALL
SELECT 'Notifications Count:', COUNT(*) FROM notifications
UNION ALL
SELECT 'DNA Records:', COUNT(*) FROM fingrow_dna;

-- Show remaining user
SELECT 'Remaining User:' as info, id, username, full_name, invite_code FROM users;
