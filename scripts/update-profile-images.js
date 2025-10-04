import Database from 'better-sqlite3';
const db = new Database('./data/fingrow.db');

console.log('🖼️  Updating profile images from mock data...\n');

// Mock avatar images from Unsplash
const avatarPool = [
    'https://images.unsplash.com/photo-1494790108755-2616b612b647?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1488161628813-04466f872be2?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=150&h=150&fit=crop&crop=face',
];

// Get all users except root users
const users = db.prepare(`
    SELECT id, username
    FROM users
    WHERE avatar_url IS NULL
    ORDER BY id
`).all();

console.log(`Found ${users.length} users without profile images`);

// Update each user with a random avatar
const updateStmt = db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?');

let updated = 0;
users.forEach((user, index) => {
    // Skip root users
    if (user.username === 'Anatta999' || user.username === 'Anatta Root') {
        console.log(`⏭️  Skipping root user: ${user.username}`);
        return;
    }

    // Assign avatar in round-robin fashion
    const avatarUrl = avatarPool[index % avatarPool.length];
    updateStmt.run(avatarUrl, user.id);
    updated++;
    console.log(`✅ ${user.username} → ${avatarUrl}`);
});

console.log(`\n✨ Updated ${updated} users with profile images`);

// Verify
const withImages = db.prepare('SELECT COUNT(*) as count FROM users WHERE avatar_url IS NOT NULL').get();
console.log(`📊 Total users with images: ${withImages.count}`);

db.close();
