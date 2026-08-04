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
let fallbackData = { products: [] };
const LOCAL_DB_PATH = path.join(__dirname, '../../plants-database.json');

try {
  if (fs.existsSync(LOCAL_DB_PATH)) {
    fallbackData = JSON.parse(fs.readFileSync(LOCAL_DB_PATH, 'utf-8'));
  }
} catch (e) {
  console.warn('⚠️ Could not load plants database');
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
      console.log('✅ Connected to PostgreSQL for Products Service');
    }
    return true;
  } catch (err) {
    console.error('❌ PostgreSQL connection failed:', err.message);
    console.log('📝 Using JSON file fallback for Products Service');
    fallbackClient = true;
    return false;
  }
}

// Initialize tables
async function initializeDatabase() {
  if (fallbackClient) return;
  
  try {
    // Create products table
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

    // Create index
    await pool.query('CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)');

    console.log('✅ Products Service tables initialized');
  } catch (err) {
    console.error('❌ Failed to initialize Products Service tables:', err.message);
    fallbackClient = true;
  }
}

// Product operations
async function getProducts() {
  if (fallbackClient) {
    return fallbackData.products;
  }

  try {
    const result = await pool.query('SELECT * FROM products ORDER BY created_at DESC');
    return result.rows;
  } catch (err) {
    console.error('Error fetching products:', err.message);
    throw err;
  }
}

async function getProductById(id) {
  if (fallbackClient) {
    return fallbackData.products.find(p => p.id == id) || null;
  }

  try {
    const result = await pool.query(
      'SELECT * FROM products WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  } catch (err) {
    console.error('Error fetching product by id:', err.message);
    throw err;
  }
}

async function searchProducts(query) {
  if (fallbackClient) {
    const lowerQuery = query.toLowerCase();
    return fallbackData.products.filter(p => 
      p.name.toLowerCase().includes(lowerQuery) || 
      (p.description && p.description.toLowerCase().includes(lowerQuery))
    );
  }

  try {
    const searchTerm = `%${query}%`;
    const result = await pool.query(
      'SELECT * FROM products WHERE name ILIKE $1 OR description ILIKE $1 ORDER BY created_at DESC',
      [searchTerm]
    );
    return result.rows;
  } catch (err) {
    console.error('Error searching products:', err.message);
    throw err;
  }
}

async function createProduct(productData) {
  if (fallbackClient) {
    const product = {
      id: fallbackData.products.length > 0 ? Math.max(...fallbackData.products.map(p => p.id)) + 1 : 1,
      ...productData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    fallbackData.products.push(product);
    saveLocalDB();
    return product;
  }

  try {
    const result = await pool.query(
      `INSERT INTO products (name, price, image, description, category) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [productData.name, productData.price, productData.image || null, productData.description || null, productData.category || null]
    );
    return result.rows[0];
  } catch (err) {
    console.error('Error creating product:', err.message);
    throw err;
  }
}

async function updateProduct(id, updates) {
  if (fallbackClient) {
    const product = fallbackData.products.find(p => p.id == id);
    if (product) {
      Object.assign(product, updates, { updated_at: new Date().toISOString() });
      saveLocalDB();
      return product;
    }
    return null;
  }

  try {
    const setClauses = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (snakeKey !== 'updated_at') {
        setClauses.push(`${snakeKey} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(
      `UPDATE products SET ${setClauses.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  } catch (err) {
    console.error('Error updating product:', err.message);
    throw err;
  }
}

async function deleteProduct(id) {
  if (fallbackClient) {
    const idx = fallbackData.products.findIndex(p => p.id == id);
    if (idx >= 0) {
      fallbackData.products.splice(idx, 1);
      saveLocalDB();
      return true;
    }
    return false;
  }

  try {
    const result = await pool.query('DELETE FROM products WHERE id = $1', [id]);
    return result.rowCount > 0;
  } catch (err) {
    console.error('Error deleting product:', err.message);
    throw err;
  }
}

module.exports = {
  connect,
  initializeDatabase,
  getProducts,
  getProductById,
  searchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  pool
};

// Initialize on module load
initializeDatabase().catch(err => console.error('Init error:', err));
