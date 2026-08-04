require('dotenv').config();
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

// PostgreSQL Connection Pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'plants_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

let fallbackClient = false;
let fallbackData = { orders: [] };
const LOCAL_DB_PATH = path.join(__dirname, '../../local-db.json');

try {
  if (fs.existsSync(LOCAL_DB_PATH)) {
    const data = JSON.parse(fs.readFileSync(LOCAL_DB_PATH, 'utf-8'));
    if (data.orders) fallbackData = data;
  }
} catch (e) {
  console.warn('⚠️ Could not load local orders DB');
}

function saveLocalDB() {
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(fallbackData, null, 2), 'utf-8');
}

// Initialize database connection
async function connect() {
  try {
    const connection = await pool.connect();
    connection.release();
    if (!fallbackClient) {
      console.log('✅ Connected to PostgreSQL for Orders Service');
    }
    return true;
  } catch (err) {
    console.error('❌ PostgreSQL connection failed:', err.message);
    console.log('📝 Using JSON file fallback for Orders Service');
    fallbackClient = true;
    return false;
  }
}

// Initialize tables
async function initializeDatabase() {
  if (fallbackClient) return;
  
  try {
    // Create orders table
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

    // Create indexes
    await pool.query('CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)');

    console.log('✅ Orders Service tables initialized');
  } catch (err) {
    console.error('❌ Failed to initialize Orders Service tables:', err.message);
    fallbackClient = true;
  }
}

// Order operations
async function createOrder(orderData) {
  if (fallbackClient) {
    const order = {
      id: fallbackData.orders.length > 0 ? Math.max(...fallbackData.orders.map(o => o.id)) + 1 : 1,
      user_id: orderData.userId,
      items: orderData.items,
      total: orderData.total,
      address: orderData.address,
      status: orderData.status || 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    fallbackData.orders.push(order);
    saveLocalDB();
    return order;
  }

  try {
    const result = await pool.query(
      `INSERT INTO orders (user_id, items, total, address, status) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [orderData.userId, JSON.stringify(orderData.items), orderData.total, orderData.address, orderData.status || 'pending']
    );
    return result.rows[0];
  } catch (err) {
    console.error('Error creating order:', err.message);
    throw err;
  }
}

async function getOrderById(id) {
  if (fallbackClient) {
    return fallbackData.orders.find(o => o.id == id) || null;
  }

  try {
    const result = await pool.query(
      'SELECT * FROM orders WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  } catch (err) {
    console.error('Error fetching order by id:', err.message);
    throw err;
  }
}

async function getOrdersByUserId(userId) {
  if (fallbackClient) {
    return fallbackData.orders.filter(o => o.user_id == userId);
  }

  try {
    const result = await pool.query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  } catch (err) {
    console.error('Error fetching orders by user id:', err.message);
    throw err;
  }
}

async function getAllOrders() {
  if (fallbackClient) {
    return fallbackData.orders;
  }

  try {
    const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    return result.rows;
  } catch (err) {
    console.error('Error fetching all orders:', err.message);
    throw err;
  }
}

async function updateOrderStatus(id, status) {
  if (fallbackClient) {
    const order = fallbackData.orders.find(o => o.id == id);
    if (order) {
      order.status = status;
      order.updated_at = new Date().toISOString();
      saveLocalDB();
      return order;
    }
    return null;
  }

  try {
    const result = await pool.query(
      'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, id]
    );
    return result.rows[0] || null;
  } catch (err) {
    console.error('Error updating order status:', err.message);
    throw err;
  }
}

module.exports = {
  connect,
  initializeDatabase,
  createOrder,
  getOrderById,
  getOrdersByUserId,
  getAllOrders,
  updateOrderStatus,
  pool
};

// Initialize on module load
initializeDatabase().catch(err => console.error('Init error:', err));
