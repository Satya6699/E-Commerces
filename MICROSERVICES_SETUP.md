# Microservices Architecture Setup Guide

## Overview

Your monolithic Plant Nursery website has been converted to a **microservices architecture** with the following services:

### Services

1. **API Gateway** (Port 3000) - Main entry point, routes requests to microservices
2. **Auth Service** (Port 3001) - Handles user authentication, JWT tokens, auth logs
3. **Products Service** (Port 3002) - Manages plant catalog and product operations
4. **Orders Service** (Port 3003) - Processes orders and manages order lifecycle
5. **Cart Service** (Port 3004) - Manages shopping carts (in-memory with local persistence)
6. **Admin Service** (Port 3005) - Admin operations and dashboards

## Prerequisites

- Node.js 18+ and npm
- MongoDB (local or Atlas)
- Docker & Docker Compose (for containerized deployment)

## Local Setup (Without Docker)

### 1. Install Dependencies for All Services

```bash
# From root directory
npm run setup:microservices
```

Or manually:

```bash
cd services/api-gateway && npm install
cd ../auth-service && npm install
cd ../products-service && npm install
cd ../orders-service && npm install
cd ../cart-service && npm install
cd ../admin-service && npm install
```

### 2. Configure Environment Variables

Create/update `.env` in the root directory:

```env
# Gateway
PORT=3000

# Services
AUTH_SERVICE_PORT=3001
PRODUCTS_SERVICE_PORT=3002
ORDERS_SERVICE_PORT=3003
CART_SERVICE_PORT=3004
ADMIN_SERVICE_PORT=3005

# Database
MONGODB_URI=mongodb://localhost:27017/plants

# JWT
JWT_SECRET=your-secret-key-change-in-production

# Admin Setup
ADMIN_DEFAULT_EMAIL=admin@lavanya.com
ADMIN_DEFAULT_PHONE=8466899624
ADMIN_DEFAULT_NAME=Admin
ADMIN_CREATION_KEY=your-admin-key
```

### 3. Start All Services

Option A - Start all individually in separate terminals:

```bash
# Terminal 1: Auth Service
cd services/auth-service && npm start

# Terminal 2: Products Service
cd services/products-service && npm start

# Terminal 3: Orders Service
cd services/orders-service && npm start

# Terminal 4: Cart Service
cd services/cart-service && npm start

# Terminal 5: Admin Service
cd services/admin-service && npm start

# Terminal 6: API Gateway
cd services/api-gateway && npm start
```

Option B - Start all with a script:

```bash
npm run start:microservices
```

### 4. Verify Services

Each service has a health check endpoint:

```bash
# Test individual services
curl http://localhost:3001/health    # Auth
curl http://localhost:3002/health    # Products
curl http://localhost:3003/health    # Orders
curl http://localhost:3004/health    # Cart
curl http://localhost:3005/health    # Admin

# Test gateway
curl http://localhost:3000/api/health
```

## Docker Setup

### 1. Build and Run with Docker Compose

```bash
docker-compose -f docker-compose.microservices.yml up -d
```

### 2. Verify Container Status

```bash
docker-compose -f docker-compose.microservices.yml ps
```

### 3. View Logs

```bash
# All services
docker-compose -f docker-compose.microservices.yml logs -f

# Specific service
docker-compose -f docker-compose.microservices.yml logs -f api-gateway
```

### 4. Stop Services

```bash
docker-compose -f docker-compose.microservices.yml down
```

## Frontend Changes Needed

Update your frontend API calls to use the gateway:

### Before (Monolithic):
```javascript
fetch('http://localhost:3000/api/auth/login', ...)
```

### After (Microservices):
```javascript
fetch('http://localhost:3000/api/auth/login', ...)  // Same URL, gateway routes it!
```

**No changes needed!** The API Gateway maintains the same URL structure.

## Service Communication

### Internal Service-to-Service Communication

Services can call each other through the shared `service-client.js`:

```javascript
const { callService } = require('../../shared/service-client');

// Call another service
const response = await callService('orders', 'GET', '/api/orders/user/123');
```

## Database Strategy

### MongoDB (Recommended)

Each service has its own collection in MongoDB:
- `auth` service: users, authLogs collections
- `products` service: products collection
- `orders` service: orders collection
- `cart` service: local file storage (local-db-carts.json)

### Fallback (Local File Storage)

If MongoDB is unavailable, services fall back to local JSON files:
- `local-db-auth.json` (Auth Service)
- `local-db.json` (Orders Service)
- `plants-database.json` (Products Service)
- `local-db-carts.json` (Cart Service)

## API Routes

### Auth Service
```
POST   /api/auth/register       - Register new user
POST   /api/auth/signup         - Signup (alternative)
POST   /api/auth/login          - Login
POST   /api/auth/verify         - Verify token
GET    /api/auth/user/:id       - Get user by ID
```

### Products Service
```
GET    /api/products            - Get all products
GET    /api/products/:id        - Get product by ID
GET    /api/products/search/:query - Search products
POST   /api/products            - Create product (admin)
PUT    /api/products/:id        - Update product (admin)
DELETE /api/products/:id        - Delete product (admin)
```

### Orders Service
```
POST   /api/orders              - Create order
GET    /api/orders              - Get all orders (admin)
GET    /api/orders/user/:userId - Get user's orders
GET    /api/orders/:id          - Get order by ID
PATCH  /api/orders/:id/status   - Update order status (admin)
POST   /api/orders/:id/cancel   - Cancel order
```

### Cart Service
```
GET    /api/cart                - Get user's cart
POST   /api/cart/add            - Add to cart
PUT    /api/cart/update/:productId - Update cart item
DELETE /api/cart/remove/:productId - Remove from cart
DELETE /api/cart/clear          - Clear cart
```

### Admin Service
```
GET    /api/admin/stats         - Get dashboard stats
GET    /api/admin/users         - Get all users
GET    /api/admin/auth-logs     - Get all auth logs
GET    /api/admin/auth-logs/:email - Get logs for email
```

## Troubleshooting

### Service Won't Start
- Check if port is already in use: `lsof -i :3000`
- Kill existing process: `kill -9 <PID>`
- Verify MongoDB is running

### Can't Connect to MongoDB
- Check MongoDB connection string in `.env`
- Services will fallback to local file storage automatically
- Check MongoDB logs: `docker logs plants-mongodb`

### API Gateway Can't Reach Services
- Ensure all services are running
- Check service URLs in `docker-compose.microservices.yml`
- On Docker: services communicate via container names (e.g., `http://auth-service:3001`)

### CORS Issues
- API Gateway has CORS enabled for all origins
- Check browser console for specific errors

## Development Tips

### Watch Mode (Requires nodemon)

Install globally:
```bash
npm install -g nodemon
```

Then run services with:
```bash
npm run dev
```

### Debug a Service

Add debug output:
```bash
DEBUG=* npm start
```

### Monitoring with PM2

Install PM2:
```bash
npm install -g pm2
```

Start all services:
```bash
pm2 start services/auth-service/server.js -n "auth-service"
pm2 start services/products-service/server.js -n "products-service"
# ... repeat for other services
pm2 monit  # Monitor all services
```

## Scaling Considerations

### Load Balancing
- Add nginx reverse proxy in front of API Gateway
- Scale individual services horizontally

### Database
- Implement read replicas for products/orders services
- Use connection pooling for MongoDB

### Caching
- Add Redis for cart service caching
- Cache frequently accessed products

### Message Queue
- Add RabbitMQ/Kafka for async order processing
- Decouple services for better resilience

## Next Steps

1. ✅ Services created and running locally
2. Deploy to Docker
3. Set up monitoring (logs, metrics, health checks)
4. Add CI/CD pipeline
5. Scale services independently
6. Add API rate limiting
7. Implement service-to-service authentication
