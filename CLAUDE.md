# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fingrow V3 is a React Native mobile marketplace application for buying and selling secondhand items using Worldcoin (WLD) as the primary currency. It features a complex MLM referral system (5-line/7-level) and profit-sharing mechanics.

## Key Commands

### Development
```bash
# Start Expo development server (mobile app)
npm start

# Run specific platforms
npm run android  # Android emulator/device
npm run ios      # iOS simulator/device
npm run web      # Web browser

# Start backend server
npm run server      # Runs Node.js server on port 5050

# Run both server and web app concurrently
npm run dev
```

### Docker Deployment (Using Bun for Performance)
All Dockerfiles have been updated to use Bun runtime for faster performance:
```bash
# Build and run with Docker
docker build -t fingrow .
docker run -p 5050:5050 -p 8080:8080 fingrow

# Or use docker-compose
docker-compose up

# Production build
docker-compose -f docker-compose.prod.yml up
```

**Note:** Bun is used in Docker containers only. Local development uses Node.js due to native module compatibility. Docker containers will build native modules correctly with Bun's ABI.

### Database Management
```bash
# Database scripts are in /scripts directory
node scripts/check-and-setup-database.js  # Initialize database
node scripts/seed-dna-from-csv.js         # Seed data from CSV
node scripts/dev-seed.js                  # Development seed data
```

### Database GUI Tools
The server includes two web-based database management tools:

1. **SQLite GUI (sqlite-gui-node)** - Full database management interface
   - Enabled by default (set `ENABLE_DB_GUI=false` to disable)
   - Accessible at: `http://localhost:5050/db-gui/home`
   - Production: `https://your-domain.com/db-gui/home`
   - Features: CRUD operations, custom SQL queries, query code generation

2. **Database Query Tool** - Custom SQL query interface
   - Accessible at: `http://localhost:5050/db-query.html`
   - Production: `https://your-domain.com/db-query.html`
   - Features: Quick queries, custom SQL editor, results table, database stats
   - API endpoint: `POST /api/admin/db-query`

## High-Level Architecture

### 1. **Hybrid Application Structure**
The project has THREE separate interfaces sharing a common backend:

- **Mobile App** (`App.js`): React Native/Expo app for iOS/Android
- **Admin Dashboard** (`/admin`): Web-based admin panel for marketplace management
- **Mobile Web** (`/mobile`): Progressive Web App for mobile browsers

### 2. **Backend Server** 
- **Server** (`server.js`): Express.js server with all API endpoints
  - Express.js server running on port 5050
  - SQLite database (`/data/fingrow.db`) using better-sqlite3
  - Organized into controllers, routes, and middleware
  - RESTful API endpoints for users, products, orders
  - File upload handling with multer for images
  - CORS-enabled for cross-origin requests

### 3. **Database Architecture**
- **Primary Database**: SQLite with comprehensive schema (`/database/schema.sql`)
- **Tables**: users, products, orders, reviews, chat_rooms, messages, referrals, earnings
- **Key Feature**: Complex referral tracking system with MLM levels
- **Migration Scripts**: Located in `/migrations` and `/scripts`

### 4. **Business Logic**
- **Profit Sharing Formula**: `(User % / 7) × 14 × Pool Total`
- **MLM Structure**: 5-line system with 7-level deep commission tracking
- **Commission Rates**: 1-7% seller-selected community contribution
- **Qualification System**: 500+ THB in both buying and selling

### 5. **Services Layer** (`/services`)
- `databaseService.js`: SQLite database operations
- `adminService.js`: Admin-specific business logic
- Frontend services use API client pattern for server communication

### 6. **Authentication & User Management**
- User registration with referral code system
- Profile image uploads to `/uploads/profiles`
- Address management with structured format
- Trust score and verification levels

### 7. **Mobile App Features** (`/components`)
- `CameraModal.js`: Camera integration for product photos
- `QRCodeGenerator.js`: Generate referral QR codes
- `PushNotifications.js`: Push notification handling
- `ChatSystem.js`, `CheckoutSystem.js`: Core marketplace features

### 8. **Currency & Pricing**
- Multi-currency support with real-time conversion
- CoinGecko API integration for WLD exchange rates
- Local currency storage with WLD equivalent

## Important Patterns & Conventions

1. **API Communication**: Mobile app and admin panel communicate via REST API, not direct database access
2. **File Uploads**: All images stored in `/uploads` with subdirectories for profiles, products, qrcodes
3. **Error Handling**: Uses try-catch blocks with proper error responses
4. **State Management**: React Context API for currency and user state
5. **Navigation**: React Navigation for mobile, vanilla JS routing for web interfaces

## Critical Files to Understand

- `server.js`: Original monolithic API server
- `server.js`: Main server with all API endpoints and business logic
- `App.js`: Mobile app entry point with navigation structure
- `/database/schema.sql`: Complete database schema
- `/admin/js/database-connector.js`: How admin panel connects to API
- `/mobile/js/api-client.js`: Mobile web API client implementation

## Development Workflow

1. Always run `npm run server` first to start the backend server
2. For mobile development, use `npm start` and scan QR with Expo Go
3. Database changes require running migration scripts in `/scripts`
4. Test API endpoints directly at `http://localhost:5050/api/*`
5. Check server logs for debugging API issues

## API Structure

The server.js contains all API endpoints:

- **Routes**: Organized by resource (users, products, orders, admin)
- **Controllers**: Business logic separated from route definitions
- **Middleware**: Authentication (simple header-based) and error handling
- **Config**: Database connection and file upload configuration

All endpoints now follow RESTful conventions and return consistent JSON responses.