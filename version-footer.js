/**
 * Fingrow Version Footer Component
 * Fetches and displays app version from API
 */

(function() {
    // Determine API URL based on environment
    const getApiUrl = () => {
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:5050';
        } else {
            return 'https://fingrow-g0db.onrender.com';
        }
    };

    // Create footer element
    function createFooter() {
        const footer = document.createElement('div');
        footer.id = 'version-footer';
        footer.style.cssText = `
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: rgba(0, 0, 0, 0.05);
            backdrop-filter: blur(10px);
            padding: 8px 20px;
            text-align: center;
            font-size: 12px;
            color: #666;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            border-top: 1px solid rgba(0, 0, 0, 0.1);
            z-index: 9999;
        `;
        footer.innerHTML = '<span style="color: #999;">Loading version...</span>';
        document.body.appendChild(footer);
        return footer;
    }

    // Fetch and display version
    async function loadVersion() {
        const footer = createFooter();

        try {
            const response = await fetch(`${getApiUrl()}/api/version`);
            const data = await response.json();

            if (data.success) {
                const env = data.environment === 'production' ? '' : ` (${data.environment})`;
                footer.innerHTML = `
                    <span style="color: #888;">
                        ${data.name} v${data.version}${env}
                    </span>
                    <span style="color: #ccc; margin: 0 8px;">•</span>
                    <span style="color: #999;">
                        ${new Date().getFullYear()} Fingrow
                    </span>
                `;
            } else {
                footer.innerHTML = '<span style="color: #999;">Version info unavailable</span>';
            }
        } catch (error) {
            console.error('Failed to load version info:', error);
            footer.innerHTML = '<span style="color: #999;">Fingrow v1.0.0</span>';
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadVersion);
    } else {
        loadVersion();
    }

    // Add padding to body to prevent content from being hidden by footer
    const style = document.createElement('style');
    style.textContent = 'body { padding-bottom: 40px !important; }';
    document.head.appendChild(style);
})();
