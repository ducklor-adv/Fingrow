// Admin Dashboard JavaScript
class FingrowAdmin {
    constructor() {
        this.currentUser = null;
        this.stats = {};
        this.db = new DatabaseConnector();
        this.init();
    }

    async init() {
        await this.checkAuth();
        this.setupEventListeners();
        this.updateDateTime();

        // Setup URL routing
        this.setupRouting();

        // Load initial content based on URL hash
        await this.loadInitialContent();

        // Update time every second for better UX
        setInterval(() => this.updateDateTime(), 1000);

    }

    setupRouting() {
        // Listen for hash changes
        window.addEventListener('hashchange', () => {
            this.handleHashChange();
        });
    }

    async loadInitialContent() {
        // Get current hash from URL
        const hash = window.location.hash;
        const section = hash ? hash.substring(1) : 'dashboard';

        console.log('[Admin] Loading initial content for section:', section);

        // Load appropriate content
        if (section === 'dashboard') {
            await this.loadDashboardData();
        }

        // Load the content for the section
        await this.loadContent(section);

        // Update active navigation
        this.setActiveNavigation(section);
    }

    handleHashChange() {
        const section = window.location.hash.substring(1) || 'dashboard';
        console.log('[Admin] Hash changed to:', section);
        this.loadContent(section);
        this.setActiveNavigation(section);
    }

    setActiveNavigation(section) {
        // Remove active class from all nav items
        document.querySelectorAll('.nav-item').forEach(nav => {
            nav.classList.remove('bg-emerald-600');
        });

        // Find and activate the correct nav item
        const targetNav = document.querySelector(`.nav-item[href="#${section}"]`);
        if (targetNav) {
            targetNav.classList.add('bg-emerald-600');
        }
    }

    // Helper function to normalize users data to ensure it's always an Array (same as MockDatabase)
    normalizeUsers(raw) {
        // Add debug logging for development
        if (typeof window !== 'undefined' && window.console) {
            console.debug('[FingrowAdmin] normalizeUsers input:', { raw, type: typeof raw, isArray: Array.isArray(raw) });
        }

        try {
            // If it's already an array, return as-is
            if (Array.isArray(raw)) {
                return raw;
            }

            // If it's a string, try to parse as JSON
            if (typeof raw === 'string') {
                const parsed = JSON.parse(raw);
                return this.normalizeUsers(parsed); // Recursive call to handle nested cases
            }

            // If it's an object with users property, use that
            if (raw && typeof raw === 'object' && Array.isArray(raw.users)) {
                return raw.users;
            }

            // If it's an object map, convert to array of values
            if (raw && typeof raw === 'object') {
                const values = Object.values(raw);
                // Check if values look like user objects
                if (values.length > 0 && values[0] && typeof values[0] === 'object' && 'username' in values[0]) {
                    return values;
                }
            }

            // Fallback: return empty array
            if (typeof window !== 'undefined' && window.console) {
                console.warn('[FingrowAdmin] normalizeUsers fallback to empty array for:', raw);
            }
            return [];
        } catch (error) {
            if (typeof window !== 'undefined' && window.console) {
                console.error('[FingrowAdmin] normalizeUsers error:', error, 'input:', raw);
            }
            return [];
        }
    }

    async checkAuth() {
        // In a real app, this would check authentication
        // For now, we'll simulate an admin user
        this.currentUser = {
            id: 'admin-001',
            username: 'admin',
            email: 'admin@fingrow.app',
            role: 'admin'
        };
    }

    async loadDashboardData() {
        try {
            console.log('Loading dashboard data...');
            // Load dashboard data from mock database
            this.stats = await this.fetchDashboardStats();
            console.log('Stats loaded:', this.stats);
            this.updateDashboardStats();
            await this.loadCharts();
            await this.loadRecentOrders();
            await this.loadTopSellers();
            console.log('Dashboard data loaded successfully');
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showError('ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
        }
    }

    async fetchDashboardStats() {
        return await this.db.getDashboardStats();
    }

    async loadDashboardContent() {
        const stats = await this.fetchDashboardStats();

        return `
            <!-- Dashboard Content -->
            <div id="dashboard-content">
                <!-- Stats Cards -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div class="stat-card rounded-lg p-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-400 text-sm">ผู้ใช้งานทั้งหมด</p>
                                <p class="text-2xl font-bold text-white" id="totalUsers">${stats.totalUsers || 0}</p>
                            </div>
                            <i class="fas fa-users text-emerald-500 text-3xl"></i>
                        </div>
                    </div>

                    <div class="stat-card rounded-lg p-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-400 text-sm">สินค้าทั้งหมด</p>
                                <p class="text-2xl font-bold text-white" id="totalProducts">${stats.totalProducts || 0}</p>
                            </div>
                            <i class="fas fa-box text-emerald-500 text-3xl"></i>
                        </div>
                    </div>

                    <div class="stat-card rounded-lg p-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-400 text-sm">ออเดอร์ทั้งหมด</p>
                                <p class="text-2xl font-bold text-white" id="totalOrders">${stats.totalOrders || 0}</p>
                            </div>
                            <i class="fas fa-shopping-cart text-emerald-500 text-3xl"></i>
                        </div>
                    </div>

                    <div class="stat-card rounded-lg p-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-400 text-sm">รายได้รวม</p>
                                <p class="text-2xl font-bold text-white" id="totalRevenue">฿${(stats.totalRevenue || 0).toLocaleString()}</p>
                            </div>
                            <i class="fas fa-chart-line text-emerald-500 text-3xl"></i>
                        </div>
                    </div>
                </div>

                <!-- Charts and Additional Info -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div class="card rounded-lg p-6">
                        <h3 class="text-lg font-semibold text-white mb-4">ยอดขายรายเดือน</h3>
                        <canvas id="salesChart" width="400" height="200"></canvas>
                    </div>

                    <div class="card rounded-lg p-6">
                        <h3 class="text-lg font-semibold text-white mb-4">ผู้ใช้งานใหม่</h3>
                        <div class="text-center">
                            <div class="text-4xl font-bold text-emerald-500 mb-2">${stats.newUsersThisMonth || 0}</div>
                            <p class="text-gray-400">ผู้ใช้งานใหม่เดือนนี้</p>
                        </div>
                    </div>
                </div>

                <!-- Recent Activities -->
                <div class="mt-8">
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div class="card rounded-lg p-6">
                            <h3 class="text-lg font-semibold text-white mb-4">ออเดอร์ล่าสุด</h3>
                            <div id="recent-orders">
                                <p class="text-gray-400 text-center py-4">กำลังโหลด...</p>
                            </div>
                        </div>

                        <div class="card rounded-lg p-6">
                            <h3 class="text-lg font-semibold text-white mb-4">ผู้ขายยอดเยี่ยม</h3>
                            <div id="top-sellers">
                                <p class="text-gray-400 text-center py-4">กำลังโหลด...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async loadEarningsContent() {
        return `
            <!-- Earnings Content -->
            <div id="earnings-content">
                <div class="mb-6">
                    <h2 class="text-2xl font-bold text-white mb-2">รายได้และค่าคอมมิชชั่น</h2>
                    <p class="text-gray-400">จัดการและติดตามรายได้จากระบบ referral</p>
                </div>

                <!-- Earnings Overview -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div class="stat-card rounded-lg p-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-400 text-sm">รายได้รวมทั้งหมด</p>
                                <p class="text-2xl font-bold text-white">฿0</p>
                            </div>
                            <i class="fas fa-coins text-emerald-500 text-3xl"></i>
                        </div>
                    </div>

                    <div class="stat-card rounded-lg p-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-400 text-sm">ค่าคอมมิชชั่น</p>
                                <p class="text-2xl font-bold text-white">฿0</p>
                            </div>
                            <i class="fas fa-percentage text-emerald-500 text-3xl"></i>
                        </div>
                    </div>

                    <div class="stat-card rounded-lg p-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-400 text-sm">ผู้ใช้ที่มี referral</p>
                                <p class="text-2xl font-bold text-white">0</p>
                            </div>
                            <i class="fas fa-users text-emerald-500 text-3xl"></i>
                        </div>
                    </div>
                </div>

                <!-- Earnings Table -->
                <div class="card rounded-lg p-6">
                    <div class="flex justify-between items-center mb-6">
                        <h3 class="text-lg font-semibold text-white">รายการรายได้</h3>
                    </div>
                    <div id="referrals-table">
                        <p class="text-gray-400 text-center py-8">ยังไม่มีข้อมูลรายได้</p>
                    </div>
                </div>
            </div>
        `;
    }

    updateDashboardStats() {
        console.log('Updating dashboard stats:', this.stats);

        const totalUsersEl = document.getElementById('totalUsers');
        const totalProductsEl = document.getElementById('totalProducts');
        const totalSalesEl = document.getElementById('totalSales');
        const wldPoolEl = document.getElementById('wldPool');

        if (totalUsersEl) totalUsersEl.textContent = this.formatNumber(this.stats.totalUsers);
        if (totalProductsEl) totalProductsEl.textContent = this.formatNumber(this.stats.totalProducts);
        if (totalSalesEl) totalSalesEl.textContent = this.formatCurrency(this.stats.totalSales);
        if (wldPoolEl) wldPoolEl.textContent = `${this.formatNumber(this.stats.totalWLD)} WLD`;

        console.log('Dashboard stats updated successfully');
    }

    async loadCharts() {
        await this.loadSalesChart();
        await this.loadUserChart();
    }

    async loadSalesChart() {
        const salesData = await this.fetchSalesData();

        // Wait for Chart.js to be available
        if (typeof Chart === 'undefined') {
            console.log('Chart.js not loaded yet, retrying...');
            setTimeout(() => this.loadSalesChart(), 100);
            return;
        }

        const ctx = document.getElementById('salesChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: salesData.labels,
                datasets: [{
                    label: 'ยอดขาย (THB)',
                    data: salesData.values,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#f3f4f6'
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        min: 0,
                        max: 300000000,
                        ticks: {
                            color: '#9ca3af',
                            stepSize: 50000000,
                            callback: function(value) {
                                return (value / 1000000).toFixed(0) + 'M';
                            }
                        },
                        grid: {
                            color: 'rgba(156, 163, 175, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#9ca3af'
                        },
                        grid: {
                            color: 'rgba(156, 163, 175, 0.1)'
                        }
                    }
                }
            }
        });
    }

    async loadUserChart() {
        const userData = await this.fetchUserData();

        // Wait for Chart.js to be available
        if (typeof Chart === 'undefined') {
            console.log('Chart.js not loaded yet, retrying...');
            setTimeout(() => this.loadUserChart(), 100);
            return;
        }

        const ctx = document.getElementById('userChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: userData.labels,
                datasets: [{
                    label: 'ผู้ใช้ใหม่',
                    data: userData.values,
                    backgroundColor: '#3b82f6',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#f3f4f6'
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        min: 0,
                        max: 2000,
                        ticks: {
                            color: '#9ca3af',
                            stepSize: 200,
                            callback: function(value) {
                                return value;
                            }
                        },
                        grid: {
                            color: 'rgba(156, 163, 175, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#9ca3af'
                        },
                        grid: {
                            color: 'rgba(156, 163, 175, 0.1)'
                        }
                    }
                }
            }
        });
    }

    async fetchSalesData() {
        return await this.db.getSalesData();
    }

    async fetchUserData() {
        return await this.db.getUserData();
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleNavigation(item);
            });
        });

        // Search functionality
        this.setupSearch();

        // Modal handlers
        this.setupModals();
    }

    handleNavigation(navItem) {
        // Get the target section
        const target = navItem.getAttribute('href').substring(1);

        // Update URL hash (this will trigger hashchange event)
        window.location.hash = target;

        // The actual navigation will be handled by hashchange event
        // This ensures URL and content stay in sync
    }

    async loadContent(section) {
        try {
            // Hide all content sections
            document.querySelectorAll('#content-area > div').forEach(div => {
                div.style.display = 'none';
            });

            switch(section) {
                case 'dashboard':
                    const dashboardElement = document.getElementById('dashboard-content');
                    if (dashboardElement) {
                        dashboardElement.style.display = 'block';
                    } else {
                        console.error('dashboard-content element not found');
                        // Fallback: show dashboard in content area
                        const contentArea = document.getElementById('content-area');
                        contentArea.innerHTML = await this.loadDashboardContent();
                    }
                    break;
                case 'earnings':
                    const earningsElement = document.getElementById('earnings-content');
                    if (earningsElement) {
                        earningsElement.style.display = 'block';
                        // Load network DNA data when showing the page
                        setTimeout(() => {
                            if (typeof loadNetworkDNA === 'function') {
                                loadNetworkDNA();
                            }
                        }, 100);
                    } else {
                        console.error('earnings-content element not found');
                        // Fallback: show earnings in content area
                        const contentArea = document.getElementById('content-area');
                        contentArea.innerHTML = await this.loadEarningsContent();
                    }
                    break;
                case 'users':
                case 'products':
                case 'orders':
                case 'reviews':
                case 'reports':
                case 'settings':
                    // These sections use the old dynamic content system
                    const contentArea = document.getElementById('content-area');
                    contentArea.innerHTML = '<div class="flex justify-center items-center h-64"><i class="fas fa-spinner fa-spin text-emerald-500 text-2xl"></i></div>';
                    let content = await this.loadDynamicContent(section);
                    contentArea.innerHTML = content;
                    break;
                default:
                    const defaultArea = document.getElementById('content-area');
                    defaultArea.innerHTML = '<div class="text-center text-gray-400">ไม่พบหน้าที่ต้องการ</div>';
            }
        } catch (error) {
            console.error('Error loading content:', error);
            const errorArea = document.getElementById('content-area');
            errorArea.innerHTML = '<div class="text-center text-red-400">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
        }
    }

    async loadDynamicContent(section) {
        let content;
        switch(section) {
            case 'users':
                content = await this.loadUsersContent();
                break;
            case 'products':
                content = await this.loadProductsContent();
                break;
            case 'orders':
                content = await this.loadOrdersContent();
                break;
            case 'reviews':
                content = await this.loadReviewsContent();
                break;
            case 'reports':
                content = await this.loadReportsContent();
                break;
            case 'settings':
                content = await this.loadSettingsContent();
                break;
            default:
                content = '<div class="text-center text-gray-400">ไม่พบหน้าที่ต้องการ</div>';
        }
        return content;
    }

    async loadUsersContent() {
        // Clear cache to ensure fresh data from database
        this.db.clearCache('users');
        const result = await this.fetchUsers();
        const users = result.data || [];

        // Get all products to count per user
        const products = await this.fetchProducts();

        return `
            <div class="mb-6">
                <h2 class="text-3xl font-bold text-white mb-2">จัดการผู้ใช้งาน</h2>
                <p class="text-gray-400">ดูรายละเอียดและจัดการผู้ใช้งานในระบบ</p>
            </div>

            <div class="card rounded-lg p-6">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-xl font-semibold text-white">รายชื่อผู้ใช้งาน (${users.length} คน)</h3>
                    <div class="flex space-x-4">
                        <input type="text" id="userSearch" placeholder="ค้นหาผู้ใช้..." class="bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-emerald-500 focus:outline-none">
                        <select id="userStatusFilter" class="bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-600">
                            <option value="all">ทั้งหมด</option>
                            <option value="active">ใช้งานอยู่</option>
                            <option value="suspended">ถูกระงับ</option>
                            <option value="verified">ยืนยันแล้ว</option>
                        </select>
                    </div>
                </div>

                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead>
                            <tr class="border-b border-gray-700">
                                <th class="text-left py-3 px-2 text-gray-400 text-sm">ID</th>
                                <th class="text-left py-3 px-2 text-gray-400 text-sm">User ID</th>
                                <th class="text-left py-3 px-2 text-gray-400 text-sm">ผู้ใช้งาน</th>
                                <th class="text-left py-3 px-2 text-gray-400 text-sm">สถานะ</th>
                                <th class="text-left py-3 px-2 text-gray-400 text-sm">สินค้าที่ลงขาย</th>
                                <th class="text-left py-3 px-2 text-gray-400 text-sm">จำนวนซื้อ</th>
                                <th class="text-left py-3 px-2 text-gray-400 text-sm">ยอดซื้อ</th>
                                <th class="text-left py-3 px-2 text-gray-400 text-sm">จำนวนขาย</th>
                                <th class="text-left py-3 px-2 text-gray-400 text-sm">ยอดขาย</th>
                                <th class="text-left py-3 px-2 text-gray-400 text-sm">รายได้รวม</th>
                                <th class="text-left py-3 px-2 text-gray-400 text-sm">Follower</th>
                                <th class="text-left py-3 px-2 text-gray-400 text-sm">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody id="usersTableBody">
                            ${users.map(user => this.renderUserRow(user, products)).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="flex justify-between items-center mt-6">
                    <div class="text-gray-400">แสดง 1-20 จาก ${users.length} รายการ</div>
                    <div class="flex space-x-2">
                        <button class="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-sm">ก่อนหน้า</button>
                        <button class="bg-emerald-600 px-3 py-1 rounded text-sm">1</button>
                        <button class="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-sm">2</button>
                        <button class="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-sm">ถัดไป</button>
                    </div>
                </div>
            </div>
        `;
    }

    renderUserRow(user, products = []) {
        const statusColor = user.status === 'active' ? 'emerald' : 'red';
        const statusText = user.status === 'active' ? 'ใช้งานอยู่' : 'ไม่ใช้งาน';
        const stats = user.stats || {};
        const purchases = stats.purchases || { count: 0, totalAmount: 0 };
        const sales = stats.sales || { count: 0, totalAmount: 0 };
        const earnings = stats.earnings || { total: 0 };
        const referrals = stats.referrals || { total: 0 };

        // Use follower_count directly from user object if available
        const followerCount = user.follower_count || referrals.total || 0;

        // Count products by this seller
        const userProducts = products.filter(p => p.seller_id === user.id);
        const productCount = userProducts.length;
        const activeProducts = userProducts.filter(p => p.status === 'active').length;

        return `
            <tr class="border-b border-gray-800 hover:bg-gray-800" data-user-id="${user.id}">
                <td class="py-3 px-2 text-gray-300 text-sm font-mono">${user.id}</td>
                <td class="py-3 px-2 text-gray-300 text-sm font-mono">${user.auto_user_id || 'N/A'}</td>
                <td class="py-3 px-2">
                    <div class="flex items-center">
                        <div class="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center mr-2 overflow-hidden">
                            ${user.profile_image ?
                                `<img src="${user.profile_image}" class="w-full h-full object-cover" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                 <span class="text-white text-xs font-bold hidden">${user.username.charAt(0).toUpperCase()}</span>` :
                                `<span class="text-white text-xs font-bold">${user.username.charAt(0).toUpperCase()}</span>`
                            }
                        </div>
                        <div>
                            <p class="text-white font-medium text-sm">${user.username}</p>
                            <p class="text-gray-400 text-xs">${user.email || 'ไม่ระบุ'}</p>
                        </div>
                    </div>
                </td>
                <td class="py-3 px-2">
                    <span class="bg-${statusColor}-600 text-${statusColor}-100 px-2 py-1 rounded-full text-xs">${statusText}</span>
                </td>
                <td class="py-3 px-2">
                    <div class="text-orange-400 text-sm font-medium">${productCount} รายการ</div>
                    <div class="text-gray-400 text-xs">${activeProducts} พร้อมขาย</div>
                </td>
                <td class="py-3 px-2 text-blue-400 text-sm font-medium">${purchases.count}</td>
                <td class="py-3 px-2 text-blue-300 text-sm">${this.formatCurrency(purchases.totalAmount, 'THB')}</td>
                <td class="py-3 px-2 text-emerald-400 text-sm font-medium">${sales.count}</td>
                <td class="py-3 px-2 text-emerald-300 text-sm">${this.formatCurrency(sales.totalAmount, 'THB')}</td>
                <td class="py-3 px-2 text-yellow-400 text-sm font-medium">${this.formatCurrency(earnings.total, 'THB')}</td>
                <td class="py-3 px-2 text-purple-400 text-sm">${followerCount}</td>
                <td class="py-3 px-2">
                    <button class="text-blue-400 hover:text-blue-300 mr-2 text-sm" onclick="editUser('${user.id}')" title="แก้ไขผู้ใช้">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="text-${user.status === 'inactive' ? 'emerald' : 'red'}-400 hover:text-${user.status === 'inactive' ? 'emerald' : 'red'}-300 mr-2 text-sm" onclick="toggleUserStatus('${user.id}')" title="${user.status === 'inactive' ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}">
                        <i class="fas fa-${user.status === 'inactive' ? 'check' : 'ban'}"></i>
                    </button>
                    <button class="text-red-500 hover:text-red-400 text-sm" onclick="deleteUser('${user.id}')" title="ลบผู้ใช้">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }

    async fetchUsers() {
        const result = await this.db.getAllUsers();

        // Check if result and result.data exist
        if (!result || !result.data || !Array.isArray(result.data)) {
            console.error('[Admin] Invalid users data structure:', result);
            return { data: [], total: 0 };
        }

        return result;
    }

    async loadProductsContent() {
        const products = await this.fetchProducts();

        return `
            <div class="mb-6">
                <h2 class="text-3xl font-bold text-white mb-2">จัดการสินค้า</h2>
                <p class="text-gray-400">ดูรายละเอียดและจัดการสินค้าทั้งหมดในระบบ</p>
            </div>

            <div class="card rounded-lg p-6">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-xl font-semibold text-white">รายการสินค้า (${products.length} รายการ)</h3>
                    <div class="flex space-x-4">
                        <input type="text" id="productSearch" placeholder="ค้นหาสินค้า..." class="bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-emerald-500 focus:outline-none">
                        <select id="categoryFilter" class="bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-600">
                            <option value="all">หมวดหมู่ทั้งหมด</option>
                            <option value="electronics">อิเล็กทรอนิกส์</option>
                            <option value="gaming">เกมมิ่ง</option>
                            <option value="camera">กล้อง</option>
                            <option value="fashion">แฟชั่น</option>
                            <option value="music">เครื่องดนตรี</option>
                        </select>
                        <select id="statusFilter" class="bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-600">
                            <option value="all">สถานะทั้งหมด</option>
                            <option value="active">ใช้งานอยู่</option>
                            <option value="sold">ขายแล้ว</option>
                            <option value="inactive">ไม่ใช้งาน</option>
                        </select>
                    </div>
                </div>

                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead>
                            <tr class="border-b border-gray-700">
                                <th class="text-left py-3 px-4 text-gray-400">สินค้า</th>
                                <th class="text-left py-3 px-4 text-gray-400">ผู้ขาย</th>
                                <th class="text-left py-3 px-4 text-gray-400">ราคา</th>
                                <th class="text-left py-3 px-4 text-gray-400">หมวดหมู่</th>
                                <th class="text-left py-3 px-4 text-gray-400">สถานะ</th>
                                <th class="text-left py-3 px-4 text-gray-400">ยอดดู</th>
                                <th class="text-left py-3 px-4 text-gray-400">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody id="productsTableBody">
                            ${products.map(product => this.renderProductRow(product)).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="flex justify-between items-center mt-6">
                    <div class="text-gray-400">แสดง 1-20 จาก ${products.length} รายการ</div>
                    <div class="flex space-x-2">
                        <button class="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-sm">ก่อนหน้า</button>
                        <button class="bg-emerald-600 px-3 py-1 rounded text-sm">1</button>
                        <button class="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-sm">2</button>
                        <button class="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-sm">ถัดไป</button>
                    </div>
                </div>
            </div>
        `;
    }

    renderProductRow(product) {
        const statusColor = {
            'active': 'emerald',
            'sold': 'blue',
            'inactive': 'red'
        }[product.status] || 'gray';

        const statusText = {
            'active': 'ใช้งานอยู่',
            'sold': 'ขายแล้ว',
            'inactive': 'ไม่ใช้งาน'
        }[product.status] || 'ไม่ทราบ';

        const categoryText = {
            'electronics': 'อิเล็กทรอนิกส์',
            'gaming': 'เกมมิ่ง',
            'camera': 'กล้อง',
            'fashion': 'แฟชั่น',
            'music': 'เครื่องดนตรี',
            'general': 'ทั่วไป'
        }[product.category] || product.category;

        const categoryIcon = {
            'electronics': 'fas fa-mobile-alt',
            'gaming': 'fas fa-gamepad',
            'camera': 'fas fa-camera',
            'fashion': 'fas fa-tshirt',
            'music': 'fas fa-music',
            'general': 'fas fa-box'
        }[product.category] || 'fas fa-box';

        // Get the first image from the images array, fallback to icon if no images
        const firstImage = product.images && product.images.length > 0 ? product.images[0] : null;

        return `
            <tr class="border-b border-gray-800 hover:bg-gray-800" data-product-id="${product.id}" data-category="${product.category}" data-status="${product.status}">
                <td class="py-3 px-4">
                    <div class="flex items-center">
                        ${firstImage ?
                            `<img src="${firstImage}" alt="${product.title}" class="w-12 h-12 object-cover rounded-lg mr-3" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                             <div class="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center mr-3" style="display: none;">
                                <i class="${categoryIcon} text-emerald-400"></i>
                             </div>`
                            :
                            `<div class="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center mr-3">
                                <i class="${categoryIcon} text-emerald-400"></i>
                             </div>`
                        }
                        <div>
                            <p class="text-white font-medium">${product.title}</p>
                            <p class="text-gray-400 text-sm">${product.description ? product.description.substring(0, 50) + '...' : 'ไม่มีรายละเอียด'}</p>
                        </div>
                    </div>
                </td>
                <td class="py-3 px-4">
                    <div>
                        <p class="text-gray-300">@${product.seller?.username || 'ไม่ทราบ'}</p>
                        <p class="text-gray-500 text-sm">ID: ${product.seller_id}</p>
                    </div>
                </td>
                <td class="py-3 px-4 text-emerald-400 font-medium">${this.formatCurrency(product.price)}</td>
                <td class="py-3 px-4 text-gray-300">${categoryText}</td>
                <td class="py-3 px-4">
                    <span class="bg-${statusColor}-600 text-${statusColor}-100 px-2 py-1 rounded-full text-xs">${statusText}</span>
                </td>
                <td class="py-3 px-4 text-gray-400">${product.views || 0}</td>
                <td class="py-3 px-4">
                    <button class="text-blue-400 hover:text-blue-300 mr-2 text-sm" onclick="editProduct('${product.id}')" title="แก้ไขสินค้า">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="text-${product.status === 'active' ? 'red' : 'emerald'}-400 hover:text-${product.status === 'active' ? 'red' : 'emerald'}-300 mr-2 text-sm" onclick="toggleProductStatus('${product.id}')" title="${product.status === 'active' ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}">
                        <i class="fas fa-${product.status === 'active' ? 'ban' : 'check'}"></i>
                    </button>
                    <button class="text-red-500 hover:text-red-400 text-sm" onclick="deleteProduct('${product.id}')" title="ลบสินค้า">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }

    async fetchProducts() {
        return await this.db.getAllProducts();
    }

    async loadOrdersContent() {
        // Load all products instead of orders
        const products = await this.fetchProducts();

        // Get all users to show seller info
        const usersResponse = await this.fetchUsers();
        const users = this.normalizeUsers(usersResponse);

        return `
            <div class="mb-6">
                <h2 class="text-3xl font-bold text-white mb-2">รายการซื้อขาย</h2>
                <p class="text-gray-400">ดูรายละเอียดสินค้าทั้งหมดที่มีในระบบ</p>
            </div>

            <div class="card rounded-lg p-6">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-xl font-semibold text-white">สินค้าทั้งหมด (${products.length} รายการ)</h3>
                    <div class="flex space-x-4">
                        <input type="text" id="productSearch" placeholder="ค้นหาสินค้า..." class="bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-emerald-500 focus:outline-none">
                        <select id="productStatusFilter" class="bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-600">
                            <option value="all">สถานะทั้งหมด</option>
                            <option value="active">พร้อมขาย</option>
                            <option value="sold">ขายแล้ว</option>
                            <option value="suspended">ระงับ</option>
                        </select>
                    </div>
                </div>

                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead>
                            <tr class="border-b border-gray-700">
                                <th class="text-left py-3 px-4 text-gray-400">รูปภาพ</th>
                                <th class="text-left py-3 px-4 text-gray-400">ชื่อสินค้า</th>
                                <th class="text-left py-3 px-4 text-gray-400">ผู้ขาย</th>
                                <th class="text-left py-3 px-4 text-gray-400">ราคา</th>
                                <th class="text-left py-3 px-4 text-gray-400">Fin Fee</th>
                                <th class="text-left py-3 px-4 text-gray-400">สภาพ</th>
                                <th class="text-left py-3 px-4 text-gray-400">สถานะ</th>
                                <th class="text-left py-3 px-4 text-gray-400">วันที่ลงขาย</th>
                                <th class="text-left py-3 px-4 text-gray-400">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody id="productsTableBody">
                            ${products.map(product => this.renderProductRowForOrders(product, users)).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="flex justify-between items-center mt-6">
                    <div class="text-gray-400">แสดง ${Math.min(products.length, 20)} จาก ${products.length} รายการ</div>
                    <div class="flex space-x-2">
                        <button class="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-sm">ก่อนหน้า</button>
                        <button class="bg-emerald-600 px-3 py-1 rounded text-sm">1</button>
                        <button class="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-sm">ถัดไป</button>
                    </div>
                </div>
            </div>
        `;
    }

    renderProductRowForOrders(product, users) {
        // Find seller info
        const seller = users.find(u => u.id === product.seller_id);
        const sellerName = seller ? (seller.full_name || seller.username) : 'ไม่ทราบ';

        // Parse images
        let imageUrl = 'https://via.placeholder.com/100';
        try {
            const images = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
            if (Array.isArray(images) && images.length > 0) {
                imageUrl = images[0];
            }
        } catch (e) {
            // Use default image
        }

        // Status colors
        const statusColors = {
            'active': 'emerald',
            'sold': 'gray',
            'suspended': 'red'
        };

        const statusTexts = {
            'active': 'พร้อมขาย',
            'sold': 'ขายแล้ว',
            'suspended': 'ระงับ'
        };

        const statusColor = statusColors[product.status] || 'gray';
        const statusText = statusTexts[product.status] || product.status;

        // Format date
        const createdDate = this.formatDateTime(product.created_at);

        // Calculate Fin Fee
        const finFeePercent = product.fin_fee_percent || 0;
        const finFeeAmount = product.amount_fee || 0;

        return `
            <tr class="border-b border-gray-800 hover:bg-gray-800" data-product-id="${product.id}">
                <td class="py-3 px-4">
                    <img src="${imageUrl}" alt="${product.title}" class="w-16 h-16 object-cover rounded-lg">
                </td>
                <td class="py-3 px-4">
                    <div class="text-white font-medium">${product.title}</div>
                    <div class="text-gray-400 text-sm">${product.brand || ''} ${product.model || ''}</div>
                </td>
                <td class="py-3 px-4">
                    <div class="text-white">${sellerName}</div>
                    <div class="text-gray-400 text-sm">${seller ? seller.username : ''}</div>
                </td>
                <td class="py-3 px-4">
                    <div class="text-emerald-400 font-bold">${product.price_local?.toLocaleString() || 0} ฿</div>
                </td>
                <td class="py-3 px-4">
                    <div class="text-blue-400">${finFeePercent}%</div>
                    <div class="text-gray-400 text-sm">${finFeeAmount.toLocaleString()} ฿</div>
                </td>
                <td class="py-3 px-4">
                    <span class="text-gray-300">${product.condition || '-'}</span>
                </td>
                <td class="py-3 px-4">
                    <span class="px-2 py-1 bg-${statusColor}-500 bg-opacity-20 text-${statusColor}-400 rounded text-xs">${statusText}</span>
                </td>
                <td class="py-3 px-4">
                    <div class="text-gray-300 text-sm">${createdDate}</div>
                </td>
                <td class="py-3 px-4">
                    <button class="text-emerald-400 hover:text-emerald-300 mr-2" onclick="admin.viewProductDetails('${product.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="text-blue-400 hover:text-blue-300 mr-2" onclick="admin.editProduct('${product.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="text-red-400 hover:text-red-300" onclick="admin.deleteProduct('${product.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }

    renderOrderRow(order) {
        const statusColors = {
            'pending': 'yellow',
            'processing': 'blue',
            'shipped': 'purple',
            'completed': 'emerald',
            'cancelled': 'red',
            'refunded': 'orange'
        };

        const statusTexts = {
            'pending': 'รอดำเนินการ',
            'processing': 'กำลังดำเนินการ',
            'shipped': 'จัดส่งแล้ว',
            'completed': 'เสร็จสิ้น',
            'cancelled': 'ยกเลิก',
            'refunded': 'คืนเงิน'
        };

        const paymentTexts = {
            'wallet': 'กระเป๋าเงิน',
            'wld': 'WLD Token'
        };

        const statusColor = statusColors[order.status] || 'gray';
        const statusText = statusTexts[order.status] || 'ไม่ทราบ';
        const paymentText = paymentTexts[order.payment_method] || order.payment_method;

        return `
            <tr class="border-b border-gray-800 hover:bg-gray-800" data-order-id="${order.id}" data-status="${order.status}" data-payment="${order.payment_method}">
                <td class="py-3 px-4">
                    <span class="text-emerald-400 font-mono font-bold">#${order.id.toString().padStart(6, '0')}</span>
                </td>
                <td class="py-3 px-4">
                    <div>
                        <p class="text-white font-medium">${order.product?.title || 'ไม่ทราบ'}</p>
                        <p class="text-gray-400 text-sm">จำนวน: ${order.quantity}</p>
                    </div>
                </td>
                <td class="py-3 px-4">
                    <div>
                        <p class="text-gray-300">@${order.buyer?.username || 'ไม่ทราบ'}</p>
                        <p class="text-gray-500 text-sm">ID: ${order.buyer_id}</p>
                    </div>
                </td>
                <td class="py-3 px-4">
                    <div>
                        <p class="text-gray-300">@${order.seller?.username || 'ไม่ทราบ'}</p>
                        <p class="text-gray-500 text-sm">ID: ${order.seller_id}</p>
                    </div>
                </td>
                <td class="py-3 px-4">
                    <div>
                        <p class="text-emerald-400 font-bold">${this.formatCurrency(order.total_amount)}</p>
                        <p class="text-gray-500 text-sm">คอม: ${this.formatCurrency(order.commission_amount)}</p>
                    </div>
                </td>
                <td class="py-3 px-4">
                    <span class="bg-gray-600 text-gray-100 px-2 py-1 rounded-full text-xs">${paymentText}</span>
                </td>
                <td class="py-3 px-4">
                    <span class="bg-${statusColor}-600 text-${statusColor}-100 px-2 py-1 rounded-full text-xs">${statusText}</span>
                </td>
                <td class="py-3 px-4 text-gray-400 text-sm">${this.formatDateTime(order.created_at)}</td>
                <td class="py-3 px-4">
                    <button class="text-blue-400 hover:text-blue-300 mr-2 text-sm" onclick="viewOrder('${order.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="text-emerald-400 hover:text-emerald-300 text-sm" onclick="updateOrderStatus('${order.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `;
    }

    async fetchOrders() {
        return await this.db.getAllOrders();
    }

    formatDateTime(dateTimeString) {
        const date = new Date(dateTimeString);
        return date.toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    async loadReviewsContent() {
        const reviews = await this.fetchReviews();

        return `
            <div class="mb-6">
                <h2 class="text-3xl font-bold text-white mb-2">จัดการรีวิว</h2>
                <p class="text-gray-400">ดูรายละเอียดและจัดการรีวิวทั้งหมดในระบบ</p>
            </div>

            <div class="card rounded-lg p-6">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-xl font-semibold text-white">รายการรีวิว (${reviews.length} รายการ)</h3>
                    <div class="flex space-x-4">
                        <input type="text" id="reviewSearch" placeholder="ค้นหารีวิว..." class="bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-emerald-500 focus:outline-none">
                        <select id="reviewTypeFilter" class="bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-600">
                            <option value="all">ประเภททั้งหมด</option>
                            <option value="seller">รีวิวผู้ขาย</option>
                            <option value="buyer">รีวิวผู้ซื้อ</option>
                        </select>
                        <select id="reviewRatingFilter" class="bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-600">
                            <option value="all">คะแนนทั้งหมด</option>
                            <option value="5">5 ดาว</option>
                            <option value="4">4 ดาว</option>
                            <option value="3">3 ดาว</option>
                            <option value="2">2 ดาว</option>
                            <option value="1">1 ดาว</option>
                        </select>
                    </div>
                </div>

                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead>
                            <tr class="border-b border-gray-700">
                                <th class="text-left py-3 px-4 text-gray-400">คะแนน</th>
                                <th class="text-left py-3 px-4 text-gray-400">ความเห็น</th>
                                <th class="text-left py-3 px-4 text-gray-400">ผู้รีวิว</th>
                                <th class="text-left py-3 px-4 text-gray-400">ผู้ถูกรีวิว</th>
                                <th class="text-left py-3 px-4 text-gray-400">ประเภท</th>
                                <th class="text-left py-3 px-4 text-gray-400">คำสั่งซื้อ</th>
                                <th class="text-left py-3 px-4 text-gray-400">วันที่</th>
                                <th class="text-left py-3 px-4 text-gray-400">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody id="reviewsTableBody">
                            ${reviews.map(review => this.renderReviewRow(review)).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="flex justify-between items-center mt-6">
                    <div class="text-gray-400">แสดง 1-20 จาก ${reviews.length} รายการ</div>
                    <div class="flex space-x-2">
                        <button class="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-sm">ก่อนหน้า</button>
                        <button class="bg-emerald-600 px-3 py-1 rounded text-sm">1</button>
                        <button class="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-sm">2</button>
                        <button class="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-sm">ถัดไป</button>
                    </div>
                </div>
            </div>
        `;
    }

    renderReviewRow(review) {
        const typeTexts = {
            'seller': 'รีวิวผู้ขาย',
            'buyer': 'รีวิวผู้ซื้อ'
        };

        const typeColors = {
            'seller': 'emerald',
            'buyer': 'blue'
        };

        const typeText = typeTexts[review.type] || 'ไม่ทราบ';
        const typeColor = typeColors[review.type] || 'gray';

        // Render stars
        const stars = this.renderStars(review.rating);

        return `
            <tr class="border-b border-gray-800 hover:bg-gray-800" data-review-id="${review.id}" data-type="${review.type}" data-rating="${review.rating}">
                <td class="py-3 px-4">
                    <div class="flex items-center">
                        <div class="flex text-yellow-400 mr-2">
                            ${stars}
                        </div>
                        <span class="text-yellow-400 font-bold">${review.rating}</span>
                    </div>
                </td>
                <td class="py-3 px-4">
                    <div class="max-w-xs">
                        <p class="text-white text-sm leading-relaxed">${review.comment}</p>
                    </div>
                </td>
                <td class="py-3 px-4">
                    <div>
                        <p class="text-gray-300">@${review.reviewer?.username || 'ไม่ทราบ'}</p>
                        <p class="text-gray-500 text-sm">ID: ${review.reviewer_id}</p>
                    </div>
                </td>
                <td class="py-3 px-4">
                    <div>
                        <p class="text-gray-300">@${review.reviewee?.username || 'ไม่ทราบ'}</p>
                        <p class="text-gray-500 text-sm">ID: ${review.reviewee_id}</p>
                    </div>
                </td>
                <td class="py-3 px-4">
                    <span class="bg-${typeColor}-600 text-${typeColor}-100 px-2 py-1 rounded-full text-xs">${typeText}</span>
                </td>
                <td class="py-3 px-4">
                    <span class="text-emerald-400 font-mono font-bold">#${review.order_id.toString().padStart(6, '0')}</span>
                </td>
                <td class="py-3 px-4 text-gray-400 text-sm">${this.formatDateTime(review.created_at)}</td>
                <td class="py-3 px-4">
                    <button class="text-blue-400 hover:text-blue-300 mr-2 text-sm" onclick="viewReview('${review.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="text-red-400 hover:text-red-300 text-sm" onclick="deleteReview('${review.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }

    async fetchReviews() {
        const result = await this.db.getReviews();
        return result.data; // Return review array
    }

    async loadEarningsContent() {
        const earnings = await this.fetchEarnings();
        const referrals = await this.fetchReferrals();

        return `
            <div class="mb-6">
                <h2 class="text-3xl font-bold text-white mb-2">รายได้ & Referral</h2>
                <p class="text-gray-400">ดูรายละเอียดรายได้และระบบ Referral ในระบบ</p>
            </div>

            <!-- Summary Cards -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div class="card rounded-lg p-6">
                    <div class="flex items-center">
                        <div class="w-12 h-12 bg-emerald-500 rounded-lg flex items-center justify-center mr-4">
                            <i class="fas fa-coins text-white text-xl"></i>
                        </div>
                        <div>
                            <p class="text-gray-400 text-sm">รายได้จากการขาย</p>
                            <p class="text-white text-2xl font-bold">${this.formatCurrency(earnings.filter(e => e.type === 'sale').reduce((sum, e) => sum + e.amount, 0))}</p>
                        </div>
                    </div>
                </div>
                <div class="card rounded-lg p-6">
                    <div class="flex items-center">
                        <div class="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mr-4">
                            <i class="fas fa-users text-white text-xl"></i>
                        </div>
                        <div>
                            <p class="text-gray-400 text-sm">รายได้จาก Referral</p>
                            <p class="text-white text-2xl font-bold">${this.formatCurrency(earnings.filter(e => e.type === 'referral').reduce((sum, e) => sum + e.amount, 0))}</p>
                        </div>
                    </div>
                </div>
                <div class="card rounded-lg p-6">
                    <div class="flex items-center">
                        <div class="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mr-4">
                            <i class="fas fa-percentage text-white text-xl"></i>
                        </div>
                        <div>
                            <p class="text-gray-400 text-sm">ค่าคอมมิชชั่น</p>
                            <p class="text-white text-2xl font-bold">${this.formatCurrency(earnings.filter(e => e.type === 'commission').reduce((sum, e) => sum + e.amount, 0))}</p>
                        </div>
                    </div>
                </div>
                <div class="card rounded-lg p-6">
                    <div class="flex items-center">
                        <div class="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center mr-4">
                            <i class="fas fa-link text-white text-xl"></i>
                        </div>
                        <div>
                            <p class="text-gray-400 text-sm">Referral ทั้งหมด</p>
                            <p class="text-white text-2xl font-bold">${referrals.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Earnings Table -->
            <div class="card rounded-lg p-6 mb-8">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-xl font-semibold text-white">รายการรายได้ (${earnings.length} รายการ)</h3>
                    <div class="flex space-x-4">
                        <input type="text" id="earningSearch" placeholder="ค้นหารายได้..." class="bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-emerald-500 focus:outline-none">
                        <select id="earningTypeFilter" class="bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-600">
                            <option value="all">ประเภททั้งหมด</option>
                            <option value="sale">การขาย</option>
                            <option value="referral">Referral</option>
                            <option value="commission">คอมมิชชั่น</option>
                        </select>
                    </div>
                </div>

                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead>
                            <tr class="border-b border-gray-700">
                                <th class="text-left py-3 px-4 text-gray-400">ผู้ใช้</th>
                                <th class="text-left py-3 px-4 text-gray-400">ประเภท</th>
                                <th class="text-left py-3 px-4 text-gray-400">จำนวนเงิน</th>
                                <th class="text-left py-3 px-4 text-gray-400">คำสั่งซื้อ</th>
                                <th class="text-left py-3 px-4 text-gray-400">Referral ID</th>
                                <th class="text-left py-3 px-4 text-gray-400">วันที่</th>
                            </tr>
                        </thead>
                        <tbody id="earningsTableBody">
                            ${earnings.map(earning => this.renderEarningRow(earning)).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Referrals Table -->
            <div class="card rounded-lg p-6">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-xl font-semibold text-white">ระบบ Referral (${referrals.length} รายการ)</h3>
                    <div class="flex space-x-4">
                        <input type="text" id="referralSearch" placeholder="ค้นหา referral..." class="bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-emerald-500 focus:outline-none">
                        <select id="referralStatusFilter" class="bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-600">
                            <option value="all">สถานะทั้งหมด</option>
                            <option value="active">ใช้งานอยู่</option>
                            <option value="inactive">ไม่ใช้งาน</option>
                        </select>
                    </div>
                </div>

                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead>
                            <tr class="border-b border-gray-700">
                                <th class="text-left py-3 px-4 text-gray-400">ผู้แนะนำ</th>
                                <th class="text-left py-3 px-4 text-gray-400">ผู้ถูกแนะนำ</th>
                                <th class="text-left py-3 px-4 text-gray-400">ระดับ</th>
                                <th class="text-left py-3 px-4 text-gray-400">อัตราคอมมิชชั่น</th>
                                <th class="text-left py-3 px-4 text-gray-400">รายได้รวม</th>
                                <th class="text-left py-3 px-4 text-gray-400">สถานะ</th>
                                <th class="text-left py-3 px-4 text-gray-400">วันที่เริ่ม</th>
                            </tr>
                        </thead>
                        <tbody id="referralsTableBody">
                            ${referrals.map(referral => this.renderReferralRow(referral)).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    renderEarningRow(earning) {
        const typeTexts = {
            'sale': 'การขาย',
            'referral': 'Referral',
            'commission': 'คอมมิชชั่น'
        };

        const typeColors = {
            'sale': 'emerald',
            'referral': 'blue',
            'commission': 'purple'
        };

        const typeText = typeTexts[earning.type] || 'ไม่ทราบ';
        const typeColor = typeColors[earning.type] || 'gray';

        // Get user info (need to fetch from users)
        const userName = `User ${earning.user_id}`;

        return `
            <tr class="border-b border-gray-800 hover:bg-gray-800" data-earning-id="${earning.id}" data-type="${earning.type}">
                <td class="py-3 px-4">
                    <div>
                        <p class="text-gray-300">@${userName}</p>
                        <p class="text-gray-500 text-sm">ID: ${earning.user_id}</p>
                    </div>
                </td>
                <td class="py-3 px-4">
                    <span class="bg-${typeColor}-600 text-${typeColor}-100 px-2 py-1 rounded-full text-xs">${typeText}</span>
                </td>
                <td class="py-3 px-4">
                    <span class="text-emerald-400 font-bold">${this.formatCurrency(earning.amount)}</span>
                </td>
                <td class="py-3 px-4">
                    ${earning.source_order_id ? `<span class="text-blue-400 font-mono">#${earning.source_order_id.toString().padStart(6, '0')}</span>` : '-'}
                </td>
                <td class="py-3 px-4">
                    ${earning.referral_id ? `<span class="text-purple-400">#${earning.referral_id}</span>` : '-'}
                </td>
                <td class="py-3 px-4 text-gray-400 text-sm">${this.formatDateTime(earning.created_at)}</td>
            </tr>
        `;
    }

    renderReferralRow(referral) {
        const statusColors = {
            'active': 'emerald',
            'inactive': 'red'
        };

        const statusTexts = {
            'active': 'ใช้งานอยู่',
            'inactive': 'ไม่ใช้งาน'
        };

        const statusColor = statusColors[referral.status] || 'gray';
        const statusText = statusTexts[referral.status] || 'ไม่ทราบ';

        return `
            <tr class="border-b border-gray-800 hover:bg-gray-800" data-referral-id="${referral.id}" data-status="${referral.status}">
                <td class="py-3 px-4">
                    <div>
                        <p class="text-gray-300">@User${referral.referrer_id}</p>
                        <p class="text-gray-500 text-sm">ID: ${referral.referrer_id}</p>
                    </div>
                </td>
                <td class="py-3 px-4">
                    <div>
                        <p class="text-gray-300">@User${referral.referred_id}</p>
                        <p class="text-gray-500 text-sm">ID: ${referral.referred_id}</p>
                    </div>
                </td>
                <td class="py-3 px-4">
                    <span class="bg-blue-600 text-blue-100 px-2 py-1 rounded-full text-xs">ระดับ ${referral.level}</span>
                </td>
                <td class="py-3 px-4 text-yellow-400">${(referral.commission_rate * 100).toFixed(1)}%</td>
                <td class="py-3 px-4">
                    <span class="text-emerald-400 font-bold">${this.formatCurrency(referral.total_earnings)}</span>
                </td>
                <td class="py-3 px-4">
                    <span class="bg-${statusColor}-600 text-${statusColor}-100 px-2 py-1 rounded-full text-xs">${statusText}</span>
                </td>
                <td class="py-3 px-4 text-gray-400 text-sm">${this.formatDate(referral.created_at)}</td>
            </tr>
        `;
    }

    async fetchEarnings() {
        // In a real app, this would be a MockDatabase method
        // For now, we'll use the earnings data directly
        return this.db.earnings || [];
    }

    async fetchReferrals() {
        // In a real app, this would be a MockDatabase method
        // For now, we'll use the referrals data directly
        return this.db.referrals || [];
    }

    async loadReportsContent() {
        const users = await this.fetchUsers();
        const products = await this.fetchProducts();
        const orders = await this.fetchOrders();
        const earnings = await this.fetchEarnings();

        // Calculate summary statistics
        const totalUsers = users.length;
        const activeUsers = users.filter(u => u.status === 'active').length;
        const totalProducts = products.length;
        const activeProducts = products.filter(p => p.status === 'active').length;
        const totalOrders = orders.length;
        const completedOrders = orders.filter(o => o.status === 'completed').length;
        const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
        const totalCommissions = earnings.reduce((sum, earning) => sum + earning.amount, 0);

        return `
            <div class="mb-6">
                <h2 class="text-3xl font-bold text-white mb-2">รายงาน</h2>
                <p class="text-gray-400">ภาพรวมและสถิติของระบบ Fingrow Marketplace</p>
            </div>

            <!-- Summary Cards -->
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div class="stat-card p-6 rounded-lg">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-400 text-sm">ผู้ใช้ทั้งหมด</p>
                            <p class="text-2xl font-bold text-white">${totalUsers}</p>
                            <p class="text-emerald-400 text-sm">ใช้งานอยู่: ${activeUsers}</p>
                        </div>
                        <div class="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                            <i class="fas fa-users text-white"></i>
                        </div>
                    </div>
                </div>

                <div class="stat-card p-6 rounded-lg">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-400 text-sm">สินค้าทั้งหมด</p>
                            <p class="text-2xl font-bold text-white">${totalProducts}</p>
                            <p class="text-emerald-400 text-sm">เปิดขาย: ${activeProducts}</p>
                        </div>
                        <div class="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                            <i class="fas fa-box text-white"></i>
                        </div>
                    </div>
                </div>

                <div class="stat-card p-6 rounded-lg">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-400 text-sm">คำสั่งซื้อ</p>
                            <p class="text-2xl font-bold text-white">${totalOrders}</p>
                            <p class="text-emerald-400 text-sm">เสร็จสิ้น: ${completedOrders}</p>
                        </div>
                        <div class="w-12 h-12 bg-yellow-600 rounded-lg flex items-center justify-center">
                            <i class="fas fa-shopping-cart text-white"></i>
                        </div>
                    </div>
                </div>

                <div class="stat-card p-6 rounded-lg">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-400 text-sm">รายได้รวม</p>
                            <p class="text-2xl font-bold text-white">${this.formatCurrency(totalRevenue)}</p>
                            <p class="text-emerald-400 text-sm">ค่าคอมมิชชั่น: ${this.formatCurrency(totalCommissions)}</p>
                        </div>
                        <div class="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center">
                            <i class="fas fa-coins text-white"></i>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Charts Section -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <!-- Sales Chart -->
                <div class="card p-6 rounded-lg">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-xl font-semibold text-white">ยอดขายรายเดือน</h3>
                        <select class="bg-gray-700 text-gray-300 px-3 py-1 rounded text-sm">
                            <option>6 เดือนล่าสุด</option>
                            <option>1 ปีล่าสุด</option>
                        </select>
                    </div>
                    <div class="h-64 flex items-center justify-center bg-gray-800 rounded-lg">
                        <canvas id="salesChart" width="400" height="200"></canvas>
                    </div>
                </div>

                <!-- User Growth Chart -->
                <div class="card p-6 rounded-lg">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-xl font-semibold text-white">การเติบโตของผู้ใช้</h3>
                        <select class="bg-gray-700 text-gray-300 px-3 py-1 rounded text-sm">
                            <option>30 วันล่าสุด</option>
                            <option>90 วันล่าสุด</option>
                        </select>
                    </div>
                    <div class="h-64 flex items-center justify-center bg-gray-800 rounded-lg">
                        <canvas id="userGrowthChart" width="400" height="200"></canvas>
                    </div>
                </div>
            </div>

            <!-- Top Performance Tables -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Top Products -->
                <div class="card p-6 rounded-lg">
                    <h3 class="text-xl font-semibold text-white mb-4">สินค้าขายดี</h3>
                    <div class="overflow-x-auto">
                        <table class="w-full">
                            <thead>
                                <tr class="border-b border-gray-700">
                                    <th class="text-left py-2 text-gray-400 text-sm">สินค้า</th>
                                    <th class="text-left py-2 text-gray-400 text-sm">ขายไป</th>
                                    <th class="text-left py-2 text-gray-400 text-sm">รายได้</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.renderTopProducts(products, orders)}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Top Users -->
                <div class="card p-6 rounded-lg">
                    <h3 class="text-xl font-semibold text-white mb-4">ผู้ใช้ที่ขายได้มากที่สุด</h3>
                    <div class="overflow-x-auto">
                        <table class="w-full">
                            <thead>
                                <tr class="border-b border-gray-700">
                                    <th class="text-left py-2 text-gray-400 text-sm">ผู้ใช้</th>
                                    <th class="text-left py-2 text-gray-400 text-sm">ขายไป</th>
                                    <th class="text-left py-2 text-gray-400 text-sm">รายได้</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.renderTopUsers(users, orders)}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    renderTopProducts(products, orders) {
        // Calculate sales for each product
        const productSales = {};
        orders.forEach(order => {
            const productId = order.product_id;
            if (!productSales[productId]) {
                productSales[productId] = { count: 0, revenue: 0 };
            }
            productSales[productId].count += 1;
            productSales[productId].revenue += order.total || 0;
        });

        // Sort and get top 5
        const topProducts = Object.entries(productSales)
            .sort(([, a], [, b]) => b.revenue - a.revenue)
            .slice(0, 5);

        return topProducts.map(([productId, stats]) => {
            const product = products.find(p => p.id == productId);
            if (!product) return '';

            return `
                <tr class="border-b border-gray-800">
                    <td class="py-2">
                        <div>
                            <p class="text-gray-300">${product.name}</p>
                            <p class="text-gray-500 text-sm">${product.category}</p>
                        </div>
                    </td>
                    <td class="py-2 text-gray-400">${stats.count} ชิ้น</td>
                    <td class="py-2 text-emerald-400">${this.formatCurrency(stats.revenue)}</td>
                </tr>
            `;
        }).join('');
    }

    renderTopUsers(users, orders) {
        // Calculate sales for each user
        const userSales = {};
        orders.forEach(order => {
            const sellerId = order.seller_id;
            if (!userSales[sellerId]) {
                userSales[sellerId] = { count: 0, revenue: 0 };
            }
            userSales[sellerId].count += 1;
            userSales[sellerId].revenue += order.total || 0;
        });

        // Sort and get top 5
        const topUsers = Object.entries(userSales)
            .sort(([, a], [, b]) => b.revenue - a.revenue)
            .slice(0, 5);

        return topUsers.map(([userId, stats]) => {
            const normalizedUsers = this.normalizeUsers(users || []);
            const user = normalizedUsers.find(u => u.id == userId);
            if (!user) return '';

            return `
                <tr class="border-b border-gray-800">
                    <td class="py-2">
                        <div>
                            <p class="text-gray-300">${user.username}</p>
                            <p class="text-gray-500 text-sm">${user.email}</p>
                        </div>
                    </td>
                    <td class="py-2 text-gray-400">${stats.count} รายการ</td>
                    <td class="py-2 text-emerald-400">${this.formatCurrency(stats.revenue)}</td>
                </tr>
            `;
        }).join('');
    }

    setupContentEventListeners(section) {
        switch(section) {
            case 'users':
                this.setupUserManagement();
                break;
            case 'products':
                this.setupProductManagement();
                break;
            case 'orders':
                this.setupOrderManagement();
                break;
            case 'reviews':
                this.setupReviewManagement();
                break;
            case 'earnings':
                this.setupEarningsManagement();
                break;
            case 'reports':
                this.setupReportsManagement();
                break;
            case 'settings':
                this.setupSettingsManagement();
                break;
            // Add more section-specific event listeners
        }
    }

    setupProductManagement() {
        // Search functionality
        const searchInput = document.getElementById('productSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterProducts(e.target.value);
            });
        }

        // Category filter
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.filterProductsByCategory(e.target.value);
            });
        }

        // Status filter
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.filterProductsByStatus(e.target.value);
            });
        }
    }

    filterProducts(searchTerm) {
        const rows = document.querySelectorAll('#productsTableBody tr');
        rows.forEach(row => {
            const title = row.querySelector('td:first-child .text-white').textContent.toLowerCase();
            const seller = row.querySelector('td:nth-child(2) .text-gray-300').textContent.toLowerCase();

            if (title.includes(searchTerm.toLowerCase()) || seller.includes(searchTerm.toLowerCase())) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    filterProductsByCategory(category) {
        const rows = document.querySelectorAll('#productsTableBody tr');
        rows.forEach(row => {
            if (category === 'all') {
                row.style.display = '';
            } else {
                const productCategory = row.getAttribute('data-category');
                row.style.display = productCategory === category ? '' : 'none';
            }
        });
    }

    filterProductsByStatus(status) {
        const rows = document.querySelectorAll('#productsTableBody tr');
        rows.forEach(row => {
            if (status === 'all') {
                row.style.display = '';
            } else {
                const productStatus = row.getAttribute('data-status');
                row.style.display = productStatus === status ? '' : 'none';
            }
        });
    }

    setupOrderManagement() {
        // Search functionality
        const searchInput = document.getElementById('orderSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterOrders(e.target.value);
            });
        }

        // Status filter
        const statusFilter = document.getElementById('orderStatusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.filterOrdersByStatus(e.target.value);
            });
        }

        // Payment filter
        const paymentFilter = document.getElementById('paymentFilter');
        if (paymentFilter) {
            paymentFilter.addEventListener('change', (e) => {
                this.filterOrdersByPayment(e.target.value);
            });
        }
    }

    filterOrders(searchTerm) {
        const rows = document.querySelectorAll('#ordersTableBody tr');
        rows.forEach(row => {
            const orderId = row.querySelector('td:first-child span').textContent.toLowerCase();
            const productName = row.querySelector('td:nth-child(2) .text-white').textContent.toLowerCase();
            const buyer = row.querySelector('td:nth-child(3) .text-gray-300').textContent.toLowerCase();
            const seller = row.querySelector('td:nth-child(4) .text-gray-300').textContent.toLowerCase();

            if (orderId.includes(searchTerm.toLowerCase()) ||
                productName.includes(searchTerm.toLowerCase()) ||
                buyer.includes(searchTerm.toLowerCase()) ||
                seller.includes(searchTerm.toLowerCase())) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    filterOrdersByStatus(status) {
        const rows = document.querySelectorAll('#ordersTableBody tr');
        rows.forEach(row => {
            if (status === 'all') {
                row.style.display = '';
            } else {
                const orderStatus = row.getAttribute('data-status');
                row.style.display = orderStatus === status ? '' : 'none';
            }
        });
    }

    filterOrdersByPayment(payment) {
        const rows = document.querySelectorAll('#ordersTableBody tr');
        rows.forEach(row => {
            if (payment === 'all') {
                row.style.display = '';
            } else {
                const orderPayment = row.getAttribute('data-payment');
                row.style.display = orderPayment === payment ? '' : 'none';
            }
        });
    }

    setupReviewManagement() {
        // Search functionality
        const searchInput = document.getElementById('reviewSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterReviews(e.target.value);
            });
        }

        // Type filter
        const typeFilter = document.getElementById('reviewTypeFilter');
        if (typeFilter) {
            typeFilter.addEventListener('change', (e) => {
                this.filterReviewsByType(e.target.value);
            });
        }

        // Rating filter
        const ratingFilter = document.getElementById('reviewRatingFilter');
        if (ratingFilter) {
            ratingFilter.addEventListener('change', (e) => {
                this.filterReviewsByRating(e.target.value);
            });
        }
    }

    filterReviews(searchTerm) {
        const rows = document.querySelectorAll('#reviewsTableBody tr');
        rows.forEach(row => {
            const comment = row.querySelector('td:nth-child(2) p').textContent.toLowerCase();
            const reviewer = row.querySelector('td:nth-child(3) .text-gray-300').textContent.toLowerCase();
            const reviewee = row.querySelector('td:nth-child(4) .text-gray-300').textContent.toLowerCase();

            if (comment.includes(searchTerm.toLowerCase()) ||
                reviewer.includes(searchTerm.toLowerCase()) ||
                reviewee.includes(searchTerm.toLowerCase())) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    filterReviewsByType(type) {
        const rows = document.querySelectorAll('#reviewsTableBody tr');
        rows.forEach(row => {
            if (type === 'all') {
                row.style.display = '';
            } else {
                const reviewType = row.getAttribute('data-type');
                row.style.display = reviewType === type ? '' : 'none';
            }
        });
    }

    filterReviewsByRating(rating) {
        const rows = document.querySelectorAll('#reviewsTableBody tr');
        rows.forEach(row => {
            if (rating === 'all') {
                row.style.display = '';
            } else {
                const reviewRating = row.getAttribute('data-rating');
                row.style.display = reviewRating === rating ? '' : 'none';
            }
        });
    }

    setupEarningsManagement() {
        // Search functionality for earnings table
        const earningsSearchInput = document.getElementById('earningsSearch');
        if (earningsSearchInput) {
            earningsSearchInput.addEventListener('input', (e) => {
                this.filterEarnings(e.target.value);
            });
        }

        // Type filter for earnings
        const earningsTypeFilter = document.getElementById('earningsTypeFilter');
        if (earningsTypeFilter) {
            earningsTypeFilter.addEventListener('change', (e) => {
                this.filterEarningsByType(e.target.value);
            });
        }

        // Search functionality for referrals table
        const referralsSearchInput = document.getElementById('referralsSearch');
        if (referralsSearchInput) {
            referralsSearchInput.addEventListener('input', (e) => {
                this.filterReferrals(e.target.value);
            });
        }

        // Status filter for referrals
        const referralsStatusFilter = document.getElementById('referralsStatusFilter');
        if (referralsStatusFilter) {
            referralsStatusFilter.addEventListener('change', (e) => {
                this.filterReferralsByStatus(e.target.value);
            });
        }
    }

    filterEarnings(searchTerm) {
        const rows = document.querySelectorAll('#earningsTableBody tr');
        rows.forEach(row => {
            const description = row.querySelector('td:nth-child(2)').textContent.toLowerCase();
            const amount = row.querySelector('td:nth-child(3)').textContent.toLowerCase();

            if (description.includes(searchTerm.toLowerCase()) ||
                amount.includes(searchTerm.toLowerCase())) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    filterEarningsByType(type) {
        const rows = document.querySelectorAll('#earningsTableBody tr');
        rows.forEach(row => {
            if (type === 'all') {
                row.style.display = '';
            } else {
                const earningType = row.getAttribute('data-type');
                row.style.display = earningType === type ? '' : 'none';
            }
        });
    }

    filterReferrals(searchTerm) {
        const rows = document.querySelectorAll('#referralsTableBody tr');
        rows.forEach(row => {
            const referredUser = row.querySelector('td:nth-child(1) .text-gray-300').textContent.toLowerCase();
            const level = row.querySelector('td:nth-child(2)').textContent.toLowerCase();

            if (referredUser.includes(searchTerm.toLowerCase()) ||
                level.includes(searchTerm.toLowerCase())) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    filterReferralsByStatus(status) {
        const rows = document.querySelectorAll('#referralsTableBody tr');
        rows.forEach(row => {
            if (status === 'all') {
                row.style.display = '';
            } else {
                const referralStatus = row.getAttribute('data-status');
                row.style.display = referralStatus === status ? '' : 'none';
            }
        });
    }

    setupReportsManagement() {
        // Initialize charts if Chart.js is available
        this.initializeReportsCharts();

        // Set up any interactive elements for reports
        // Currently, the reports section is mainly display-only
        // But we could add filters, export functions, etc. here
        console.log('Reports management initialized');
    }

    initializeReportsCharts() {
        // Initialize sales chart
        setTimeout(() => {
            const salesChartCanvas = document.getElementById('salesChart');
            if (salesChartCanvas && typeof Chart !== 'undefined') {
                const salesCtx = salesChartCanvas.getContext('2d');
                new Chart(salesCtx, {
                    type: 'line',
                    data: {
                        labels: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.'],
                        datasets: [{
                            label: 'ยอดขาย (WLD)',
                            data: [1200, 1900, 3000, 5000, 2000, 3000],
                            borderColor: '#10b981',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            tension: 0.1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                labels: {
                                    color: '#f4f4f5'
                                }
                            }
                        },
                        scales: {
                            y: {
                                ticks: {
                                    color: '#a1a1aa'
                                },
                                grid: {
                                    color: 'rgba(161, 161, 170, 0.1)'
                                }
                            },
                            x: {
                                ticks: {
                                    color: '#a1a1aa'
                                },
                                grid: {
                                    color: 'rgba(161, 161, 170, 0.1)'
                                }
                            }
                        }
                    }
                });
            }

            // Initialize user growth chart
            const userGrowthCanvas = document.getElementById('userGrowthChart');
            if (userGrowthCanvas && typeof Chart !== 'undefined') {
                const userCtx = userGrowthCanvas.getContext('2d');
                new Chart(userCtx, {
                    type: 'bar',
                    data: {
                        labels: ['สัปดาห์ 1', 'สัปดาห์ 2', 'สัปดาห์ 3', 'สัปดาห์ 4'],
                        datasets: [{
                            label: 'ผู้ใช้ใหม่',
                            data: [12, 19, 30, 50],
                            backgroundColor: '#3b82f6',
                            borderColor: '#3b82f6',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                labels: {
                                    color: '#f4f4f5'
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    color: '#a1a1aa'
                                },
                                grid: {
                                    color: 'rgba(161, 161, 170, 0.1)'
                                }
                            },
                            x: {
                                ticks: {
                                    color: '#a1a1aa'
                                },
                                grid: {
                                    color: 'rgba(161, 161, 170, 0.1)'
                                }
                            }
                        }
                    }
                });
            }
        }, 100); // Small delay to ensure DOM is ready
    }

    setupSettingsManagement() {
        // Load current WLD price for settings display
        this.loadWLDPriceForSettings();

        // Set up any interactive elements for settings
        console.log('Settings management initialized');
    }

    async loadWLDPriceForSettings() {
        try {
            const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=worldcoin-wld&vs_currencies=thb');
            const data = await response.json();
            const wldData = data['worldcoin-wld'];

            if (wldData) {
                const thbPrice = wldData.thb;
                const priceElement = document.getElementById('currentWLDRate');
                if (priceElement) {
                    priceElement.textContent = `1 WLD = ฿${thbPrice.toFixed(2)}`;
                }
            }
        } catch (error) {
            console.error('Error loading WLD price for settings:', error);
        }
    }

    async loadSettingsContent() {
        return `
            <div class="mb-6">
                <h2 class="text-3xl font-bold text-white mb-2">การตั้งค่าระบบ</h2>
                <p class="text-gray-400">จัดการการตั้งค่าและกำหนดค่าต่างๆ ของระบบ Fingrow Marketplace</p>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- General Settings -->
                <div class="card p-6 rounded-lg">
                    <h3 class="text-xl font-semibold text-white mb-4">
                        <i class="fas fa-cog mr-2"></i>การตั้งค่าทั่วไป
                    </h3>

                    <div class="space-y-4">
                        <div>
                            <label class="block text-gray-300 text-sm font-medium mb-2">ชื่อระบบ</label>
                            <input type="text" value="Fingrow V3" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500">
                        </div>

                        <div>
                            <label class="block text-gray-300 text-sm font-medium mb-2">คำอธิบายระบบ</label>
                            <textarea rows="3" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500">Secondhand Marketplace with Worldcoin Integration</textarea>
                        </div>

                        <div>
                            <label class="block text-gray-300 text-sm font-medium mb-2">อีเมลแอดมิน</label>
                            <input type="email" value="admin@fingrow.app" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500">
                        </div>

                        <div class="flex items-center">
                            <input type="checkbox" id="maintenanceMode" class="mr-2">
                            <label for="maintenanceMode" class="text-gray-300 text-sm">เปิดโหมดปรับปรุงระบบ</label>
                        </div>
                    </div>
                </div>

                <!-- Currency & WLD Settings -->
                <div class="card p-6 rounded-lg">
                    <h3 class="text-xl font-semibold text-white mb-4">
                        <i class="fas fa-coins mr-2"></i>การตั้งค่าสกุลเงิน & WLD
                    </h3>

                    <div class="space-y-4">
                        <div>
                            <label class="block text-gray-300 text-sm font-medium mb-2">สกุลเงินหลัก</label>
                            <select class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500">
                                <option value="THB">บาท (THB)</option>
                                <option value="USD">ดอลลาร์ (USD)</option>
                                <option value="WLD">Worldcoin (WLD)</option>
                            </select>
                        </div>

                        <div>
                            <label class="block text-gray-300 text-sm font-medium mb-2">ค่าคอมมิชชั่น (%)</label>
                            <input type="number" value="5" min="0" max="50" step="0.1" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500">
                        </div>

                        <div>
                            <label class="block text-gray-300 text-sm font-medium mb-2">ยอดถอนขั้นต่ำ (WLD)</label>
                            <input type="number" value="10" min="1" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500">
                        </div>

                        <div>
                            <label class="block text-gray-300 text-sm font-medium mb-2">อัตราแลกเปลี่ยน WLD</label>
                            <div class="flex items-center space-x-2">
                                <span class="text-emerald-400 font-bold" id="currentWLDRate">1 WLD = ฿Loading...</span>
                                <button onclick="updateWLDRate()" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm">
                                    <i class="fas fa-sync mr-1"></i>อัปเดต
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Security Settings -->
                <div class="card p-6 rounded-lg">
                    <h3 class="text-xl font-semibold text-white mb-4">
                        <i class="fas fa-shield-alt mr-2"></i>การตั้งค่าความปลอดภัย
                    </h3>

                    <div class="space-y-4">
                        <div class="flex items-center">
                            <input type="checkbox" id="twoFactorAuth" checked class="mr-2">
                            <label for="twoFactorAuth" class="text-gray-300 text-sm">เปิดใช้งาน Two-Factor Authentication</label>
                        </div>

                        <div class="flex items-center">
                            <input type="checkbox" id="requireEmailVerification" checked class="mr-2">
                            <label for="requireEmailVerification" class="text-gray-300 text-sm">บังคับยืนยันอีเมลสำหรับผู้ใช้ใหม่</label>
                        </div>

                        <div class="flex items-center">
                            <input type="checkbox" id="enableLoginLogging" checked class="mr-2">
                            <label for="enableLoginLogging" class="text-gray-300 text-sm">บันทึกการเข้าสู่ระบบ</label>
                        </div>

                        <div>
                            <label class="block text-gray-300 text-sm font-medium mb-2">จำนวนครั้งการเข้าสู่ระบบที่ผิดสูงสุด</label>
                            <input type="number" value="5" min="3" max="10" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500">
                        </div>

                        <div>
                            <label class="block text-gray-300 text-sm font-medium mb-2">ระยะเวลาล็อคบัญชี (นาที)</label>
                            <input type="number" value="15" min="5" max="60" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500">
                        </div>
                    </div>
                </div>

                <!-- MLM & Referral Settings -->
                <div class="card p-6 rounded-lg">
                    <h3 class="text-xl font-semibold text-white mb-4">
                        <i class="fas fa-users-cog mr-2"></i>การตั้งค่า MLM & Referral
                    </h3>

                    <div class="space-y-4">
                        <div class="flex items-center">
                            <input type="checkbox" id="enableMLM" checked class="mr-2">
                            <label for="enableMLM" class="text-gray-300 text-sm">เปิดใช้งานระบบ MLM</label>
                        </div>

                        <div>
                            <label class="block text-gray-300 text-sm font-medium mb-2">จำนวนระดับ MLM</label>
                            <input type="number" value="7" min="3" max="10" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500">
                        </div>

                        <div>
                            <label class="block text-gray-300 text-sm font-medium mb-2">อัตราค่าคอมมิชชั่น Referral (%)</label>
                            <div class="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <label class="text-gray-400">ระดับ 1:</label>
                                    <input type="number" value="10" min="0" max="50" step="0.1" class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white">
                                </div>
                                <div>
                                    <label class="text-gray-400">ระดับ 2:</label>
                                    <input type="number" value="5" min="0" max="50" step="0.1" class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white">
                                </div>
                                <div>
                                    <label class="text-gray-400">ระดับ 3:</label>
                                    <input type="number" value="3" min="0" max="50" step="0.1" class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white">
                                </div>
                                <div>
                                    <label class="text-gray-400">ระดับ 4-7:</label>
                                    <input type="number" value="1" min="0" max="50" step="0.1" class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Notification Settings -->
                <div class="card p-6 rounded-lg">
                    <h3 class="text-xl font-semibold text-white mb-4">
                        <i class="fas fa-bell mr-2"></i>การตั้งค่าการแจ้งเตือน
                    </h3>

                    <div class="space-y-4">
                        <div class="flex items-center">
                            <input type="checkbox" id="emailNotifications" checked class="mr-2">
                            <label for="emailNotifications" class="text-gray-300 text-sm">แจ้งเตือนผ่านอีเมล</label>
                        </div>

                        <div class="flex items-center">
                            <input type="checkbox" id="smsNotifications" class="mr-2">
                            <label for="smsNotifications" class="text-gray-300 text-sm">แจ้งเตือนผ่าน SMS</label>
                        </div>

                        <div class="flex items-center">
                            <input type="checkbox" id="pushNotifications" checked class="mr-2">
                            <label for="pushNotifications" class="text-gray-300 text-sm">Push Notifications</label>
                        </div>

                        <div>
                            <label class="block text-gray-300 text-sm font-medium mb-2">SMTP Server</label>
                            <input type="text" value="smtp.gmail.com" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500">
                        </div>

                        <div class="grid grid-cols-2 gap-2">
                            <div>
                                <label class="block text-gray-300 text-sm font-medium mb-2">SMTP Port</label>
                                <input type="number" value="587" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500">
                            </div>
                            <div>
                                <label class="block text-gray-300 text-sm font-medium mb-2">SMTP Username</label>
                                <input type="email" placeholder="admin@fingrow.app" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500">
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Backup & Maintenance -->
                <div class="card p-6 rounded-lg">
                    <h3 class="text-xl font-semibold text-white mb-4">
                        <i class="fas fa-database mr-2"></i>การสำรองข้อมูลและบำรุงรักษา
                    </h3>

                    <div class="space-y-4">
                        <div>
                            <label class="block text-gray-300 text-sm font-medium mb-2">การสำรองข้อมูลอัตโนมัติ</label>
                            <select class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500">
                                <option value="daily">รายวัน</option>
                                <option value="weekly">รายสัปดาห์</option>
                                <option value="monthly">รายเดือน</option>
                                <option value="disabled">ปิดใช้งาน</option>
                            </select>
                        </div>

                        <div>
                            <label class="block text-gray-300 text-sm font-medium mb-2">เก็บข้อมูลสำรอง (วัน)</label>
                            <input type="number" value="30" min="7" max="365" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500">
                        </div>

                        <div class="flex space-x-2">
                            <button onclick="createBackup()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex-1">
                                <i class="fas fa-save mr-2"></i>สร้างการสำรองข้อมูล
                            </button>
                            <button onclick="restoreBackup()" class="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg flex-1">
                                <i class="fas fa-upload mr-2"></i>คืนค่าข้อมูล
                            </button>
                        </div>

                        <div class="pt-4 border-t border-gray-700">
                            <button onclick="clearCache()" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg w-full">
                                <i class="fas fa-broom mr-2"></i>ล้างแคช
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Save Settings Button -->
            <div class="mt-8 text-center">
                <button onclick="saveSettings()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-lg text-lg font-semibold">
                    <i class="fas fa-save mr-2"></i>บันทึกการตั้งค่า
                </button>
            </div>
        `;
    }

    // User Edit Modal Functions
    editUser(userId) {
        console.log('[Admin] Edit user:', { userId, type: typeof userId });

        // Keep userId as string (our database uses string IDs)
        const userIdString = String(userId);
        console.log('[Admin] Using userId:', userIdString);

        // Clear cache to ensure we get fresh data from database
        this.db.clearCache('users');

        // Find user data (use getAllUsers to avoid pagination issues)
        this.db.getAllUsers().then(result => {
            // Check if result and result.data exist
            if (!result || !result.data || !Array.isArray(result.data)) {
                console.error('[Admin] Invalid users data structure:', result);
                this.showError('เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ใช้');
                return;
            }

            console.log('[Admin] Got users data:', {
                total: result.total,
                dataLength: result.data.length,
                firstUser: result.data[0]?.id,
                lookingFor: userIdString,
                allUserIds: result.data.map(u => ({ id: u.id, type: typeof u.id, username: u.username }))
            });

            const user = result.data.find(u => {
                const match = String(u.id) === userIdString;
                console.log('[Admin] Checking user:', { userId: u.id, username: u.username, match });
                return match;
            });

            if (user) {
                console.log('[Admin] Found user for edit:', user.username);
                this.populateUserEditModal(user);
                this.showUserEditModal();
            } else {
                console.error('[Admin] User not found:', numericUserId);
                this.showError('ไม่พบข้อมูลผู้ใช้');
            }
        }).catch(error => {
            console.error('[Admin] Error getting users:', error);
            this.showError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
        });
    }

    async deleteUser(userId) {
        console.log('[Admin] Delete user:', { userId, type: typeof userId });

        // Keep userId as string (our database uses string IDs)
        const userIdString = String(userId);

        // Confirm deletion
        if (!confirm(`คุณต้องการลบผู้ใช้ ID: ${userIdString} หรือไม่?\n\nการลบจะไม่สามารถกู้คืนได้`)) {
            return;
        }

        try {
            // Call delete API
            const result = await this.db.deleteUser(userIdString);

            if (result.success) {
                this.showSuccess(`ลบผู้ใช้ ${result.deletedUser.username} สำเร็จ`);

                // Show warning if user has related data
                if (result.relatedData.orders > 0 || result.relatedData.products > 0) {
                    const warning = `ผู้ใช้นี้มีข้อมูลที่เกี่ยวข้อง: ${result.relatedData.orders} คำสั่งซื้อ, ${result.relatedData.products} สินค้า`;
                    console.warn('[Admin] User had related data:', warning);
                }

                // Refresh the user list
                await this.loadUsers();
            } else {
                this.showError('ไม่สามารถลบผู้ใช้ได้');
            }
        } catch (error) {
            console.error('[Admin] Delete user error:', error);
            this.showError(error.message || 'เกิดข้อผิดพลาดในการลบผู้ใช้');
        }
    }

    populateUserEditModal(user) {
        // Store current user ID for saving
        this.currentEditUserId = user.id;

        // Populate form fields with correct field mapping
        document.getElementById('editUsername').value = user.username || '';
        document.getElementById('editEmail').value = user.email || '';
        document.getElementById('editFullName').value = user.full_name || '';
        document.getElementById('editPhone').value = user.phone || '';
        document.getElementById('editStatus').value = user.is_active ? 'active' : 'inactive';
        document.getElementById('editReferralCode').value = user.invite_code || '';
        document.getElementById('editWalletBalance').value = user.wallet_balance || 0;
        document.getElementById('editWldBalance').value = user.wld_balance || 0;

        // Set profile image field and preview
        const profileImageInput = document.getElementById('editProfileImage');
        const imageUrl = user.profile_image || user.avatar_url || '';
        console.log('[Admin] populateUserEditModal - user.profile_image:', user.profile_image);
        console.log('[Admin] populateUserEditModal - user.avatar_url:', user.avatar_url);
        console.log('[Admin] Final imageUrl:', imageUrl);
        console.log('[Admin] profileImageInput found:', !!profileImageInput);

        if (profileImageInput) {
            profileImageInput.value = imageUrl;
            this.updateProfileImagePreview(imageUrl);
        } else {
            console.error('[Admin] editProfileImage input not found');
        }

        // Populate structured address fields if they exist
        if (document.getElementById('editAddressNumber')) {
            document.getElementById('editAddressNumber').value = user.address_number || '';
        }
        if (document.getElementById('editAddressStreet')) {
            document.getElementById('editAddressStreet').value = user.address_street || '';
        }
        if (document.getElementById('editAddressSubdistrict')) {
            document.getElementById('editAddressSubdistrict').value = user.address_subdistrict || '';
        }
        if (document.getElementById('editAddressDistrict')) {
            document.getElementById('editAddressDistrict').value = user.address_district || '';
        }
        if (document.getElementById('editAddressProvince')) {
            document.getElementById('editAddressProvince').value = user.address_province || '';
        }
        if (document.getElementById('editAddressPostalCode')) {
            document.getElementById('editAddressPostalCode').value = user.address_postal_code || '';
        }

        // Format dates for input fields
        if (user.created_at) {
            const createdDate = new Date(user.created_at).toISOString().split('T')[0];
            document.getElementById('editCreatedAt').value = createdDate;
        }

        if (user.last_login) {
            const loginDate = new Date(user.last_login).toISOString().split('T')[0];
            document.getElementById('editLastLogin').value = loginDate;
        }

        document.getElementById('editReferredBy').value = user.referred_by || '';

        // Set profile image
        document.getElementById('editProfileImage').value = user.profile_image || '';
        this.updateProfileImagePreview(user.profile_image);
    }

    showUserEditModal() {
        const modal = document.getElementById('userEditModal');
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        // Setup event listeners for modal
        this.setupUserModalEventListeners();
    }

    hideUserEditModal() {
        const modal = document.getElementById('userEditModal');
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }

    setupUserModalEventListeners() {
        // Simple approach - use onclick handlers
        window.closeUserModal = () => this.hideUserEditModal();
        window.cancelUserEdit = () => this.hideUserEditModal();
        window.saveUserEdit = () => this.saveUserEdit();

        // Profile image preview update
        const profileImageInput = document.getElementById('editProfileImage');
        if (profileImageInput) {
            profileImageInput.addEventListener('input', (e) => {
                this.updateProfileImagePreview(e.target.value);
            });
        }

        // Click outside modal
        const modal = document.getElementById('userEditModal');
        modal.onclick = (e) => {
            if (e.target.id === 'userEditModal') {
                this.hideUserEditModal();
            }
        };
    }

    updateProfileImagePreview(imageUrl) {
        console.log('[Admin] updateProfileImagePreview called with:', imageUrl);
        const preview = document.getElementById('editProfileImagePreview');
        console.log('[Admin] preview element found:', !!preview);

        if (!preview) {
            console.error('[Admin] editProfileImagePreview element not found');
            return;
        }

        if (imageUrl && imageUrl.trim()) {
            console.log('[Admin] Setting image preview to:', imageUrl);
            preview.innerHTML = `<img src="${imageUrl}" class="w-full h-full rounded-full object-cover" onerror="this.parentNode.innerHTML='👤';">`;
        } else {
            console.log('[Admin] No imageUrl, showing default avatar');
            preview.innerHTML = '👤';
        }
    }

    async saveUserEdit() {
        const form = document.getElementById('userEditForm');
        const formData = new FormData(form);

        // Create updated user object with correct database field mapping
        const updatedUser = {
            id: this.currentEditUserId,
            username: formData.get('username'),
            email: formData.get('email'),
            full_name: formData.get('full_name'),
            phone: formData.get('phone'),
            is_active: formData.get('status') === 'active' ? 1 : 0,
            invite_code: formData.get('referral_code'),
            avatar_url: formData.get('profile_image') || '',
            location: formData.get('location') || '',
            bio: formData.get('bio') || ''
        };

        try {
            // Update user in MockDatabase
            await this.db.updateUser(this.currentEditUserId, updatedUser);

            // Show success message
            this.showSuccess('อัพเดทข้อมูลผู้ใช้เรียบร้อยแล้ว');

            // Hide modal
            this.hideUserEditModal();

            // Refresh users list if we're on users page
            const contentArea = document.getElementById('content-area');
            if (contentArea.innerHTML.includes('จัดการผู้ใช้งาน')) {
                this.loadContent('users');
            }

        } catch (error) {
            console.error('Error updating user:', error);
            this.showError('ไม่สามารถอัพเดทข้อมูลผู้ใช้ได้ กรุณาลองใหม่อีกครั้ง');
        }
    }

    toggleUserStatus(userId) {
        console.log('Toggle user status:', userId);
        // Keep userId as string (our database uses string IDs)
        const userIdString = String(userId);

        // Find and toggle user status
        this.db.getAllUsers().then(result => {
            // Check if result and result.data exist
            if (!result || !result.data || !Array.isArray(result.data)) {
                console.error('[Admin] Invalid users data structure:', result);
                this.showError('เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ใช้');
                return;
            }

            const user = result.data.find(u => String(u.id) === userIdString);
            if (user) {
                const newStatus = user.is_active ? 0 : 1;
                this.db.updateUser(userIdString, { is_active: newStatus }).then(() => {
                    this.showSuccess(`เปลี่ยนสถานะผู้ใช้เป็น ${newStatus ? 'ใช้งาน' : 'ไม่ใช้งาน'} แล้ว`);

                    // Refresh users list if we're on users page
                    const contentArea = document.getElementById('content-area');
                    if (contentArea.innerHTML.includes('จัดการผู้ใช้งาน')) {
                        this.loadContent('users');
                    }
                });
            }
        });
    }

    toggleProductStatus(productId) {
        console.log('Toggle product status:', productId);
        // Find and toggle product status
        this.db.getAllProducts().then(products => {
            const product = products.find(p => p.id == productId);
            if (product) {
                const newStatus = product.status === 'active' ? 'inactive' : 'active';
                this.db.updateProductStatus(productId, newStatus).then(async () => {
                    this.showSuccess(`เปลี่ยนสถานะสินค้าเป็น ${newStatus === 'active' ? 'ใช้งาน' : 'ไม่ใช้งาน'} แล้ว`);

                    // Refresh only the products table if we're on products page
                    const contentArea = document.getElementById('content-area');
                    if (contentArea.innerHTML.includes('จัดการสินค้า')) {
                        await this.refreshProductsTable();
                    }
                });
            }
        });
    }

    async deleteProduct(productId) {
        console.log('[Admin] Delete product:', { productId, type: typeof productId });

        // Keep productId as string (our database uses string IDs)
        const productIdString = String(productId);

        // Get product info first
        try {
            const products = await this.db.getAllProducts();
            const product = products.find(p => String(p.id) === productIdString);

            if (!product) {
                this.showError('ไม่พบสินค้าที่ต้องการลบ');
                return;
            }

            // Confirm deletion
            if (!confirm(`คุณต้องการลบสินค้า "${product.title}" หรือไม่?\n\nการลบจะไม่สามารถกู้คืนได้`)) {
                return;
            }

            // Call delete API
            const result = await this.db.deleteProduct(productIdString);

            if (result.success) {
                this.showSuccess(`ลบสินค้า "${product.title}" สำเร็จ`);

                // Refresh only the products table if we're on products page
                const contentArea = document.getElementById('content-area');
                if (contentArea.innerHTML.includes('จัดการสินค้า')) {
                    // Refresh just the products table content
                    await this.refreshProductsTable();
                }
            } else {
                this.showError('ไม่สามารถลบสินค้าได้');
            }
        } catch (error) {
            console.error('[Admin] Error deleting product:', error);
            this.showError('เกิดข้อผิดพลาดในการลบสินค้า');
        }
    }

    async refreshProductsTable() {
        try {
            // Get updated products data
            const products = await this.fetchProducts();

            // Update the table body
            const tbody = document.getElementById('productsTableBody');
            if (tbody) {
                tbody.innerHTML = products.map(product => this.renderProductRow(product)).join('');
            }

            // Update the product count in header
            const headerElement = document.querySelector('h3');
            if (headerElement && headerElement.textContent.includes('รายการสินค้า')) {
                headerElement.textContent = `รายการสินค้า (${products.length} รายการ)`;
            }

            // Update the pagination info
            const paginationInfo = document.querySelector('.text-gray-400');
            if (paginationInfo && paginationInfo.textContent.includes('แสดง')) {
                paginationInfo.textContent = `แสดง 1-${products.length} จาก ${products.length} รายการ`;
            }

            console.log('[Admin] Products table refreshed successfully');
        } catch (error) {
            console.error('[Admin] Error refreshing products table:', error);
            this.showError('เกิดข้อผิดพลาดในการอัปเดตรายการสินค้า');
        }
    }

    setupUserManagement() {
        // Search functionality
        const searchInput = document.getElementById('userSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterUsers(e.target.value);
            });
        }

        // Status filter
        const statusFilter = document.getElementById('userStatusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.filterUsersByStatus(e.target.value);
            });
        }
    }

    filterUsers(searchTerm) {
        const rows = document.querySelectorAll('#usersTableBody tr');
        rows.forEach(row => {
            const username = row.querySelector('td:first-child .text-white').textContent.toLowerCase();
            const email = row.querySelector('td:nth-child(2)').textContent.toLowerCase();

            if (username.includes(searchTerm.toLowerCase()) || email.includes(searchTerm.toLowerCase())) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }


    setupSearch() {
        // Global search functionality
        // Implementation depends on specific requirements
    }

    setupModals() {
        // Modal setup for various admin functions
        // Edit user, approve products, etc.
    }

    async refreshDashboard() {
        const refreshBtn = document.querySelector('button[onclick="admin.refreshDashboard()"]');
        if (refreshBtn) {
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>กำลังโหลด...';
            refreshBtn.disabled = true;
        }

        try {
            await this.loadDashboardData();
            this.showSuccess('อัพเดทข้อมูลเรียบร้อยแล้ว');
        } catch (error) {
            this.showError('ไม่สามารถอัพเดทข้อมูลได้');
        } finally {
            if (refreshBtn) {
                refreshBtn.innerHTML = '<i class="fas fa-sync mr-2"></i>Refresh';
                refreshBtn.disabled = false;
            }
        }
    }

    updateDateTime() {
        const now = new Date();
        const dateElement = document.getElementById('currentDate');
        const timeElement = document.getElementById('currentTime');

        if (dateElement) {
            try {
                const dateStr = now.toLocaleDateString('th-TH', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                dateElement.textContent = dateStr;
            } catch (error) {
                console.error('Error formatting date:', error);
                dateElement.textContent = now.toLocaleDateString('en-US');
            }
        }

        if (timeElement) {
            try {
                const timeStr = now.toLocaleTimeString('th-TH', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
                timeElement.textContent = timeStr;
            } catch (error) {
                console.error('Error formatting time:', error);
                timeElement.textContent = now.toLocaleTimeString('en-US');
            }
        }
    }

    // Utility methods
    formatCurrency(amount, currency = 'THB') {
        return new Intl.NumberFormat('th-TH', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount) + ` ${currency}`;
    }

    formatNumber(number) {
        return new Intl.NumberFormat('th-TH').format(number);
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg z-50 ${
            type === 'success' ? 'bg-emerald-600' :
            type === 'error' ? 'bg-red-600' : 'bg-blue-600'
        } text-white`;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    async loadRecentOrders() {
        try {
            const recentOrders = await this.db.getRecentOrders(5);
            const ordersContainer = document.getElementById('recent-orders');

            ordersContainer.innerHTML = recentOrders.map(order => {
                const timeAgo = this.getTimeAgo(order.created_at);
                const iconClass = this.getProductIcon(order.product.category);
                const iconColor = this.getProductIconColor(order.product.category);

                return `
                    <div class="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                        <div class="flex items-center">
                            <div class="w-10 h-10 ${iconColor} rounded-lg flex items-center justify-center mr-3">
                                <i class="${iconClass} text-white"></i>
                            </div>
                            <div>
                                <p class="text-white font-medium">${order.product.title}</p>
                                <p class="text-gray-400 text-sm">โดย @${order.buyer?.username || 'Deleted User'}</p>
                            </div>
                        </div>
                        <div class="text-right">
                            <p class="text-emerald-400 font-medium">${this.formatCurrency(order.total_amount)}</p>
                            <p class="text-gray-400 text-sm">${timeAgo}</p>
                        </div>
                    </div>
                `;
            }).join('');
        } catch (error) {
            console.error('Error loading recent orders:', error);
        }
    }

    async loadTopSellers() {
        try {
            const topSellers = await this.db.getTopSellers(5);
            const sellersContainer = document.getElementById('top-sellers');

            sellersContainer.innerHTML = topSellers.map((seller, index) => {
                const stars = this.renderStars(seller.rating || 0);
                const rankColors = ['bg-yellow-500', 'bg-gray-500', 'bg-yellow-600', 'bg-blue-500', 'bg-green-500'];

                return `
                    <div class="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                        <div class="flex items-center">
                            <div class="w-10 h-10 ${rankColors[index] || 'bg-gray-500'} rounded-full flex items-center justify-center mr-3">
                                <span class="text-white font-bold text-sm">${index + 1}</span>
                            </div>
                            <div>
                                <p class="text-white font-medium">@${seller.username}</p>
                                <div class="flex items-center">
                                    <div class="flex text-yellow-400 mr-2">
                                        ${stars}
                                    </div>
                                    <span class="text-gray-400 text-sm">${seller.rating ? seller.rating.toFixed(1) : '0.0'}</span>
                                </div>
                            </div>
                        </div>
                        <div class="text-right">
                            <p class="text-emerald-400 font-medium">${seller.orders || 0} ขาย</p>
                            <p class="text-gray-400 text-sm">${this.formatCurrency(seller.totalSales || 0)}</p>
                        </div>
                    </div>
                `;
            }).join('');
        } catch (error) {
            console.error('Error loading top sellers:', error);
        }
    }

    getProductIcon(category) {
        const icons = {
            'electronics': 'fas fa-mobile-alt',
            'gaming': 'fas fa-gamepad',
            'camera': 'fas fa-camera',
            'fashion': 'fas fa-tshirt',
            'music': 'fas fa-music',
            'default': 'fas fa-shopping-bag'
        };
        return icons[category] || icons.default;
    }

    getProductIconColor(category) {
        const colors = {
            'electronics': 'bg-blue-500',
            'gaming': 'bg-purple-500',
            'camera': 'bg-green-500',
            'fashion': 'bg-pink-500',
            'music': 'bg-yellow-500',
            'default': 'bg-emerald-500'
        };
        return colors[category] || colors.default;
    }

    renderStars(rating) {
        const fullStars = Math.floor(rating);
        const halfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

        let starsHTML = '';
        for (let i = 0; i < fullStars; i++) {
            starsHTML += '<i class="fas fa-star text-xs"></i>';
        }
        if (halfStar) {
            starsHTML += '<i class="fas fa-star-half-alt text-xs"></i>';
        }
        for (let i = 0; i < emptyStars; i++) {
            starsHTML += '<i class="far fa-star text-xs"></i>';
        }
        return starsHTML;
    }

    getTimeAgo(dateString) {
        const now = new Date();
        const date = new Date(dateString);
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'เพิ่งนี้';
        if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
        if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
        return `${diffDays} วันที่แล้ว`;
    }


    async refreshDashboard() {
        const refreshBtn = document.querySelector('button[onclick="admin.refreshDashboard()"]');
        if (refreshBtn) {
            const originalContent = refreshBtn.innerHTML;
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Refreshing...';
            refreshBtn.disabled = true;
        }

        try {
            // Refresh all data
            await this.loadDashboardData();
            this.updateDateTime();

            // Show success notification
            this.showSuccess('ข้อมูลอัพเดทเรียบร้อยแล้ว');
        } catch (error) {
            console.error('Error refreshing dashboard:', error);
            this.showError('ไม่สามารถอัพเดทข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
        } finally {
            if (refreshBtn) {
                refreshBtn.innerHTML = '<i class="fas fa-sync mr-2"></i>Refresh';
                refreshBtn.disabled = false;
            }
        }
    }

    // Earnings & Referrals Methods
    async refreshEarnings() {
        const refreshBtn = document.querySelector('button[onclick="admin.refreshEarnings()"]');
        if (refreshBtn) {
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>กำลังโหลด...';
            refreshBtn.disabled = true;
        }

        try {
            await this.loadEarningsData();
            this.showSuccess('อัพเดทข้อมูลรายได้เรียบร้อยแล้ว');
        } catch (error) {
            console.error('Error refreshing earnings:', error);
            this.showError('ไม่สามารถอัพเดทข้อมูลได้');
        } finally {
            if (refreshBtn) {
                refreshBtn.innerHTML = '<i class="fas fa-sync mr-2"></i>รีเฟรช';
                refreshBtn.disabled = false;
            }
        }
    }

    async loadEarningsData() {
        // DEPRECATED: This function is replaced by loadNetworkDNA()
        // Old earnings system - no longer used
        console.log('[Admin] loadEarningsData() is deprecated. Use loadNetworkDNA() instead.');
        return;

        /* COMMENTED OUT - OLD CODE
        try {
            // Get all users with referral data
            const result = await this.db.getAllUsers();

            // Check if result and result.data exist
            if (!result || !result.data || !Array.isArray(result.data)) {
                console.error('[Admin] Invalid users data structure:', result);
                throw new Error('ไม่สามารถโหลดข้อมูลผู้ใช้ได้');
            }

            // Calculate totals
            let totalEarnings = 0;
            let totalReferrals = 0;
            let referralEarnings = 0;
            let salesEarnings = 0;

            result.data.forEach(user => {
                if (user.stats && user.stats.earnings) {
                    totalEarnings += user.stats.earnings.total;
                    referralEarnings += user.stats.earnings.fromReferrals;
                    salesEarnings += user.stats.earnings.fromSales;
                }
                if (user.stats && user.stats.referrals) {
                    totalReferrals += user.stats.referrals.total;
                }
            });

            // Update summary cards
            this.updateElement('totalEarnings', `฿${totalEarnings.toLocaleString()}`);
            this.updateElement('totalReferrals', totalReferrals.toLocaleString());
            this.updateElement('referralEarnings', `฿${referralEarnings.toLocaleString()}`);
            this.updateElement('salesEarnings', `฿${salesEarnings.toLocaleString()}`);

            // Load users referral table
            await this.loadUsersReferralTable();

        } catch (error) {
            console.error('Error loading earnings data:', error);
            throw error;
        }
        */
    }

    async loadUsersReferralTable(page = 1, pageSize = 10, searchTerm = '') {
        try {
            const result = await this.db.getAllUsers();

            // Check if result and result.data exist
            if (!result || !result.data || !Array.isArray(result.data)) {
                console.error('[Admin] Invalid users data structure:', result);
                throw new Error('ไม่สามารถโหลดข้อมูลผู้ใช้ได้');
            }

            let users = result.data;

            // Search filter
            if (searchTerm) {
                users = users.filter(user =>
                    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    user.full_name.toLowerCase().includes(searchTerm.toLowerCase())
                );
            }

            // Pagination
            const totalUsers = users.length;
            const totalPages = Math.ceil(totalUsers / pageSize);
            const startIndex = (page - 1) * pageSize;
            const endIndex = startIndex + pageSize;
            const paginatedUsers = users.slice(startIndex, endIndex);

            // Get referrer information for each user
            const usersWithReferrer = await Promise.all(
                paginatedUsers.map(async (user) => {
                    let referrerInfo = null;
                    if (user.referred_by) {
                        console.log(`[Admin] User ${user.username} has referred_by: ${user.referred_by} (type: ${typeof user.referred_by})`);
                        const allUsersResult = await this.db.getAllUsers();

                        // Check if result and result.data exist
                        if (allUsersResult && allUsersResult.data && Array.isArray(allUsersResult.data)) {
                            referrerInfo = allUsersResult.data.find(u => {
                            const match = u.id == user.referred_by; // Use loose equality
                            console.log(`[Admin] Checking referrer ID ${u.id} (${u.username}) == ${user.referred_by}: ${match}`);
                            return match;
                        });
                        }
                        console.log(`[Admin] Found referrer info for ${user.username}:`, referrerInfo ? referrerInfo.username : 'NOT FOUND');
                    } else {
                        console.log(`[Admin] User ${user.username} has no referred_by`);
                    }
                    return { ...user, referrerInfo };
                })
            );

            // Generate table HTML
            this.renderUsersReferralTable(usersWithReferrer);
            this.renderPagination('userReferralPagination', page, totalPages, searchTerm, pageSize);

            // Update count
            this.updateElement('userReferralCount',
                `แสดง ${startIndex + 1}-${Math.min(endIndex, totalUsers)} จาก ${totalUsers} ผู้ใช้`);

        } catch (error) {
            console.error('Error loading users referral table:', error);
            this.showError('ไม่สามารถโหลดตารางผู้ใช้ได้');
        }
    }

    renderUsersReferralTable(users) {
        const tbody = document.getElementById('usersReferralTable');
        if (!tbody) return;

        tbody.innerHTML = users.map(user => {
            const referrerName = user.referrerInfo ?
                `@${user.referrerInfo.username}` :
                '-';

            const referralCode = user.referral_code || '-';

            const referralsCount = user.stats?.referrals?.total || 0;

            // Debug logging for DuckLord
            if (user.username && user.username.toLowerCase().includes('ducklord')) {
                console.log(`[DEBUG] ${user.username} referrals:`, {
                    userId: user.id,
                    referralsCount: referralsCount,
                    stats: user.stats,
                    rawReferrals: user.stats?.referrals
                });
            }
            const referralEarnings = user.stats?.earnings?.fromReferrals || 0;

            const statusBadge = user.status === 'active' ?
                '<span class="bg-green-500 text-white px-2 py-1 rounded-full text-xs">ใช้งาน</span>' :
                '<span class="bg-red-500 text-white px-2 py-1 rounded-full text-xs">ไม่ใช้งาน</span>';

            return `
                <tr class="border-b border-gray-700 hover:bg-gray-800 transition-colors">
                    <td class="py-4">
                        <div class="flex items-center">
                            <div class="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center mr-3">
                                <span class="text-white text-sm font-bold">${user.username[0].toUpperCase()}</span>
                            </div>
                            <div>
                                <div class="text-white font-medium">${user.full_name}</div>
                                <div class="text-gray-400 text-sm">@${user.username}</div>
                            </div>
                        </div>
                    </td>
                    <td class="py-4 text-gray-300">
                        ${referrerName}
                    </td>
                    <td class="py-4">
                        <code class="bg-gray-700 px-2 py-1 rounded text-emerald-400">${referralCode}</code>
                    </td>
                    <td class="py-4 text-center">
                        <span class="text-blue-400 font-bold">${referralsCount}</span>
                    </td>
                    <td class="py-4 text-right">
                        <span class="text-purple-400 font-bold">฿${referralEarnings.toLocaleString()}</span>
                    </td>
                    <td class="py-4">
                        ${statusBadge}
                    </td>
                </tr>
            `;
        }).join('');
    }

    searchUsers() {
        const searchTerm = document.getElementById('userSearchInput').value.trim();
        this.loadUsersReferralTable(1, 10, searchTerm);
    }

    // Helper function to update element content
    updateElement(elementId, content) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = content;
        } else {
            console.warn(`Element with ID '${elementId}' not found`);
        }
    }

    // Helper function to render pagination
    renderPagination(containerId, currentPage, totalPages, searchTerm = '', pageSize = 10) {
        const container = document.getElementById(containerId);
        if (!container) return;

        let paginationHTML = '';

        // Previous button
        if (currentPage > 1) {
            paginationHTML += `
                <button onclick="admin.loadUsersReferralTable(${currentPage - 1}, ${pageSize}, '${searchTerm}')"
                        class="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors">
                    <i class="fas fa-chevron-left"></i>
                </button>
            `;
        }

        // Page numbers
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);

        for (let i = startPage; i <= endPage; i++) {
            const isActive = i === currentPage;
            paginationHTML += `
                <button onclick="admin.loadUsersReferralTable(${i}, ${pageSize}, '${searchTerm}')"
                        class="px-3 py-2 ${isActive ? 'bg-emerald-600' : 'bg-gray-700'} text-white rounded-lg hover:bg-gray-600 transition-colors">
                    ${i}
                </button>
            `;
        }

        // Next button
        if (currentPage < totalPages) {
            paginationHTML += `
                <button onclick="admin.loadUsersReferralTable(${currentPage + 1}, ${pageSize}, '${searchTerm}')"
                        class="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors">
                    <i class="fas fa-chevron-right"></i>
                </button>
            `;
        }

        container.innerHTML = paginationHTML;
    }

    showModal(modalId, data = {}) {
        // Modal implementation for various admin functions
        console.log(`Show modal: ${modalId}`, data);
    }
}

// Initialize admin dashboard
const admin = new FingrowAdmin();

// Make admin globally available
window.admin = admin;

// Expose important methods globally for onclick handlers
window.editUser = (userId) => {
    console.log('Global editUser called with userId:', userId);
    console.log('admin object:', admin);
    console.log('admin.editUser function:', admin.editUser);
    try {
        admin.editUser(userId);
    } catch (error) {
        console.error('Error calling admin.editUser:', error);
    }
};
window.toggleUserStatus = (userId) => {
    console.log('Global toggleUserStatus called with userId:', userId);
    try {
        admin.toggleUserStatus(userId);
    } catch (error) {
        console.error('Error calling admin.toggleUserStatus:', error);
    }
};

window.deleteUser = (userId) => {
    console.log('Global deleteUser called with userId:', userId);
    try {
        admin.deleteUser(userId);
    } catch (error) {
        console.error('Error calling admin.deleteUser:', error);
    }
};

// Product management functions
window.editProduct = (productId) => {
    console.log('Global editProduct called with productId:', productId);
    console.log('Product edit functionality coming soon...');
    // TODO: Implement product edit modal
};

window.toggleProductStatus = (productId) => {
    console.log('Global toggleProductStatus called with productId:', productId);
    try {
        admin.toggleProductStatus(productId);
    } catch (error) {
        console.error('Error calling admin.toggleProductStatus:', error);
    }
};

window.deleteProduct = (productId) => {
    console.log('Global deleteProduct called with productId:', productId);
    try {
        admin.deleteProduct(productId);
    } catch (error) {
        console.error('Error calling admin.deleteProduct:', error);
    }
};

// Order management functions
window.viewOrder = (orderId) => {
    console.log('Global viewOrder called with orderId:', orderId);
    console.log('Order details view functionality coming soon...');
    // TODO: Implement order details modal
};

window.updateOrderStatus = (orderId) => {
    console.log('Global updateOrderStatus called with orderId:', orderId);
    console.log('Order status update functionality coming soon...');
    // TODO: Implement order status update modal
};

// Review management functions
window.viewReview = (reviewId) => {
    console.log('Global viewReview called with reviewId:', reviewId);
    console.log('Review details view functionality coming soon...');
    // TODO: Implement review details modal
};

window.deleteReview = (reviewId) => {
    console.log('Global deleteReview called with reviewId:', reviewId);
    if (confirm('คุณต้องการลบรีวิวนี้หรือไม่?')) {
        console.log('Review deletion functionality coming soon...');
        // TODO: Implement review deletion
    }
};

// Settings management functions
window.updateWLDRate = () => {
    console.log('Updating WLD rate...');
    if (window.admin) {
        window.admin.loadWLDPriceForSettings();
    }
};

window.saveSettings = () => {
    console.log('Saving settings...');
    if (confirm('คุณต้องการบันทึกการตั้งค่าหรือไม่?')) {
        // TODO: Implement settings save functionality
        alert('บันทึกการตั้งค่าเรียบร้อยแล้ว!');
    }
};

window.createBackup = () => {
    console.log('Creating backup...');
    if (confirm('คุณต้องการสร้างการสำรองข้อมูลหรือไม่?')) {
        // TODO: Implement backup functionality
        alert('กำลังสร้างการสำรองข้อมูล... กรุณารอสักครู่');
    }
};

window.restoreBackup = () => {
    console.log('Restoring backup...');
    if (confirm('คุณต้องการคืนค่าข้อมูลหรือไม่? การดำเนินการนี้จะเขียนทับข้อมูลปัจจุบัน!')) {
        // TODO: Implement restore functionality
        alert('กรุณาเลือกไฟล์สำรองที่ต้องการคืนค่า');
    }
};

window.clearCache = () => {
    console.log('Clearing cache...');
    if (confirm('คุณต้องการล้างแคชระบบหรือไม่?')) {
        // TODO: Implement cache clearing functionality
        alert('ล้างแคชเรียบร้อยแล้ว!');
    }
};

// ==================== EARNINGS DASHBOARD ====================

/**
 * Load Earnings Dashboard
 * Called when earnings tab is shown
 */
window.loadEarningsDashboard = async () => {
    try {
        // Load users for filter dropdown
        const usersRes = await fetch('/api/users');
        const users = await usersRes.json();

        const userSelect = document.getElementById('earningsUserFilter');
        const breakdownSelect = document.getElementById('breakdownUserSelect');

        // Populate user dropdowns
        [userSelect, breakdownSelect].forEach(select => {
            select.innerHTML = '<option value="">All Users / Select user...</option>';
            if (users.data) {
                users.data.forEach(user => {
                    const option = document.createElement('option');
                    option.value = user.id;
                    option.textContent = `${user.full_name || user.username} (${user.id})`;
                    select.appendChild(option);
                });
            }
        });

        // Load summary and top earners
        await Promise.all([
            fetchEarningsSummary(),
            fetchTopEarners()
        ]);

    } catch (error) {
        console.error('Error loading earnings dashboard:', error);
        alert('Error loading earnings data: ' + error.message);
    }
};

/**
 * Fetch Earnings Summary
 */
async function fetchEarningsSummary() {
    try {
        const userId = document.getElementById('earningsUserFilter').value;
        const from = document.getElementById('earningsFromDate').value;
        const to = document.getElementById('earningsToDate').value;

        const params = new URLSearchParams();
        if (userId) params.append('userId', userId);
        if (from) params.append('from', from);
        if (to) params.append('to', to);

        const res = await fetch(`/api/admin/earnings/summary?${params}`);
        const result = await res.json();

        if (result.success) {
            const data = result.data;

            // Format numbers in Thai locale
            const formatTHB = (num) => {
                return new Intl.NumberFormat('th-TH', {
                    style: 'currency',
                    currency: 'THB'
                }).format(num);
            };

            document.getElementById('kpiTotalSubtree').textContent = formatTHB(data.totalSubtree);
            document.getElementById('kpiSelfOnly').textContent = formatTHB(data.totalSelf);
            document.getElementById('kpiMembers').textContent = data.members.toLocaleString('th-TH');
            document.getElementById('kpiMaxDepth').textContent = data.depth;
        } else {
            console.error('Failed to fetch summary:', result.message);
        }
    } catch (error) {
        console.error('Error fetching summary:', error);
    }
}

/**
 * Fetch Top Earners
 */
async function fetchTopEarners() {
    try {
        const from = document.getElementById('earningsFromDate').value;
        const to = document.getElementById('earningsToDate').value;

        const params = new URLSearchParams();
        params.append('limit', '20');
        if (from) params.append('from', from);
        if (to) params.append('to', to);

        const res = await fetch(`/api/admin/earnings/top?${params}`);
        const result = await res.json();

        if (result.success) {
            renderTopEarnersTable(result.data);
        } else {
            console.error('Failed to fetch top earners:', result.message);
        }
    } catch (error) {
        console.error('Error fetching top earners:', error);
    }
}

/**
 * Render Top Earners Table
 */
function renderTopEarnersTable(earners) {
    const tbody = document.getElementById('topEarnersTable');

    if (!earners || earners.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-400">No data available</td></tr>';
        return;
    }

    const formatTHB = (num) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(num);
    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    tbody.innerHTML = earners.map(earner => `
        <tr class="border-b border-gray-700 hover:bg-gray-700 transition-colors">
            <td class="py-4">
                <div class="flex items-center">
                    ${earner.avatar_url ?
                        `<img src="${earner.avatar_url}" class="w-10 h-10 rounded-full mr-3" alt="${earner.username}">` :
                        `<div class="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold mr-3">${(earner.full_name || earner.username).charAt(0).toUpperCase()}</div>`
                    }
                    <span class="text-white">${earner.full_name || earner.username}</span>
                </div>
            </td>
            <td class="py-4 text-gray-300">${earner.username}</td>
            <td class="py-4 text-gray-300">${earner.members}</td>
            <td class="py-4 text-emerald-400 font-semibold">${formatTHB(earner.subtree_total)}</td>
            <td class="py-4 text-gray-300">${formatDate(earner.last_earning_at)}</td>
            <td class="py-4">
                <button onclick="viewUserBreakdown('${earner.user_id}')" class="text-blue-400 hover:text-blue-300">
                    <i class="fas fa-eye mr-1"></i>View
                </button>
            </td>
        </tr>
    `).join('');
}

/**
 * Show Earnings Tab
 */
window.showEarningsTab = (tab) => {
    // Hide all tabs
    document.getElementById('topEarnersTab').style.display = 'none';
    document.getElementById('breakdownTab').style.display = 'none';
    document.getElementById('rawTab').style.display = 'none';

    // Reset tab buttons
    ['tabTopEarners', 'tabBreakdown', 'tabRaw'].forEach(id => {
        const btn = document.getElementById(id);
        btn.classList.remove('bg-gray-700', 'border-emerald-500', 'text-white');
        btn.classList.add('text-gray-400');
    });

    // Show selected tab
    if (tab === 'top') {
        document.getElementById('topEarnersTab').style.display = 'block';
        document.getElementById('tabTopEarners').classList.add('bg-gray-700', 'border-emerald-500', 'text-white');
        document.getElementById('tabTopEarners').classList.remove('text-gray-400');
    } else if (tab === 'breakdown') {
        document.getElementById('breakdownTab').style.display = 'block';
        document.getElementById('tabBreakdown').classList.add('bg-gray-700', 'border-emerald-500', 'text-white');
        document.getElementById('tabBreakdown').classList.remove('text-gray-400');
    } else if (tab === 'raw') {
        document.getElementById('rawTab').style.display = 'block';
        document.getElementById('tabRaw').classList.add('bg-gray-700', 'border-emerald-500', 'text-white');
        document.getElementById('tabRaw').classList.remove('text-gray-400');
    }
};

/**
 * View User Breakdown
 */
window.viewUserBreakdown = (userId) => {
    // Switch to breakdown tab
    showEarningsTab('breakdown');
    // Set user in dropdown
    document.getElementById('breakdownUserSelect').value = userId;
    // Load breakdown
    loadUserBreakdown();
};

/**
 * Load User Breakdown
 */
window.loadUserBreakdown = async () => {
    const userId = document.getElementById('breakdownUserSelect').value;

    if (!userId) {
        document.getElementById('breakdownContent').innerHTML = '<p class="text-gray-400 text-center py-8">Select a user to view breakdown</p>';
        return;
    }

    try {
        const from = document.getElementById('earningsFromDate').value;
        const to = document.getElementById('earningsToDate').value;

        const params = new URLSearchParams();
        if (from) params.append('from', from);
        if (to) params.append('to', to);

        const res = await fetch(`/api/admin/earnings/user/${userId}?${params}`);
        const result = await res.json();

        if (result.success) {
            renderUserBreakdown(result.data);
        } else {
            document.getElementById('breakdownContent').innerHTML = `<p class="text-red-400 text-center py-8">Error: ${result.message}</p>`;
        }
    } catch (error) {
        console.error('Error loading user breakdown:', error);
        document.getElementById('breakdownContent').innerHTML = `<p class="text-red-400 text-center py-8">Error: ${error.message}</p>`;
    }
};

/**
 * Render User Breakdown
 */
function renderUserBreakdown(data) {
    const formatTHB = (num) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(num);
    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const html = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div class="bg-gray-700 rounded-lg p-4">
                <p class="text-gray-400 text-sm">Self Earnings</p>
                <p class="text-2xl font-bold text-white mt-2">${formatTHB(data.self)}</p>
            </div>
            <div class="bg-gray-700 rounded-lg p-4">
                <p class="text-gray-400 text-sm">Subtree Total</p>
                <p class="text-2xl font-bold text-emerald-400 mt-2">${formatTHB(data.subtreeTotal)}</p>
            </div>
            <div class="bg-gray-700 rounded-lg p-4">
                <p class="text-gray-400 text-sm">Orders Linked</p>
                <p class="text-2xl font-bold text-blue-400 mt-2">${data.ordersLinked}</p>
            </div>
        </div>

        <h4 class="text-lg font-semibold text-white mb-4">Earnings by Generation</h4>
        <div class="space-y-3 mb-6">
            ${Object.entries(data.byGeneration).map(([gen, amount]) => `
                <div class="flex items-center justify-between bg-gray-700 rounded-lg p-4">
                    <span class="text-gray-300">Generation ${gen}</span>
                    <span class="text-white font-semibold">${formatTHB(amount)}</span>
                </div>
            `).join('')}
        </div>

        <div class="text-sm text-gray-400">
            <p>Last Earning: ${formatDate(data.lastEarningAt)}</p>
        </div>
    `;

    document.getElementById('breakdownContent').innerHTML = html;
}

/**
 * Export Earnings CSV
 */
window.exportEarningsCSV = () => {
    const from = document.getElementById('earningsFromDate').value;
    const to = document.getElementById('earningsToDate').value;

    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);

    const url = `/api/admin/earnings/export.csv?${params}`;
    window.open(url, '_blank');
};

// ==================== NETWORK DNA FUNCTIONS ====================

let currentNetworkData = [];
let currentTreeRoot = null;
let navigationHistory = []; // Stack for navigation history

// Load Network DNA data
async function loadNetworkDNA() {
    try {
        const userId = document.getElementById('earningsUserFilter').value;
        const fromDate = document.getElementById('earningsFromDate').value;
        const toDate = document.getElementById('earningsToDate').value;

        const params = new URLSearchParams();
        if (userId) params.append('userId', userId);
        if (fromDate) params.append('fromDate', fromDate);
        if (toDate) params.append('toDate', toDate);

        const response = await fetch(`/api/admin/network-dna?${params}`);
        const result = await response.json();

        if (result.success) {
            currentNetworkData = result.data;
            renderDNATable(result.data);
            populateUserSelectors(result.data);

            // Load tree for first user (root)
            if (result.data.length > 0) {
                const root = result.data[0];
                loadNetworkTree(root.user_id);
            }
        }
    } catch (error) {
        console.error('Error loading network DNA:', error);
        showError('Failed to load network data');
    }
}

// Switch network tabs
function switchNetworkTab(tabName) {
    // Update tab buttons
    const tableTab = document.getElementById('tabTableView');
    const treeTab = document.getElementById('tabTreeView');

    if (tabName === 'table') {
        // Activate table tab
        tableTab.classList.remove('text-gray-400', 'hover:text-white', 'hover:bg-gray-700');
        tableTab.classList.add('text-white', 'bg-gray-700', 'border-b-2', 'border-emerald-500');
        treeTab.classList.remove('text-white', 'bg-gray-700', 'border-b-2', 'border-emerald-500');
        treeTab.classList.add('text-gray-400', 'hover:text-white', 'hover:bg-gray-700');

        // Show/hide content
        document.getElementById('networkTableTab').style.display = 'block';
        document.getElementById('networkTreeTab').style.display = 'none';
    } else if (tabName === 'tree') {
        // Activate tree tab
        treeTab.classList.remove('text-gray-400', 'hover:text-white', 'hover:bg-gray-700');
        treeTab.classList.add('text-white', 'bg-gray-700', 'border-b-2', 'border-emerald-500');
        tableTab.classList.remove('text-white', 'bg-gray-700', 'border-b-2', 'border-emerald-500');
        tableTab.classList.add('text-gray-400', 'hover:text-white', 'hover:bg-gray-700');

        // Show/hide content
        document.getElementById('networkTableTab').style.display = 'none';
        document.getElementById('networkTreeTab').style.display = 'block';
    }
}

// Render DNA table
function renderDNATable(data) {
    const tbody = document.getElementById('dnaTableBody');
    const recordCount = document.getElementById('tableRecordCount');

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="15" class="text-center py-8 text-gray-400">No data found</td></tr>';
        if (recordCount) recordCount.textContent = '0';
        return;
    }

    // Update record count
    if (recordCount) recordCount.textContent = data.length;

    tbody.innerHTML = data.map(row => `
        <tr class="border-b border-gray-800 hover:bg-gray-800/50">
            <td class="px-2 py-2 text-center tabular-nums">${row.run_number || 0}</td>
            <td class="px-2 py-2 font-mono text-xs">${row.user_id}</td>
            <td class="px-2 py-2">${row.username || '-'}</td>
            <td class="px-2 py-2 font-mono text-[10px]">${formatDateTime(row.regist_time)}</td>
            <td class="px-2 py-2">${row.regist_type}</td>
            <td class="px-2 py-2 font-mono text-xs">${row.invitor || '-'}</td>
            <td class="px-2 py-2 text-center tabular-nums">${row.follower_count}</td>
            <td class="px-2 py-2 text-center tabular-nums">${row.child_count}</td>
            <td class="px-2 py-2 font-mono text-xs">${row.parent_id || '-'}</td>
            <td class="px-2 py-2 text-right tabular-nums">${Number(row.own_finpoint || 0).toLocaleString()}</td>
            <td class="px-2 py-2 text-right tabular-nums">${Number(row.total_finpoint || 0).toLocaleString()}</td>
            <td class="px-2 py-2 text-center">
                <span class="px-2 py-0.5 text-[10px] rounded-full ${row.follower_full_status === 'Full' ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}">
                    ${row.follower_full_status}
                </span>
            </td>
            <td class="px-2 py-2 text-center">${row.user_type || 'Atta'}</td>
            <td class="px-2 py-2 text-center tabular-nums">${row.level}</td>
            <td class="px-2 py-2 text-center tabular-nums">${row.max_follower}</td>
        </tr>
    `).join('');
}

// Populate user selectors
function populateUserSelectors(data) {
    const earningsFilter = document.getElementById('earningsUserFilter');
    const treeSelector = document.getElementById('treeRootSelector');

    const options = data.map(u =>
        `<option value="${u.user_id}">${u.user_id} - ${u.username || 'Unknown'}</option>`
    ).join('');

    if (earningsFilter) {
        earningsFilter.innerHTML = '<option value="">All Users</option>' + options;
    }

    if (treeSelector) {
        treeSelector.innerHTML = '<option value="">Select user...</option>' + options;
        treeSelector.value = data[0]?.user_id || '';
    }
}

// Load network tree
async function loadNetworkTree(userId, generations = 6, addToHistory = true) {
    try {
        const response = await fetch(`/api/admin/network-tree/${userId}?generations=${generations}`);
        const result = await response.json();

        if (result.success) {
            // Add to navigation history
            if (addToHistory && currentTreeRoot && currentTreeRoot.user_id !== userId) {
                navigationHistory.push(currentTreeRoot.user_id);
            }

            currentTreeRoot = result.root;
            renderNetworkTree(result.data, result.root);
        }
    } catch (error) {
        console.error('Error loading network tree:', error);
        showError('Failed to load network tree');
    }
}

// Navigate back in tree
function navigateBack() {
    if (navigationHistory.length > 0) {
        const previousUserId = navigationHistory.pop();
        loadNetworkTree(previousUserId, 6, false); // Don't add to history when going back
    }
}

// Render network tree (horizontal layout with profile pictures)
function renderNetworkTree(data, root) {
    const container = document.getElementById('networkTreeContainer');
    const rootAvatar = document.getElementById('treeRootAvatar');
    const rootInfo = document.getElementById('treeRootInfo');

    // Update root info
    if (rootInfo) {
        rootInfo.innerHTML = `${root.user_id} <span class="text-gray-400">· ${root.username || 'Unknown'} · <span class="text-emerald-400">${root.child_count || 0} children</span></span>`;
    }

    // Update root avatar
    if (rootAvatar) {
        const avatarUrl = getAvatarUrl(root);
        if (avatarUrl) {
            rootAvatar.innerHTML = `<img src="${avatarUrl}" class="w-full h-full object-cover rounded-full" />`;
        } else {
            rootAvatar.innerHTML = `<i class="fas fa-user text-gray-400"></i>`;
        }
    }

    // Build parent-child map
    const childrenMap = {};
    data.forEach(node => {
        if (node.parent_id) {
            if (!childrenMap[node.parent_id]) {
                childrenMap[node.parent_id] = [];
            }
            childrenMap[node.parent_id].push(node);
        }
    });

    // Sort children by registration time (earliest first)
    Object.keys(childrenMap).forEach(parentId => {
        childrenMap[parentId].sort((a, b) => {
            return new Date(a.regist_time) - new Date(b.regist_time);
        });
    });

    // Get direct children of root (first column - max 5)
    const directChildren = (childrenMap[root.user_id] || []).slice(0, 5);

    // Render tree with new grid structure
    container.innerHTML = `
        ${navigationHistory.length > 0 ? `
            <div class="mb-4">
                <button onclick="navigateBack()"
                        class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors inline-flex items-center gap-2">
                    <i class="fas fa-arrow-left"></i>
                    Back to Previous Level
                    <span class="text-xs text-gray-400 ml-2">(${navigationHistory.length} level${navigationHistory.length > 1 ? 's' : ''} back)</span>
                </button>
            </div>
        ` : ''}

        <style>
            .network-rows {
                display: grid;
                grid-auto-rows: 1fr;
                row-gap: 16px;
            }
            .network-rows .row {
                display: grid;
                grid-template-columns: 280px 1fr;
                column-gap: 16px;
                align-items: stretch;
            }
            .parent-card, .children-wrap {
                height: 100%;
            }
            .parent-card {
                display: flex;
                flex-direction: column;
                padding: 12px;
                border-radius: 8px;
                background: rgba(31, 41, 55, 0.5);
                border: 1px solid rgb(55, 65, 81);
                transition: all 0.2s;
                cursor: pointer;
            }
            .parent-card:hover {
                background: rgb(31, 41, 55);
                border-color: rgb(16, 185, 129);
            }
            .children-wrap {
                display: grid;
                grid-template-columns: repeat(5, minmax(120px, 1fr));
                gap: 12px;
                align-content: start;
                padding: 8px;
                border-left: 2px solid rgb(55, 65, 81);
            }
            .child-card {
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 8px;
                border-radius: 8px;
                background: rgba(31, 41, 55, 0.3);
                border: 1px solid rgb(55, 65, 81);
                transition: all 0.2s;
                cursor: pointer;
                min-height: 120px;
            }
            .child-card:hover {
                background: rgb(31, 41, 55);
                border-color: rgb(6, 182, 212);
            }
            .child-card.empty {
                border: 2px dashed rgb(55, 65, 81);
                cursor: default;
                background: transparent;
            }
            .child-card.empty:hover {
                background: transparent;
                border-color: rgb(55, 65, 81);
            }
        </style>

        <section class="network-rows">
            ${directChildren.length > 0 ? directChildren.map((parent, idx) => {
                const grandChildren = (childrenMap[parent.user_id] || []).slice(0, 5);
                const parentChildCount = parent.child_count || 0;
                const emptySlots = Math.max(0, 5 - grandChildren.length);

                return `
                    <div class="row">
                        <!-- Parent Card -->
                        <article class="parent-card" onclick="loadNetworkTree('${parent.user_id}')">
                            <div class="flex items-center gap-3 mb-2">
                                ${renderAvatarWithBadge(parent, 'ring-emerald-400', parentChildCount)}
                                <div class="flex-1 min-w-0">
                                    <div class="text-sm font-semibold text-white truncate">${parent.username || parent.user_id}</div>
                                    <div class="text-[10px] text-gray-400">${parent.user_id}</div>
                                </div>
                            </div>
                            <div class="text-[10px] text-emerald-400 mt-auto">
                                <i class="fas fa-sitemap mr-1"></i>${parentChildCount} children
                            </div>
                        </article>

                        <!-- Children Wrap -->
                        <div class="children-wrap">
                            <div class="col-span-5 text-xs font-semibold text-gray-400 mb-2">
                                <i class="fas fa-arrow-right mr-2"></i>
                                Children of <span class="text-white">${parent.username || parent.user_id}</span>
                                <span class="text-gray-500 ml-2">(${grandChildren.length}/5)</span>
                            </div>
                            ${grandChildren.map(child => {
                                const childCount = child.child_count || 0;
                                return `
                                    <div class="child-card" onclick="loadNetworkTree('${child.user_id}')">
                                        ${renderAvatarWithBadge(child, 'ring-cyan-400', childCount)}
                                        <div class="text-[10px] mt-2 text-center truncate w-full text-gray-300">
                                            ${child.username || child.user_id}
                                        </div>
                                        <div class="text-[9px] text-cyan-400 mt-1">
                                            <i class="fas fa-sitemap"></i> ${childCount}
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                            ${Array.from({ length: emptySlots }).map((_, i) => `
                                <div class="child-card empty">
                                    <div class="w-10 h-10 rounded-full border-2 border-dashed border-gray-600"></div>
                                    <div class="text-[9px] mt-2 text-gray-600">Slot ${grandChildren.length + i + 1}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }).join('') : `
                <div class="text-center py-12 text-gray-500 col-span-2">
                    <i class="fas fa-users-slash text-4xl mb-3"></i>
                    <p>No children yet</p>
                </div>
            `}
        </section>
    `;
}

// Build chain of generations (first child path)
function buildChain(startId, allData, childrenMap, maxGen = 6) {
    const chain = [];
    let current = allData.find(n => n.user_id === startId);
    let depth = 0;

    while (current && depth < maxGen) {
        chain.push(current);
        const children = childrenMap[current.user_id] || [];
        if (children.length === 0) break;
        current = children[0]; // Follow first child
        depth++;
    }

    return chain;
}

// Render avatar
function renderAvatar(user, ringClass = 'ring-gray-500') {
    const avatarUrl = getAvatarUrl(user);
    const avatarClass = `w-10 h-10 rounded-full overflow-hidden ring-2 ${ringClass} bg-gray-700 flex items-center justify-center`;

    if (avatarUrl) {
        return `<div class="${avatarClass}"><img src="${avatarUrl}" alt="${user.username}" class="w-full h-full object-cover" /></div>`;
    } else {
        return `<div class="${avatarClass}"><span class="text-[10px] text-gray-400">N/A</span></div>`;
    }
}

// Render avatar with child count badge
function renderAvatarWithBadge(user, ringClass = 'ring-gray-500', childCount = 0) {
    const avatarUrl = getAvatarUrl(user);
    const avatarClass = `w-10 h-10 rounded-full overflow-hidden ring-2 ${ringClass} bg-gray-700 flex items-center justify-center`;

    const avatarHtml = avatarUrl
        ? `<img src="${avatarUrl}" alt="${user.username}" class="w-full h-full object-cover" />`
        : `<span class="text-[10px] text-gray-400">N/A</span>`;

    return `
        <div class="relative">
            <div class="${avatarClass}">${avatarHtml}</div>
            ${childCount > 0 ? `
                <div class="absolute -bottom-1 -right-1 bg-emerald-500 text-white text-[9px] font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-gray-900">
                    ${childCount}
                </div>
            ` : ''}
        </div>
    `;
}

// Get avatar URL
function getAvatarUrl(user) {
    if (user.profile_image_filename) {
        return `/uploads/profiles/${user.profile_image_filename}`;
    } else if (user.avatar_url) {
        return user.avatar_url;
    } else {
        // Fallback to pravatar
        return `https://i.pravatar.cc/120?u=${user.user_id}`;
    }
}

// Change tree root
function changeTreeRoot() {
    const selector = document.getElementById('treeRootSelector');
    const userId = selector.value;
    if (userId) {
        loadNetworkTree(userId);
    }
}

// Format datetime
function formatDateTime(isoString) {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleString('th-TH', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Show error
function showError(message) {
    console.error(message);
    // You can add a toast notification here
}

// ==================== END NETWORK DNA FUNCTIONS ====================

// Auto-load when earnings tab is shown
document.addEventListener('DOMContentLoaded', () => {
    // Hook into navigation
    const earningsLink = document.querySelector('a[href="#earnings"]');
    if (earningsLink) {
        earningsLink.addEventListener('click', () => {
            setTimeout(() => {
                loadNetworkDNA();
            }, 100);
        });
    }
});