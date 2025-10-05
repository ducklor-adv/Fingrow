// Admin configuration helper
function getApiUrl() {
    // Auto-detect environment
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        // Development environment - use port 5050
        return 'http://localhost:5050/api';
    } else {
        // Production environment
        return 'https://fingrow-g0db.onrender.com/api';
    }
}

// Export for use in other admin scripts
window.getApiUrl = getApiUrl;