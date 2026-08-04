/**
 * PostgreSQL Database Initialization Script
 * 
 * This script initializes the PostgreSQL database for the microservices architecture.
 * It creates the database and all required tables with proper schema.
 * 
 * Usage:
 *   node scripts/init-postgres-db.js
 * 
 * Before running:
 *   1. Create AWS RDS PostgreSQL instance
 *   2. Update .env file with DB_HOST, DB_USER, DB_PASSWORD, etc.
 *   3. Make sure the postgres user/role exists and has CREATE DATABASE privileges
 */

require('dotenv').config();
const { Pool, Client } = require('pg');

// PostgreSQL admin connection (to create database)
const adminClient = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

// PostgreSQL connection pool (for main database)
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'plants_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function initializeDatabase() {
  console.log('🚀 PostgreSQL Database Initialization Script');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  try {
    // Step 1: Create database
    console.log('📝 Step 1: Creating database...');
    try {
      await adminClient.connect();
      
      // Check if database exists
      const result = await adminClient.query(
        `SELECT datname FROM pg_database WHERE datname = $1`,
        [process.env.DB_NAME || 'plants_db']
      );

      if (result.rows.length === 0) {
        await adminClient.query(`CREATE DATABASE "${process.env.DB_NAME || 'plants_db'}"`);
        console.log(`✅ Database "${process.env.DB_NAME || 'plants_db'}" created`);
      } else {
        console.log(`✅ Database "${process.env.DB_NAME || 'plants_db'}" already exists`);
      }
    } catch (err) {
      if (!err.message.includes('already exists')) {
        throw err;
      }
      console.log(`✅ Database already exists`);
    } finally {
      await adminClient.end();
    }

    // Step 2: Create tables
    console.log('');
    console.log('📝 Step 2: Creating tables...');
    
    // Users table
    console.log('   → Creating users table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20),
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        is_admin BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('      ✅ users table created');

    // Auth logs table
    console.log('   → Creating auth_logs table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS auth_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        action VARCHAR(50),
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('      ✅ auth_logs table created');

    // Products table
    console.log('   → Creating products table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        image VARCHAR(500),
        description TEXT,
        category VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('      ✅ products table created');

    // Orders table
    console.log('   → Creating orders table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        items JSONB NOT NULL,
        total DECIMAL(10, 2) NOT NULL,
        address TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('      ✅ orders table created');

    // Carts table
    console.log('   → Creating carts table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS carts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL,
        items JSONB DEFAULT '[]',
        total DECIMAL(10, 2) DEFAULT 0,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('      ✅ carts table created');

    // Step 3: Create indexes
    console.log('');
    console.log('📝 Step 3: Creating indexes...');
    
    const indexes = [
      { name: 'idx_users_email', query: 'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)' },
      { name: 'idx_auth_logs_user_id', query: 'CREATE INDEX IF NOT EXISTS idx_auth_logs_user_id ON auth_logs(user_id)' },
      { name: 'idx_products_name', query: 'CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)' },
      { name: 'idx_products_category', query: 'CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)' },
      { name: 'idx_orders_user_id', query: 'CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)' },
      { name: 'idx_orders_status', query: 'CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)' },
      { name: 'idx_carts_user_id', query: 'CREATE INDEX IF NOT EXISTS idx_carts_user_id ON carts(user_id)' }
    ];

    for (const index of indexes) {
      await pool.query(index.query);
      console.log(`   ✅ ${index.name}`);
    }

    // Step 4: Insert sample data (optional)
    console.log('');
    console.log('📝 Step 4: Inserting sample data...');
    
    // Check if products already exist
    const productCheck = await pool.query('SELECT COUNT(*) FROM products');
    if (productCheck.rows[0].count === '0') {
      const sampleProducts = [
        {
          name: 'Monstera Deliciosa',
          price: 45.99,
          image: '/images/monstera.jpg',
          description: 'Large leafed tropical plant',
          category: 'Indoor Plants'
        },
        {
          name: 'Snake Plant',
          price: 25.99,
          image: '/images/snake-plant.jpg',
          description: 'Low maintenance succulent',
          category: 'Succulents'
        },
        {
          name: 'Pothos',
          price: 15.99,
          image: '/images/pothos.jpg',
          description: 'Climbing vine plant',
          category: 'Vining Plants'
        }
      ];

      for (const product of sampleProducts) {
        await pool.query(
          `INSERT INTO products (name, price, image, description, category) 
           VALUES ($1, $2, $3, $4, $5)`,
          [product.name, product.price, product.image, product.description, product.category]
        );
      }
      console.log(`   ✅ ${sampleProducts.length} sample products inserted`);
    } else {
      console.log('   ℹ️ Products already exist, skipping sample data');
    }

    // Success message
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ PostgreSQL Database Initialization Complete!');
    console.log('');
    console.log('Database Configuration:');
    console.log(`   Host: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`   Port: ${process.env.DB_PORT || 5432}`);
    console.log(`   Database: ${process.env.DB_NAME || 'plants_db'}`);
    console.log(`   User: ${process.env.DB_USER || 'postgres'}`);
    console.log('');
    console.log('Tables created:');
    console.log('   • users');
    console.log('   • auth_logs');
    console.log('   • products');
    console.log('   • orders');
    console.log('   • carts');
    console.log('');
    console.log('Next steps:');
    console.log('   1. npm run setup:microservices');
    console.log('   2. npm run start:microservices');
    console.log('');

  } catch (err) {
    console.error('❌ Error during database initialization:');
    console.error(err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the initialization
initializeDatabase();
