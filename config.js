// Configuration for API endpoints
// This file allows easy switching between development and production environments

const config = {
    // Development configuration
    development: {
        API_BASE_URL: 'http://localhost:5000/api',
        APP_URL: 'http://localhost:5000',
        ENVIRONMENT: 'development'
    },
    
    // Production configuration
    production: {
        API_BASE_URL: 'https://fingrow-g0db.onrender.com/api',
        APP_URL: 'https://fingrow-g0db.onrender.com',
        ENVIRONMENT: 'production'
    }
};

// Auto-detect environment or use production as default
function getEnvironment() {
    // Check if we're in a development environment
    if (typeof window !== 'undefined') {
        // Browser environment
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'development';
        }
    } else {
        // Node.js environment
        if (process.env.NODE_ENV === 'development') {
            return 'development';
        }
    }
    return 'production';
}

// Get current configuration
const currentEnv = getEnvironment();
const currentConfig = config[currentEnv];

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    module.exports = currentConfig;
} else if (typeof window !== 'undefined') {
    // Browser environment
    window.AppConfig = currentConfig;
}

console.log(`🌍 Environment: ${currentEnv}`);
console.log(`🔗 API Base URL: ${currentConfig.API_BASE_URL}`);