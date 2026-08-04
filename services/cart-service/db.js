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
let fallbackData = { carts: [] };
const LOCAL_DB_PATH = path.join(__dirname, '../../local-db-carts.json');

try {
  if (fs.existsSync(LOCAL_DB_PATH)) {
    fallbackData = JSON.parse(fs.readFileSync(LOCAL_DB_PATH, 'utf-8'));
  }
} catch (e) {
  console.warn('⚠️ Could not load local carts DB');
}

function saveLocalDB() {
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(fallbackData, null, 2), 'utf-8');
}

function calculateTotal(items) {
  return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

// Initialize database connection
async function connect() {
  try {
    const connection = await pool.connect();
    connection.release();
    if (!fallbackClient) {
      console.log('✅ Connected to PostgreSQL for Cart Service');
    }
    return true;
  } catch (err) {
    console.error('❌ PostgreSQL connection failed:', err.message);
    console.log('📝 Using JSON file fallback for Cart Service');
    fallbackClient = true;
    return false;
  }
}

// Initialize tables
async function initializeDatabase() {
  if (fallbackClient) return;
  
  try {
    // Create carts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS carts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL,
        items JSONB DEFAULT '[]',
        total DECIMAL(10, 2) DEFAULT 0,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index
    await pool.query('CREATE INDEX IF NOT EXISTS idx_carts_user_id ON carts(user_id)');

    console.log('✅ Cart Service tables initialized');
  } catch (err) {
    console.error('❌ Failed to initialize Cart Service tables:', err.message);
    fallbackClient = true;
  }
}

// Cart operations
async function getCart(userId) {
  if (fallbackClient) {
    let cart = fallbackData.carts.find(c => c.user_id === userId);
    if (!cart) {
      cart = { user_id: userId, items: [], total: 0 };
    }
    return cart;
  }

  try {
    const result = await pool.query(
      'SELECT * FROM carts WHERE user_id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      // Create new cart if it doesn't exist
      const newCart = await pool.query(
        'INSERT INTO carts (user_id, items, total) VALUES ($1, $2, $3) RETURNING *',
        [userId, JSON.stringify([]), 0]
      );
      return newCart.rows[0];
    }
    
    return result.rows[0];
  } catch (err) {
    console.error('Error fetching cart:', err.message);
    throw err;
  }
}

async function addToCart(userId, item) {
  if (fallbackClient) {
    let cart = fallbackData.carts.find(c => c.user_id === userId);
    
    if (!cart) {
      cart = { user_id: userId, items: [], total: 0 };
      fallbackData.carts.push(cart);
    }

    const existingItem = cart.items.find(i => i.product_id === item.product_id);
    
    if (existingItem) {
      existingItem.quantity += item.quantity;
    } else {
      cart.items.push(item);
    }

    cart.total = calculateTotal(cart.items);
    saveLocalDB();
    return cart;
  }

  try {
    let cart = await getCart(userId);
    const items = cart.items || [];
    
    const existingItem = items.find(i => i.product_id === item.product_id);
    
    if (existingItem) {
      existingItem.quantity += item.quantity;
    } else {
      items.push(item);
    }

    const total = calculateTotal(items);
    
    const result = await pool.query(
      'UPDATE carts SET items = $1, total = $2, last_updated = CURRENT_TIMESTAMP WHERE user_id = $3 RETURNING *',
      [JSON.stringify(items), total, userId]
    );
    
    return result.rows[0];
  } catch (err) {
    console.error('Error adding to cart:', err.message);
    throw err;
  }
}

async function updateCartItem(userId, productId, quantity) {
  if (fallbackClient) {
    const cart = fallbackData.carts.find(c => c.user_id === userId);
    
    if (!cart) {
      return null;
    }

    const item = cart.items.find(i => i.product_id === productId);
    
    if (item) {
      if (quantity <= 0) {
        cart.items = cart.items.filter(i => i.product_id !== productId);
      } else {
        item.quantity = quantity;
      }
    }

    cart.total = calculateTotal(cart.items);
    saveLocalDB();
    return cart;
  }

  try {
    let cart = await getCart(userId);
    const items = cart.items || [];
    
    const item = items.find(i => i.product_id === productId);
    
    if (item) {
      if (quantity <= 0) {
        // Remove item if quantity is 0 or less
        const filteredItems = items.filter(i => i.product_id !== productId);
        const total = calculateTotal(filteredItems);
        
        const result = await pool.query(
          'UPDATE carts SET items = $1, total = $2, last_updated = CURRENT_TIMESTAMP WHERE user_id = $3 RETURNING *',
          [JSON.stringify(filteredItems), total, userId]
        );
        
        return result.rows[0];
      } else {
        item.quantity = quantity;
        const total = calculateTotal(items);
        
        const result = await pool.query(
          'UPDATE carts SET items = $1, total = $2, last_updated = CURRENT_TIMESTAMP WHERE user_id = $3 RETURNING *',
          [JSON.stringify(items), total, userId]
        );
        
        return result.rows[0];
      }
    }

    return cart;
  } catch (err) {
    console.error('Error updating cart item:', err.message);
    throw err;
  }
}

async function removeFromCart(userId, productId) {
  if (fallbackClient) {
    const cart = fallbackData.carts.find(c => c.user_id === userId);
    
    if (cart) {
      cart.items = cart.items.filter(i => i.product_id !== productId);
      cart.total = calculateTotal(cart.items);
      saveLocalDB();
    }

    return cart;
  }

  try {
    let cart = await getCart(userId);
    const items = (cart.items || []).filter(i => i.product_id !== productId);
    const total = calculateTotal(items);
    
    const result = await pool.query(
      'UPDATE carts SET items = $1, total = $2, last_updated = CURRENT_TIMESTAMP WHERE user_id = $3 RETURNING *',
      [JSON.stringify(items), total, userId]
    );
    
    return result.rows[0];
  } catch (err) {
    console.error('Error removing from cart:', err.message);
    throw err;
  }
}

async function clearCart(userId) {
  if (fallbackClient) {
    const cart = fallbackData.carts.find(c => c.user_id === userId);
    
    if (cart) {
      cart.items = [];
      cart.total = 0;
      saveLocalDB();
    }
    return;
  }

  try {
    await pool.query(
      'UPDATE carts SET items = $1, total = $2, last_updated = CURRENT_TIMESTAMP WHERE user_id = $3',
      [JSON.stringify([]), 0, userId]
    );
  } catch (err) {
    console.error('Error clearing cart:', err.message);
    throw err;
  }
}

module.exports = {
  connect,
  initializeDatabase,
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  pool
};

// Initialize on module load
initializeDatabase().catch(err => console.error('Init error:', err));
