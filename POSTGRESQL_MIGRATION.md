# PostgreSQL Migration Guide

**Date**: August 4, 2026  
**Status**: ✅ Complete

## Overview

Your microservices architecture has been successfully migrated from MongoDB to **AWS RDS PostgreSQL**. This guide explains the changes, configuration, and deployment steps.

---

## 📋 What Changed

### Database System
- **Before**: MongoDB (NoSQL document database)
- **After**: PostgreSQL (Relational RDBMS)

### Benefits of PostgreSQL
✅ ACID compliance (stronger data integrity)  
✅ Complex queries with powerful SQL  
✅ Better performance for relational data  
✅ AWS RDS managed service (automatic backups, scaling)  
✅ Lower cost for managed infrastructure  

### Files Updated
- `.env` - PostgreSQL connection configuration
- `services/auth-service/db.js` - PostgreSQL adapter
- `services/products-service/db.js` - PostgreSQL adapter
- `services/orders-service/db.js` - PostgreSQL adapter
- `services/cart-service/db.js` - PostgreSQL adapter
- All `package.json` files - Replaced `mongodb` with `pg` driver

### New Files
- `scripts/init-postgres-db.js` - Database initialization script

---

## 🚀 Quick Start (AWS RDS)

### Step 1: Create AWS RDS PostgreSQL Instance

1. Go to [AWS RDS Console](https://console.aws.amazon.com/rds/)
2. Click "Create database"
3. Select **PostgreSQL** engine
4. Choose **Free tier** or appropriate tier
5. Configure:
   - **DB Instance Identifier**: `plants-db`
   - **Master username**: `postgres`
   - **Master password**: Create a strong password
   - **DB name**: `plants_db`
6. Configure connectivity:
   - **Public accessibility**: Yes (for development)
   - **VPC**: Default VPC
7. Create database
8. Wait for "Available" status (5-10 minutes)
9. Note the **Endpoint** (e.g., `plants-db.xxxx.rds.amazonaws.com`)

### Step 2: Update Environment Configuration

```bash
# Copy template
cp .env.microservices.example .env

# Edit .env with your AWS RDS details
DB_HOST=plants-db.xxxx.rds.amazonaws.com
DB_PORT=5432
DB_NAME=plants_db
DB_USER=postgres
DB_PASSWORD=your_password_here
DB_SSL=true

JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRY=30d

ADMIN_EMAIL=admin@plantsnursery.com
ADMIN_PASSWORD=Admin@123
```

### Step 3: Initialize PostgreSQL Database

```bash
# Install node dependencies
npm run setup:microservices

# Initialize the database
node scripts/init-postgres-db.js
```

This will:
- Create the `plants_db` database
- Create all 5 tables (users, auth_logs, products, orders, carts)
- Create indexes for performance
- Insert sample plant products

### Step 4: Start Microservices

```bash
npm run start:microservices
```

All services will connect to PostgreSQL and create tables automatically on startup.

---

## 🗄️ Database Schema

### users table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### auth_logs table
```sql
CREATE TABLE auth_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(50),
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### products table
```sql
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  image VARCHAR(500),
  description TEXT,
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### orders table
```sql
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  items JSONB NOT NULL,  -- Stores order items as JSON
  total DECIMAL(10, 2) NOT NULL,
  address TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### carts table
```sql
CREATE TABLE carts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL,
  items JSONB DEFAULT '[]',  -- Stores cart items as JSON
  total DECIMAL(10, 2) DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔧 Fallback to JSON Files

If PostgreSQL connection fails, services automatically fall back to JSON files:
- `local-db-auth.json` - Auth Service fallback
- `plants-database.json` - Products Service fallback
- `local-db.json` - Orders Service fallback
- `local-db-carts.json` - Cart Service fallback

This ensures your services stay running even if the database is temporarily unavailable.

---

## 📝 Configuration Options

### .env Variables

```env
# Database Connection
DB_HOST=localhost                    # RDS endpoint or localhost
DB_PORT=5432                         # PostgreSQL default port
DB_NAME=plants_db                    # Database name
DB_USER=postgres                     # Database user
DB_PASSWORD=your_password            # Database password
DB_SSL=true                          # SSL for AWS RDS

# JWT Configuration
JWT_SECRET=your_secret_key           # Secret key for JWT tokens
JWT_EXPIRY=30d                       # Token expiration time

# Admin Account (auto-created)
ADMIN_EMAIL=admin@plantsnursery.com
ADMIN_PASSWORD=Admin@123
```

---

## 🔍 Verify PostgreSQL Connection

### From Command Line

```bash
# Connect to RDS database
psql -h your-endpoint.rds.amazonaws.com -U postgres -d plants_db

# List tables
\dt

# Query users
SELECT * FROM users;

# Query products
SELECT * FROM products;
```

### From Node.js

```javascript
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: true
});

pool.query('SELECT * FROM users', (err, res) => {
  console.log(res.rows);
  pool.end();
});
```

---

## 🛠️ Common Tasks

### Add a New Product via psql

```sql
INSERT INTO products (name, price, image, description, category)
VALUES ('Fiddle Leaf Fig', 65.99, '/images/fiddle.jpg', 'Large statement plant', 'Indoor Plants');
```

### Get User Orders

```sql
SELECT * FROM orders WHERE user_id = 1 ORDER BY created_at DESC;
```

### Update Product Price

```sql
UPDATE products SET price = 49.99 WHERE name = 'Monstera Deliciosa';
```

### Delete Old Orders

```sql
DELETE FROM orders WHERE status = 'cancelled' AND created_at < NOW() - INTERVAL '90 days';
```

---

## 🚨 Troubleshooting

### Connection Refused
**Problem**: `ECONNREFUSED` or `connect ECONNREFUSED`  
**Solution**:
1. Verify RDS instance status is "Available"
2. Check security group allows port 5432
3. Verify .env DB_HOST is correct
4. Test with `psql` command line tool

### SSL Certificate Error
**Problem**: `SSL request failed`  
**Solution**: Set `DB_SSL=true` in .env or modify connection:
```javascript
ssl: { rejectUnauthorized: false }
```

### Table Already Exists
**Problem**: `Error: relation "users" already exists`  
**Solution**: Normal during startup. Services check for existing tables.

### Permission Denied
**Problem**: `permission denied for schema public`  
**Solution**: Ensure database user has CREATE privileges:
```sql
GRANT ALL PRIVILEGES ON DATABASE plants_db TO postgres;
```

---

## 🔐 Security Best Practices

1. **Never commit `.env` to Git** - Add to `.gitignore`
2. **Use strong passwords** - Min 12 characters with mix of types
3. **Enable VPC Security Groups** - Restrict inbound to your IP only
4. **Enable RDS backups** - AWS RDS has automated backup
5. **Use SSL/TLS** - DB_SSL=true for production
6. **Rotate credentials periodically** - Update password every 90 days

---

## 📊 Performance Optimization

### Indexes
All tables have indexes on commonly queried fields:
- `users.email` - For login queries
- `products.name` & `category` - For search
- `orders.user_id` & `status` - For filtering
- `carts.user_id` - For cart lookups

### Connection Pooling
PostgreSQL uses connection pooling to reuse connections:
```javascript
const pool = new Pool({
  max: 10,              // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### Query Optimization
Services use parameterized queries to prevent SQL injection and improve performance.

---

## 🚀 Scaling Considerations

### For High Traffic
1. Use **Read Replicas** in AWS RDS for read-heavy workloads
2. Increase **RDS instance size** (CPU/RAM)
3. Add **connection pooling** layer (pgBouncer)
4. Implement **caching** (Redis for frequently accessed data)

### For Large Data
1. Archive old orders: `DELETE FROM orders WHERE created_at < '2024-01-01'`
2. Partition tables by time or user
3. Use JSONB indexing for `items` columns

---

## 📚 Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [AWS RDS PostgreSQL Guide](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html)
- [Node.js pg Driver](https://node-postgres.com/)
- [PostgreSQL vs MongoDB Comparison](https://www.postgresql.org/about/news/)

---

## ✅ Migration Checklist

- [ ] AWS RDS PostgreSQL instance created
- [ ] .env file configured with RDS credentials
- [ ] DB_SSL set to true
- [ ] `npm run setup:microservices` completed
- [ ] `node scripts/init-postgres-db.js` executed successfully
- [ ] All services started without errors
- [ ] Products visible in products service
- [ ] Admin account created
- [ ] Test registration/login flow
- [ ] Test add to cart functionality
- [ ] Test order creation
- [ ] Backups configured in AWS RDS

---

## 🎉 You're Done!

Your microservices are now running on AWS RDS PostgreSQL. All services will:
- Automatically create tables on first run
- Fall back to JSON files if database is unavailable
- Use parameterized queries for security
- Implement connection pooling for performance

**Next Steps**:
1. Test all microservices endpoints
2. Configure AWS RDS automated backups
3. Set up CloudWatch monitoring for RDS
4. Deploy to production environment
