# Microservices Architecture Guide

## 📋 Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Quick Start](#quick-start)
3. [Service Breakdown](#service-breakdown)
4. [API Routes](#api-routes)
5. [Database Schema](#database-schema)
6. [Deployment](#deployment)
7. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

Your monolithic Plant Nursery website has been successfully converted to a **microservices architecture**. This modular design provides:

✅ **Scalability** - Scale individual services based on demand
✅ **Maintainability** - Smaller codebases easier to maintain
✅ **Resilience** - Failure in one service doesn't crash everything
✅ **Technology Flexibility** - Different services can use different tech stacks
✅ **Independent Deployment** - Deploy services independently

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (HTML/JS)                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │       API Gateway (Port 3000)     │
        │  - Request Routing               │
        │  - CORS Handling                 │
        │  - Static File Serving           │
        └──────────────────────────────────┘
                    │
        ┌───────────┼───────────┬─────────────┬─────────────┐
        │           │           │             │             │
        ▼           ▼           ▼             ▼             ▼
    ┌────────┐ ┌────────┐ ┌───────┐ ┌─────────┐ ┌────────┐
    │  Auth  │ │Products│ │Orders │ │  Cart   │ │ Admin  │
    │Service │ │Service │ │Service│ │ Service │ │Service │
    │:3001   │ │:3002   │ │:3003  │ │ :3004   │ │ :3005  │
    └────────┘ └────────┘ └───────┘ └─────────┘ └────────┘
        │           │           │             │
        └───────────┴───────────┴─────────────┘
                    │
                    ▼
            ┌──────────────────┐
            │ MongoDB Database │
            │  (plants DB)     │
            └──────────────────┘
```

---

## Quick Start

### Option 1: Windows (Batch Script)
```bash
# Double-click or run:
start-microservices.bat
```

### Option 2: Linux/Mac (Bash Script)
```bash
chmod +x start-microservices.sh
./start-microservices.sh
```

### Option 3: NPM Scripts
```bash
# Install dependencies for all services
npm run setup:microservices

# Start all services
npm run start:microservices
```

### Option 4: Docker
```bash
# Build and start all services with Docker
npm run docker:up

# View logs
npm run docker:logs

# Stop all services
npm run docker:down
```

---

## Service Breakdown

### 1. API Gateway (Port 3000)
**Purpose**: Single entry point for all client requests

**Key Features**:
- HTTP request routing to microservices
- CORS configuration
- Static file serving (HTML, CSS, JS)
- Service health monitoring

**Technology**: Express.js, express-http-proxy

**Routes**:
- `/api/auth/*` → Auth Service
- `/api/products/*` → Products Service
- `/api/orders/*` → Orders Service
- `/api/cart/*` → Cart Service
- `/api/admin/*` → Admin Service

---

### 2. Auth Service (Port 3001)
**Purpose**: User authentication, authorization, and account management

**Responsibilities**:
- User registration and login
- JWT token generation and verification
- Authentication event logging
- Admin account management

**Database Collections**:
- `users` - User accounts with hashed passwords
- `authLogs` - Login/signup events for security audit

**Key Endpoints**:
```
POST   /api/auth/register    - Create new account
POST   /api/auth/signup      - User signup
POST   /api/auth/login       - User login
POST   /api/auth/verify      - Verify JWT token
GET    /api/auth/user/:id    - Get user details
```

**Features**:
- Password hashing with bcryptjs
- JWT tokens valid for 30 days
- IP address logging for security
- Admin bypass capability
- Auto-create default admin account

---

### 3. Products Service (Port 3002)
**Purpose**: Plant catalog management

**Responsibilities**:
- Product CRUD operations
- Product search functionality
- Inventory management
- Category management

**Database Collection**:
- `products` - Plant catalog with details

**Key Endpoints**:
```
GET    /api/products           - List all products
GET    /api/products/:id       - Get product details
GET    /api/products/search/:query - Search products
POST   /api/products           - Add new product (admin)
PUT    /api/products/:id       - Update product (admin)
DELETE /api/products/:id       - Delete product (admin)
```

**Product Fields**:
```javascript
{
  name: "Rose",
  price: 299.99,
  image: "rose.jpg",
  description: "Beautiful red roses",
  category: "flowers",
  created_at: Date,
  updated_at: Date
}
```

---

### 4. Orders Service (Port 3003)
**Purpose**: Order processing and management

**Responsibilities**:
- Order creation and tracking
- Order status updates
- Order cancellation
- Order history retrieval

**Database Collection**:
- `orders` - All orders with items and status

**Key Endpoints**:
```
POST   /api/orders              - Create new order
GET    /api/orders              - List all orders (admin)
GET    /api/orders/user/:userId - Get user's orders
GET    /api/orders/:id          - Get order details
PATCH  /api/orders/:id/status   - Update status (admin)
POST   /api/orders/:id/cancel   - Cancel order
```

**Order States**:
- `pending` - Awaiting payment/processing
- `confirmed` - Order confirmed
- `shipped` - Order in transit
- `delivered` - Order received
- `cancelled` - Order cancelled

---

### 5. Cart Service (Port 3004)
**Purpose**: Shopping cart management

**Responsibilities**:
- Add/remove items from cart
- Update item quantities
- Cart persistence
- Cart total calculation

**Storage**:
- Primary: Local JSON file (`local-db-carts.json`)
- Optional: Can be extended to use Redis for distributed caching

**Key Endpoints**:
```
GET    /api/cart               - Get user's cart
POST   /api/cart/add           - Add item to cart
PUT    /api/cart/update/:productId - Update quantity
DELETE /api/cart/remove/:productId - Remove item
DELETE /api/cart/clear         - Empty cart
```

**Cart Structure**:
```javascript
{
  userId: "user123",
  items: [
    {
      productId: "prod456",
      name: "Rose",
      quantity: 2,
      price: 299.99
    }
  ],
  total: 599.98
}
```

---

### 6. Admin Service (Port 3005)
**Purpose**: Administrative operations and dashboard

**Responsibilities**:
- Dashboard statistics
- User management
- Order management
- Security audit logs

**Key Endpoints**:
```
GET    /api/admin/stats        - Dashboard statistics
GET    /api/admin/users        - List all users
GET    /api/admin/auth-logs    - All authentication events
GET    /api/admin/auth-logs/:email - Events for specific user
```

**Features**:
- Aggregates data from other services
- Requires admin authentication
- Real-time statistics

---

## API Routes

### Complete API Reference

#### Authentication Routes
```
POST   /api/auth/register      - { email, phone, password, name, adminKey? }
POST   /api/auth/signup        - { email, phone, password, name }
POST   /api/auth/login         - { email, password }
POST   /api/auth/verify        - Headers: Authorization: Bearer <token>
GET    /api/auth/user/:id      - Get user by ID
```

#### Products Routes
```
GET    /api/products                    - Get all products
GET    /api/products/:id                - Get specific product
GET    /api/products/search/:query      - Search products
POST   /api/products                    - Create (admin) { name, price, image, description, category }
PUT    /api/products/:id                - Update (admin) { updated fields }
DELETE /api/products/:id                - Delete (admin)
```

#### Orders Routes
```
POST   /api/orders                      - Create { items, total, address, paymentMethod }
GET    /api/orders                      - Get all (admin)
GET    /api/orders/user/:userId         - Get user's orders
GET    /api/orders/:id                  - Get order details
PATCH  /api/orders/:id/status           - Update (admin) { status }
POST   /api/orders/:id/cancel           - Cancel order
```

#### Cart Routes
```
GET    /api/cart                        - Get user's cart
POST   /api/cart/add                    - Add { productId, quantity, price, name }
PUT    /api/cart/update/:productId      - Update { quantity }
DELETE /api/cart/remove/:productId      - Remove item
DELETE /api/cart/clear                  - Clear cart
```

#### Admin Routes
```
GET    /api/admin/stats                 - Dashboard stats
GET    /api/admin/users                 - List users
GET    /api/admin/auth-logs             - All auth logs
GET    /api/admin/auth-logs/:email      - User auth logs
```

---

## Database Schema

### MongoDB Collections

#### Users Collection (Auth Service)
```javascript
{
  _id: ObjectId,
  email: String (unique),
  phone: String (unique),
  password: String (hashed),
  name: String,
  isAdmin: Boolean,
  created_at: Date,
  updated_at: Date
}
```

#### Products Collection (Products Service)
```javascript
{
  _id: ObjectId,
  name: String,
  price: Number,
  image: String,
  description: String,
  category: String,
  created_at: Date,
  updated_at: Date
}
```

#### Orders Collection (Orders Service)
```javascript
{
  _id: ObjectId,
  userId: String,
  userEmail: String,
  items: [
    {
      productId: String,
      name: String,
      quantity: Number,
      price: Number
    }
  ],
  total: Number,
  address: String,
  paymentMethod: String,
  status: String, // pending, confirmed, shipped, delivered, cancelled
  created_at: Date,
  updated_at: Date
}
```

#### Auth Logs Collection (Auth Service)
```javascript
{
  _id: ObjectId,
  email: String,
  action: String, // signup, login, logout
  status: String, // success, failed
  details: Object,
  ipAddress: String,
  timestamp: Date
}
```

---

## Deployment

### Local Development
```bash
npm run start:microservices
```

### Docker Deployment
```bash
# Build images
docker-compose -f docker-compose.microservices.yml build

# Start services
docker-compose -f docker-compose.microservices.yml up -d

# View status
docker-compose -f docker-compose.microservices.yml ps

# View logs
docker-compose -f docker-compose.microservices.yml logs -f

# Stop services
docker-compose -f docker-compose.microservices.yml down
```

### Environment Variables Required
```env
JWT_SECRET=your-jwt-secret
MONGODB_URI=mongodb://user:pass@host:port/database
ADMIN_DEFAULT_EMAIL=admin@example.com
ADMIN_DEFAULT_PHONE=1234567890
ADMIN_CREATION_KEY=admin-secret-key
```

---

## Troubleshooting

### Services won't start
1. Check if ports are available: `netstat -an | grep 3000`
2. Kill existing processes: `taskkill /F /IM node.exe` (Windows)
3. Check Node.js installation: `node --version`

### Can't connect to MongoDB
1. Verify MongoDB is running
2. Check connection string in `.env`
3. For fallback mode, services will use JSON files

### CORS errors
- API Gateway has CORS enabled for all origins
- Check browser console for specific errors

### Service communication errors
- Verify all services are running: `curl http://localhost:3000/api/health`
- Check service URLs in environment variables
- Review logs in respective service terminals

### Port already in use
```bash
# Find process using port
lsof -i :3000  # Mac/Linux
netstat -ano | findstr :3000  # Windows

# Kill process
kill -9 <PID>  # Mac/Linux
taskkill /PID <PID> /F  # Windows
```

---

## Next Steps

1. ✅ **Architecture designed** - Services organized by domain
2. ✅ **Services created** - All microservices implemented
3. ✅ **API Gateway** - Request routing configured
4. 📝 **Testing** - Add integration tests
5. 🐳 **Containerization** - Docker setup complete
6. 📊 **Monitoring** - Add logging and metrics
7. 🚀 **Deployment** - Deploy to cloud (AWS, Azure, GCP)
8. ⚖️ **Load Balancing** - Add horizontal scaling
9. 💾 **Caching** - Add Redis for performance
10. 📬 **Message Queue** - Add async processing

---

## Technology Stack

| Component | Technology |
|-----------|------------|
| Framework | Node.js + Express.js |
| Database | MongoDB |
| Authentication | JWT (JSON Web Tokens) |
| Password Hashing | bcryptjs |
| API Communication | HTTP + axios |
| Containerization | Docker & Docker Compose |
| Configuration | dotenv |

---

## Performance Considerations

### Caching Strategy
- Cache frequently accessed products in Redis
- Store user sessions in Redis
- Implement ETag for HTTP caching

### Database Optimization
- Add indexes on frequently queried fields (email, userId, status)
- Use connection pooling for MongoDB
- Implement read replicas for scaling

### Scalability
- Load balance requests with nginx
- Scale services independently with multiple instances
- Use message queues (RabbitMQ/Kafka) for async operations

### Security
- Implement rate limiting per service
- Add API key authentication for service-to-service communication
- Encrypt sensitive data at rest
- Use HTTPS in production

---

## Support & Documentation

- **Setup Guide**: See [MICROSERVICES_SETUP.md](./MICROSERVICES_SETUP.md)
- **Architecture Decisions**: See [ARCHITECTURE.md](./ARCHITECTURE.md) (created during implementation)
- **Logs Location**: `./logs/` directory
- **Configuration**: `.env` file

---

**Last Updated**: 2024
**Version**: 1.0.0
