/**
 * ACF Report - Admin Dashboard
 * Connected to real database via API
 */

const ACF_CONFIG = {
    SYSTEM_ROOT_ID: 'Anatta999', // Default root user (will be loaded from database)
    MAX_CHILDREN: 5,
    MAX_DEPTH: 7
};

// Get API base URL from config
const API_BASE_URL = window.getApiUrl ? window.getApiUrl().replace('/api', '') : 'http://localhost:5050';

let allUsers = [];
let dnaData = [];
let currentACFRoot = null; // Current ACF root from database
let acfDataLoaded = false; // Track if data has been loaded

// Initialize when ACF Report page is accessed
// Note: This will be called by admin.js when navigating to #acf-report
window.initACFReport = function() {
    if (!acfDataLoaded) {
        console.log('ACF Report initializing...');
        console.log('Using API URL:', API_BASE_URL);
        loadACFSettings().then(() => {
            loadACFData();
            acfDataLoaded = true;
        });
    }
};

// Refresh ACF data (for refresh button)
window.loadACFData = loadACFData;

/**
 * Load ACF settings from database
 */
async function loadACFSettings() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/settings`);

        if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
                // Get ACF root from settings
                const acfRoot = result.data.acf_root_user || ACF_CONFIG.SYSTEM_ROOT_ID;
                currentACFRoot = acfRoot;
                ACF_CONFIG.SYSTEM_ROOT_ID = acfRoot;
                console.log('ACF Root loaded from database:', currentACFRoot);
            }
        }
    } catch (error) {
        console.error('Error loading ACF settings:', error);
        // Use default if failed to load
        currentACFRoot = ACF_CONFIG.SYSTEM_ROOT_ID;
    }
}

/**
 * Save ACF root to database
 */
async function saveACFRoot(username) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/settings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                key: 'acf_root_user',
                value: username,
                description: 'ACF System Root User - Target for NIC (No Invite Code) registrations'
            })
        });

        if (!response.ok) {
            throw new Error('Failed to save ACF root setting');
        }

        const result = await response.json();

        if (result.success) {
            currentACFRoot = username;
            ACF_CONFIG.SYSTEM_ROOT_ID = username;
            console.log('ACF Root saved successfully:', username);
            return true;
        }

        return false;
    } catch (error) {
        console.error('Error saving ACF root:', error);
        return false;
    }
}

/**
 * Load all ACF data from server
 */
async function loadACFData() {
    try {
        console.log('Fetching users from API...');

        // Fetch users with network data
        const response = await fetch(`${API_BASE_URL}/api/users`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.success && result.data) {
            allUsers = result.data;
            console.log(`Loaded ${allUsers.length} users`);

            // Process and render data
            processACFData();
            renderSettings();
            renderUsersTable();
            renderStatistics();
        } else {
            throw new Error('Invalid API response');
        }
    } catch (error) {
        console.error('Error loading ACF data:', error);
        showError('Failed to load ACF data. Please check server connection.');
    }
}

/**
 * Process ACF data structure
 */
function processACFData() {
    // Build parent-child relationships
    const userMap = new Map();
    const childrenMap = new Map();

    allUsers.forEach(user => {
        userMap.set(user.id, user);

        // Get parent_id from users table or fingrow_dna
        const parentId = user.parent_id || null;

        if (parentId) {
            if (!childrenMap.has(parentId)) {
                childrenMap.set(parentId, []);
            }
            childrenMap.get(parentId).push(user);
        }
    });

    // Attach children to each user
    allUsers.forEach(user => {
        user.children = childrenMap.get(user.id) || [];
        user.childCount = user.children.length;

        // Calculate level (depth from root)
        user.level = calculateLevel(user, userMap);

        // Determine ACF accepting status
        const maxChildren = (user.username === 'Anatta999') ? 1 : 5;
        user.maxChildren = maxChildren;
        user.acfAccepting = user.childCount < maxChildren;
    });

    console.log('ACF data processed successfully');
}

/**
 * Calculate user level (depth from root)
 */
function calculateLevel(user, userMap) {
    let level = 0;
    let currentId = user.parent_id;

    while (currentId && level < 20) { // Safety limit
        const parent = userMap.get(currentId);
        if (!parent) break;
        level++;
        currentId = parent.parent_id;
    }

    return level;
}

/**
 * Render ACF Settings section
 */
function renderSettings() {
    const rootUser = allUsers.find(u => u.username === ACF_CONFIG.SYSTEM_ROOT_ID);

    const systemRootEl = document.getElementById('acfSystemRoot') || document.getElementById('systemRoot');
    const totalUsersEl = document.getElementById('acfTotalUsers') || document.getElementById('totalUsers');

    if (systemRootEl) {
        systemRootEl.textContent = rootUser ? `${rootUser.username} (${rootUser.id})` : 'Not found';
    }

    if (totalUsersEl) {
        totalUsersEl.textContent = allUsers.length;
    }
}

/**
 * Render Users Table with Child 1-5
 */
function renderUsersTable() {
    const tbody = document.getElementById('acfUsersTableBody') || document.getElementById('usersTableBody');

    if (!tbody) {
        console.error('ACF Users table body not found');
        return;
    }

    tbody.innerHTML = '';

    if (allUsers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="14" class="text-center py-8 text-gray-400">
                    No users found
                </td>
            </tr>
        `;
        return;
    }

    // Sort by creation date
    const sortedUsers = [...allUsers].sort((a, b) => {
        return new Date(a.created_at) - new Date(b.created_at);
    });

    sortedUsers.forEach((user, index) => {
        const row = createUserRow(user, index + 1);
        tbody.appendChild(row);
    });
}

/**
 * Create a user table row
 */
function createUserRow(user, runNumber) {
    const tr = document.createElement('tr');
    tr.className = 'border-t border-slate-700';

    const full = user.childCount >= user.maxChildren;
    const children = user.children.slice(0, 5);

    // Get parent username
    let parentDisplay = '—';
    if (user.parent_id) {
        const parent = allUsers.find(u => u.id === user.parent_id);
        if (parent) {
            parentDisplay = parent.username;
        }
    }

    tr.innerHTML = `
        <td class="px-3 py-2 font-mono text-gray-400">${runNumber}</td>
        <td class="px-3 py-2 font-mono text-xs">${user.id}</td>
        <td class="px-3 py-2 font-medium">${user.username || 'N/A'}</td>
        <td class="px-3 py-2 text-xs text-gray-400">${parentDisplay}</td>
        <td class="px-3 py-2">${user.level}</td>
        <td class="px-3 py-2">${renderSlotBar(user.childCount, user.maxChildren)}</td>
        <td class="px-3 py-2">${renderBadge(`${user.childCount}/${user.maxChildren}`, full ? 'warn' : 'default')}</td>
        <td class="px-3 py-2">${renderBadge(user.acfAccepting ? 'ON' : 'OFF', user.acfAccepting ? 'ok' : 'crit')}</td>
        <td class="px-3 py-2">${user.maxChildren}</td>
        ${renderChildSlots(children)}
    `;

    return tr;
}

/**
 * Render slot bar visualization
 */
function renderSlotBar(count, max) {
    let html = '<div class="slot-bar">';
    for (let i = 0; i < max; i++) {
        const filled = i < count;
        html += `<div class="slot ${filled ? 'slot-filled' : 'slot-empty'}" title="${i+1}/${max}"></div>`;
    }
    html += '</div>';
    return html;
}

/**
 * Render badge
 */
function renderBadge(label, tone = 'default') {
    return `<span class="badge badge-${tone}">${label}</span>`;
}

/**
 * Render child slots (5 columns)
 */
function renderChildSlots(children) {
    let html = '';

    for (let i = 0; i < 5; i++) {
        if (children[i]) {
            const child = children[i];
            html += `
                <td class="px-2 py-2">
                    <div class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-700 text-xs">
                        <span class="font-mono text-emerald-400">#${i+1}</span>
                        <span>${child.username || child.id}</span>
                    </div>
                </td>
            `;
        } else {
            html += `<td class="px-2 py-2 text-center text-gray-600">—</td>`;
        }
    }

    return html;
}

/**
 * Render statistics
 */
function renderStatistics() {
    // Count NIC vs BIC registrations
    let nicCount = 0;
    let bicCount = 0;
    let maxLevel = 0;
    let fullUsers = 0;

    allUsers.forEach(user => {
        // NIC: users without invitor_id or invitor_id = root
        // BIC: users with invitor_id (not root)
        const rootUser = allUsers.find(u => u.username === ACF_CONFIG.SYSTEM_ROOT_ID);

        if (!user.invitor_id || user.invitor_id === rootUser?.id) {
            nicCount++;
        } else {
            bicCount++;
        }

        // Max level
        if (user.level > maxLevel) {
            maxLevel = user.level;
        }

        // Full users
        if (user.childCount >= user.maxChildren) {
            fullUsers++;
        }
    });

    // Update DOM elements only if they exist
    const nicCountEl = document.getElementById('acfNicCount');
    const bicCountEl = document.getElementById('acfBicCount');
    const maxLevelEl = document.getElementById('acfMaxLevel');
    const fullUsersEl = document.getElementById('acfFullUsers');

    if (nicCountEl) nicCountEl.textContent = nicCount;
    if (bicCountEl) bicCountEl.textContent = bicCount;
    if (maxLevelEl) maxLevelEl.textContent = maxLevel;
    if (fullUsersEl) fullUsersEl.textContent = fullUsers;
}

/**
 * Show error message
 */
function showError(message) {
    const tbody = document.getElementById('acfUsersTableBody') || document.getElementById('usersTableBody');

    if (!tbody) {
        console.error('Table body element not found');
        return;
    }

    tbody.innerHTML = `
        <tr>
            <td colspan="14" class="text-center py-8">
                <div class="text-red-400 mb-2">
                    <i class="fas fa-exclamation-triangle text-2xl"></i>
                </div>
                <p class="text-gray-400">${message}</p>
                <button onclick="location.reload()" class="mt-4 bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg transition-colors">
                    <i class="fas fa-sync mr-2"></i>Retry
                </button>
            </td>
        </tr>
    `;
}

/**
 * Verify and display ACF root candidate
 */
async function verifyACFRoot() {
    const searchInput = document.getElementById('acfRootSearch');
    const searchTerm = searchInput.value.trim();

    if (!searchTerm) {
        showACFRootMessage('กรุณากรอก Username หรือ User ID', 'error');
        return;
    }

    try {
        // Search for user
        const user = allUsers.find(u =>
            u.username === searchTerm ||
            String(u.id) === searchTerm
        );

        if (!user) {
            showACFRootMessage('ไม่พบผู้ใช้ที่ระบุ', 'error');
            return;
        }

        // Display verification result
        const resultDiv = document.getElementById('acfRootResult');
        resultDiv.className = 'bg-gray-800 border border-emerald-700 rounded-lg p-4';
        resultDiv.innerHTML = `
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-3">
                    <div class="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-lg">
                        ${user.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div class="font-semibold text-white">${user.username}</div>
                        <div class="text-xs text-gray-400">User ID: ${user.id}</div>
                    </div>
                </div>
                <div class="text-emerald-400">
                    <i class="fas fa-check-circle text-2xl"></i>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-2 text-sm mb-4">
                <div class="bg-gray-700 rounded px-3 py-2">
                    <div class="text-gray-400 text-xs">Email</div>
                    <div class="text-white">${user.email || 'N/A'}</div>
                </div>
                <div class="bg-gray-700 rounded px-3 py-2">
                    <div class="text-gray-400 text-xs">เบอร์โทร</div>
                    <div class="text-white">${user.phone || 'N/A'}</div>
                </div>
                <div class="bg-gray-700 rounded px-3 py-2">
                    <div class="text-gray-400 text-xs">จำนวนลูกข่าย</div>
                    <div class="text-white">${user.childCount || 0}</div>
                </div>
                <div class="bg-gray-700 rounded px-3 py-2">
                    <div class="text-gray-400 text-xs">สถานะ</div>
                    <div class="text-emerald-400">${user.status || 'active'}</div>
                </div>
            </div>

            <div class="flex gap-2">
                <button onclick="setACFRoot('${user.username}')" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors">
                    <i class="fas fa-check mr-2"></i>ตั้งเป็น ACF Root
                </button>
                <button onclick="cancelACFRootSelection()" class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors">
                    ยกเลิก
                </button>
            </div>
        `;

    } catch (error) {
        console.error('Error verifying ACF root:', error);
        showACFRootMessage('เกิดข้อผิดพลาดในการค้นหาผู้ใช้', 'error');
    }
}

/**
 * Set ACF root user
 */
async function setACFRoot(username) {
    try {
        const success = await saveACFRoot(username);

        if (success) {
            showACFRootMessage('✓ ตั้งค่า ACF Root สำเร็จ', 'success');

            // Reload data with new root
            await loadACFData();

            // Clear search and result
            document.getElementById('acfRootSearch').value = '';
            setTimeout(() => {
                cancelACFRootSelection();
            }, 2000);
        } else {
            showACFRootMessage('ไม่สามารถบันทึกการตั้งค่าได้', 'error');
        }
    } catch (error) {
        console.error('Error setting ACF root:', error);
        showACFRootMessage('เกิดข้อผิดพลาดในการบันทึก', 'error');
    }
}

/**
 * Cancel ACF root selection
 */
function cancelACFRootSelection() {
    const resultDiv = document.getElementById('acfRootResult');
    resultDiv.className = 'hidden';
    resultDiv.innerHTML = '';
}

/**
 * Show ACF root message
 */
function showACFRootMessage(message, type = 'info') {
    const resultDiv = document.getElementById('acfRootResult');
    const colorClass = type === 'error' ? 'border-red-700 bg-red-900' :
                       type === 'success' ? 'border-emerald-700 bg-emerald-900' :
                       'border-blue-700 bg-blue-900';
    const iconClass = type === 'error' ? 'fa-exclamation-circle text-red-400' :
                      type === 'success' ? 'fa-check-circle text-emerald-400' :
                      'fa-info-circle text-blue-400';

    resultDiv.className = `${colorClass} border rounded-lg p-4`;
    resultDiv.innerHTML = `
        <div class="flex items-center gap-2">
            <i class="fas ${iconClass}"></i>
            <span class="text-white">${message}</span>
        </div>
    `;
}
