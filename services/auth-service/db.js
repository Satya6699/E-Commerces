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
let fallbackData = { users: [], authLogs: [] };
const LOCAL_DB_PATH = path.join(__dirname, '../../local-db-auth.json');

// Load fallback data if available
try {
  if (fs.existsSync(LOCAL_DB_PATH)) {
    fallbackData = JSON.parse(fs.readFileSync(LOCAL_DB_PATH, 'utf-8'));
  }
} catch (e) {
  console.warn('⚠️ Could not load local auth DB');
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
      console.log('✅ Connected to PostgreSQL for Auth Service');
    }
    return true;
  } catch (err) {
    console.error('❌ PostgreSQL connection failed:', err.message);
    console.log('📝 Using JSON file fallback for Auth Service');
    fallbackClient = true;
    return false;
  }
}

// Initialize tables
async function initializeDatabase() {
  if (fallbackClient) return;
  
  try {
    // Create users table
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

    // Create auth_logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS auth_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        action VARCHAR(50),
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await pool.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_auth_logs_user_id ON auth_logs(user_id)');

    console.log('✅ Auth Service tables initialized');
  } catch (err) {
    console.error('❌ Failed to initialize Auth Service tables:', err.message);
    fallbackClient = true;
  }
}

// User operations
async function createUser(email, phone, password, name, isAdmin = false) {
  if (fallbackClient) {
    const user = {
      id: fallbackData.users.length + 1,
      email,
      phone,
      password,
      name,
      is_admin: isAdmin,
      created_at: new Date().toISOString()
    };
    fallbackData.users.push(user);
    saveLocalDB();
    return user;
  }

  try {
    const result = await pool.query(
      `INSERT INTO users (email, phone, password, name, is_admin) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [email, phone || null, password, name || null, isAdmin || false]
    );
    return result.rows[0];
  } catch (err) {
    console.error('Error creating user:', err.message);
    throw err;
  }
}

async function getUserByEmail(email) {
  if (fallbackClient) {
    return fallbackData.users.find(u => u.email === email) || null;
  }

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  } catch (err) {
    console.error('Error fetching user by email:', err.message);
    throw err;
  }
}

async function getUserByPhone(phone) {
  if (fallbackClient) {
    return fallbackData.users.find(u => u.phone === phone) || null;
  }

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE phone = $1',
      [phone]
    );
    return result.rows[0] || null;
  } catch (err) {
    console.error('Error fetching user by phone:', err.message);
    throw err;
  }
}

async function getUserById(id) {
  if (fallbackClient) {
    return fallbackData.users.find(u => u.id === id) || null;
  }

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  } catch (err) {
    console.error('Error fetching user by id:', err.message);
    throw err;
  }
}

async function logAuthEvent(email, action, status, details = {}, ipAddress = '') {
  if (fallbackClient) {
    fallbackData.authLogs.push({
      id: fallbackData.authLogs.length + 1,
      email,
      action,
      status,
      details,
      ip_address: ipAddress,
      created_at: new Date().toISOString()
    });
    saveLocalDB();
    return;
  }

  try {
    await pool.query(
      `INSERT INTO auth_logs (user_id, action, ip_address) 
       VALUES (NULL, $1, $2)`,
      [action, ipAddress]
    );
  } catch (err) {
    console.error('Error logging auth event:', err.message);
  }
}

async function getAuthLogs() {
  if (fallbackClient) {
    return fallbackData.authLogs;
  }

  try {
    const result = await pool.query('SELECT * FROM auth_logs ORDER BY created_at DESC');
    return result.rows;
  } catch (err) {
    console.error('Error fetching auth logs:', err.message);
    throw err;
  }
}

async function getAuthLogsByEmail(email) {
  if (fallbackClient) {
    return fallbackData.authLogs.filter(log => log.email === email);
  }

  try {
    const result = await pool.query(
      'SELECT al.* FROM auth_logs al JOIN users u ON al.user_id = u.id WHERE u.email = $1 ORDER BY al.created_at DESC',
      [email]
    );
    return result.rows;
  } catch (err) {
    console.error('Error fetching auth logs by email:', err.message);
    throw err;
  }
}

module.exports = {
  connect,
  initializeDatabase,
  createUser,
  getUserByEmail,
  getUserByPhone,
  getUserById,
  logAuthEvent,
  getAuthLogs,
  getAuthLogsByEmail,
  pool
};

// Initialize on module load
initializeDatabase().catch(err => console.error('Init error:', err));
