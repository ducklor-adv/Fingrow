import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'data', 'fingrow.db');
const db = new Database(dbPath);

console.log('🌳 Network Structure Analysis\n');
console.log('='.repeat(80));

// 1. Analyze parent-child relationships
console.log('\n📊 Part 1: Parent-Child Relationships\n');

const relationships = db.prepare(`
    SELECT
        parent_id,
        COUNT(*) as direct_children
    FROM users
    WHERE parent_id IS NOT NULL
    GROUP BY parent_id
    ORDER BY direct_children DESC
`).all();

console.log('Parents with direct children:');
relationships.forEach(r => {
    const parent = db.prepare('SELECT username FROM users WHERE id = ?').get(r.parent_id);
    console.log(`  ${parent?.username || r.parent_id}: ${r.direct_children} direct children`);
});

// 2. Test recursive CTE for subtree
console.log('\n\n📊 Part 2: Recursive Subtree Test (Using parent_id)\n');

// Example: Get Anatta Root's entire network
const rootUser = db.prepare("SELECT id, username FROM users WHERE username = 'Anatta Root'").get();

if (rootUser) {
    console.log(`Testing subtree for: ${rootUser.username} (${rootUser.id})\n`);

    // Recursive CTE to get all descendants
    const subtree = db.prepare(`
        WITH RECURSIVE network_tree AS (
            -- Base case: the root user
            SELECT
                id,
                username,
                parent_id,
                0 as depth
            FROM users
            WHERE id = ?

            UNION ALL

            -- Recursive case: children of current level
            SELECT
                u.id,
                u.username,
                u.parent_id,
                nt.depth + 1 as depth
            FROM users u
            INNER JOIN network_tree nt ON u.parent_id = nt.id
            WHERE nt.depth < 7  -- Max 7 levels
        )
        SELECT * FROM network_tree
        ORDER BY depth, username
    `).all(rootUser.id);

    console.log(`Total network members: ${subtree.length}\n`);

    // Group by depth
    const byDepth = {};
    subtree.forEach(node => {
        if (!byDepth[node.depth]) byDepth[node.depth] = [];
        byDepth[node.depth].push(node);
    });

    Object.keys(byDepth).forEach(depth => {
        console.log(`Level ${depth}: ${byDepth[depth].length} members`);
        if (depth < 3) {
            byDepth[depth].forEach(m => {
                console.log(`  - ${m.username} (${m.id})`);
            });
        }
    });
}

// 3. Calculate network fees (subtree paid fees)
console.log('\n\n📊 Part 3: Network Fees Calculation\n');

if (rootUser) {
    // Get all network member IDs
    const networkIds = db.prepare(`
        WITH RECURSIVE network_tree AS (
            SELECT id FROM users WHERE id = ?
            UNION ALL
            SELECT u.id FROM users u
            INNER JOIN network_tree nt ON u.parent_id = nt.id
        )
        SELECT id FROM network_tree
    `).all(rootUser.id).map(r => r.id);

    console.log(`Network size: ${networkIds.length} members\n`);

    // Calculate total fees paid by this network
    const networkFees = db.prepare(`
        SELECT
            COUNT(DISTINCT o.seller_id) as sellers_count,
            COUNT(*) as total_orders,
            SUM(o.community_fee) as total_fees_paid
        FROM orders o
        WHERE o.seller_id IN (${networkIds.map(() => '?').join(',')})
        AND o.status = 'completed'
    `).get(...networkIds);

    console.log(`Network Statistics for ${rootUser.username}:`);
    console.log(`  Members: ${networkIds.length}`);
    console.log(`  Sellers in network: ${networkFees.sellers_count || 0}`);
    console.log(`  Total orders: ${networkFees.total_orders || 0}`);
    console.log(`  Total fees paid by network: ${networkFees.total_fees_paid?.toLocaleString() || 0} THB`);
}

// 4. Test with multiple users
console.log('\n\n📊 Part 4: Compare Multiple Networks\n');

const testUsers = ['Anatta999', 'Anatta Root', 'User1'];

testUsers.forEach(username => {
    const user = db.prepare('SELECT id, username FROM users WHERE username = ?').get(username);
    if (!user) return;

    // Get network size
    const networkIds = db.prepare(`
        WITH RECURSIVE network_tree AS (
            SELECT id FROM users WHERE id = ?
            UNION ALL
            SELECT u.id FROM users u
            INNER JOIN network_tree nt ON u.parent_id = nt.id
            WHERE nt.id != ?  -- Prevent infinite loop
        )
        SELECT id FROM network_tree
    `).all(user.id, user.id).map(r => r.id);

    // Get network fees
    let networkFees = { total_fees_paid: 0, total_orders: 0 };
    if (networkIds.length > 0) {
        const placeholders = networkIds.map(() => '?').join(',');
        networkFees = db.prepare(`
            SELECT
                SUM(o.community_fee) as total_fees_paid,
                COUNT(*) as total_orders
            FROM orders o
            WHERE o.seller_id IN (${placeholders})
            AND o.status = 'completed'
        `).get(...networkIds) || networkFees;
    }

    console.log(`${user.username}:`);
    console.log(`  Network size: ${networkIds.length} members (including self)`);
    console.log(`  Network orders: ${networkFees.total_orders || 0}`);
    console.log(`  Network fees: ${networkFees.total_fees_paid?.toLocaleString() || 0} THB`);
    console.log('');
});

// 5. Proposed column additions
console.log('='.repeat(80));
console.log('\n💡 Proposed New Columns for Admin UI:\n');
console.log('  1. "Network Size" - จำนวนสมาชิกในเครือข่าย (รวมตัวเอง)');
console.log('  2. "Network Fees" - ค่าธรรมเนียมรวมจากเครือข่ายทั้งหมด');
console.log('  3. "Network Sales" - ยอดขายรวมจากเครือข่าย (optional)');
console.log('\nCalculation Method:');
console.log('  - Use SQLite Recursive CTE (WITH RECURSIVE)');
console.log('  - Follow parent_id edges to build subtree');
console.log('  - Sum community_fee from all network members');
console.log('  - Enforce 7-level depth limit');

console.log('\n' + '='.repeat(80));

db.close();
