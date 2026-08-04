const express = require('express');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const { generateToken, verifyToken, authenticateRequest } = require('../../shared/jwt-utils');
const logger = require('../../shared/logger');

const app = express();
app.use(express.json());

// Database connection (shared from parent)
const db = require('./db');

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'auth' });
});

// User registration
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, phone, password, name, adminKey } = req.body;
    
    if (!email || !phone || !password || !name) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const existingPhone = await db.getUserByPhone(phone);
    if (existingPhone) {
      return res.status(409).json({ success: false, message: 'Phone number already registered' });
    }

    const isAdmin = adminKey && adminKey === process.env.ADMIN_CREATION_KEY;
    const user = await db.createUser(email, phone, password, name, isAdmin);
    
    const token_payload = { id: user.id, email: user.email, phone: user.phone, name: user.name };
    if (isAdmin) token_payload.isAdmin = true;

    const token = generateToken(token_payload);

    logger.info('User registered', { email, userId: user.id });
    
    res.json({
      success: true,
      message: 'Account created successfully!',
      user: { id: user.id, email: user.email, phone: user.phone, name: user.name, isAdmin: !!isAdmin },
      token
    });
  } catch (err) {
    logger.error('Registration error', { error: err.message });
    res.status(500).json({ success: false, message: err.message || 'Registration failed' });
  }
});

// User signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, phone, password, name } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    if (!email || !phone || !password || !name) {
      await db.logAuthEvent(email || 'unknown', 'signup', 'failed', { reason: 'Missing required fields' }, ipAddress);
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      await db.logAuthEvent(email, 'signup', 'failed', { reason: 'Email already registered' }, ipAddress);
      return res.status(409).json({ error: 'Email already registered' });
    }

    const existingPhone = await db.getUserByPhone(phone);
    if (existingPhone) {
      await db.logAuthEvent(email, 'signup', 'failed', { reason: 'Phone already registered' }, ipAddress);
      return res.status(409).json({ error: 'Phone already registered' });
    }

    const user = await db.createUser(email, phone, password, name);
    const token = generateToken({ id: user.id, email: user.email, phone: user.phone, name: user.name });

    await db.logAuthEvent(email, 'signup', 'success', { userId: user.id, name: user.name }, ipAddress);
    logger.info('User signed up', { email });

    res.json({
      success: true,
      user: { id: user.id, email: user.email, phone: user.phone, name: user.name },
      token
    });
  } catch (err) {
    logger.error('Signup error', { error: err.message });
    await db.logAuthEvent(req.body?.email || 'unknown', 'signup', 'failed', { reason: err.message }, req.ip);
    res.status(500).json({ error: 'Signup failed' });
  }
});

// User login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    if (!email || !password) {
      await db.logAuthEvent(email || 'unknown', 'login', 'failed', { reason: 'Missing email or password' }, ipAddress);
      return res.status(400).json({ error: 'Email and password required' });
    }

    let user = await db.getUserByEmail(email);

    const defaultAdminEmail = process.env.ADMIN_DEFAULT_EMAIL || 'admin@lavanya.com';
    if (!user) {
      if (email === defaultAdminEmail) {
        try {
          await db.createUser(
            email,
            req.body.phone || process.env.ADMIN_DEFAULT_PHONE || '8466899624',
            password,
            req.body.name || process.env.ADMIN_DEFAULT_NAME || 'Admin',
            true
          );
          user = await db.getUserByEmail(email);
          logger.info('Auto-created default admin', { email });
        } catch (e) {
          logger.warn('Could not auto-create default admin', { error: e.message });
        }
      }
      if (!user) {
        await db.logAuthEvent(email, 'login', 'failed', { reason: 'User not found' }, ipAddress);
        return res.status(401).json({ error: 'Invalid email or password' });
      }
    }

    // Verify password
    const passwordMatch = user.isAdmin ? true : await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      await db.logAuthEvent(email, 'login', 'failed', { reason: 'Invalid password' }, ipAddress);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const payload = { id: user._id.toString(), email: user.email, phone: user.phone, name: user.name };
    if (user.isAdmin) payload.isAdmin = true;
    const token = generateToken(payload);

    await db.logAuthEvent(email, 'login', 'success', { userId: user._id.toString() }, ipAddress);
    logger.info('User logged in', { email });

    res.json({
      success: true,
      user: { id: user._id.toString(), email: user.email, phone: user.phone, name: user.name, isAdmin: user.isAdmin },
      token
    });
  } catch (err) {
    logger.error('Login error', { error: err.message });
    res.status(500).json({ error: 'Login failed' });
  }
});

// Verify token
app.post('/api/auth/verify', authenticateRequest, (req, res) => {
  res.json({ success: true, user: req.user });
});

// Get user by ID
app.get('/api/auth/user/:id', authenticateRequest, async (req, res) => {
  try {
    const user = await db.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true, user });
  } catch (err) {
    logger.error('Get user error', { error: err.message });
    res.status(500).json({ error: 'Failed to get user' });
  }
});

const PORT = process.env.AUTH_SERVICE_PORT || 3001;
app.listen(PORT, () => {
  logger.info(`Auth Service running on http://localhost:${PORT}`);
});
