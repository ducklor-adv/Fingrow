# Fingrow Unified API

This is the unified API for both admin and mobile interfaces of the Fingrow marketplace application.

## Structure

```
api/
├── config/         # Configuration files
│   ├── database.js # Database connection and initialization
│   └── multer.js   # File upload configuration
├── controllers/    # Business logic
│   ├── userController.js
│   ├── productController.js
│   └── orderController.js
├── middleware/     # Express middleware
│   ├── auth.js     # Authentication middleware
│   └── errorHandler.js
├── routes/         # API route definitions
│   ├── index.js    # Main router
│   ├── userRoutes.js
│   ├── productRoutes.js
│   ├── orderRoutes.js
│   └── adminRoutes.js
└── server.js       # Express server entry point
```

## Running the API

```bash
# Run the unified API server
npm run server:api

# Or run with mobile web app
npm run dev
```

The API will be available at `http://localhost:5000/api`

## API Endpoints

### Public Endpoints
- `GET /api/health` - Health check
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - User login
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product details
- `GET /api/categories` - Get categories

### Protected Endpoints (Require Authentication)
All protected endpoints require `x-user-id` header.

#### User Management
- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get user details
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (admin only)
- `POST /api/users/:id/upload-avatar` - Upload profile image

#### Product Management
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `POST /api/products/upload-images` - Upload product images

#### Order Management
- `GET /api/orders` - Get orders
- `GET /api/orders/:id` - Get order details
- `POST /api/orders` - Create order
- `PUT /api/orders/:id/status` - Update order status
- `GET /api/orders/buyer/:userId` - Get user's purchases
- `GET /api/orders/seller/:userId` - Get user's sales

### Admin Endpoints (Require Admin Authentication)
All admin endpoints require admin user authentication.

- `GET /api/admin/dashboard/stats` - Dashboard statistics
- `GET /api/admin/dashboard/topsellers` - Top sellers
- `GET /api/admin/network-stats` - Network statistics
- `GET /api/admin/network-tree/:userId` - User's network tree
- `GET /api/admin/earnings/summary` - Earnings summary

## Authentication

The API uses a simple header-based authentication:

```javascript
// Add user ID to request headers
headers: {
  'x-user-id': 'user_123456'
}
```

For admin endpoints, the user must have admin privileges (username 'admin' or 'Anatta999').

## File Uploads

The API supports file uploads for:
- Profile images: `/api/users/:id/upload-avatar`
- Product images: `/api/products/upload-images`

Files are stored in:
- Profile images: `/uploads/profiles/`
- Product images: `/uploads/products/`

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error message here",
  "error": "Detailed error (in development mode)"
}
```

## Development Notes

1. The API uses SQLite database located at `/data/fingrow.db`
2. Database migrations run automatically on server startup
3. Foreign key constraints are disabled for flexibility
4. All timestamps are stored in ISO format