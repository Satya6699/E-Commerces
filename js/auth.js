// Sri Lavanya Nursery - Customer Authentication System

const CUSTOMERS_STORAGE_KEY = 'nurseryCustomers';
const CURRENT_CUSTOMER_KEY = 'currentCustomer';
const AUTH_TOKEN_KEY = 'authToken';
const OTP_STORAGE_KEY = 'nurseryOTP';
const OTP_ATTEMPTS_KEY = 'nurseryOTPAttempts';
const AUTH_HAS_BACKEND = window.hasBackend === true;
var API_BASE = window.API_BASE;
if (!API_BASE || API_BASE === 'null') {
    API_BASE = 'http://localhost:3000';
}
const CLIENT_ID = window.CLIENT_ID || (window.CLIENT_ID = 'client-' + (localStorage.getItem('clientId') || Date.now().toString()));

// ============= BACKEND AUTHENTICATION =============

// Sign up via backend API
async function signupWithBackend(email, phone, password, name) {
    try {
        const res = await fetch(API_BASE + '/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, phone, password, name })
        });

        const data = await res.json();
        if (res.ok && data.success) {
            // Store token and user info
            localStorage.setItem(AUTH_TOKEN_KEY, data.token);
            localStorage.setItem(CURRENT_CUSTOMER_KEY, JSON.stringify(data.user));
                // persist client-side storage to server
                if (window.hasBackend) {
                    try { fetch(API_BASE + '/api/client/storage', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + data.token }, body: JSON.stringify({ key: AUTH_TOKEN_KEY, value: data.token }) }); } catch(e){}
                    try { fetch(API_BASE + '/api/client/storage', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + data.token }, body: JSON.stringify({ key: CURRENT_CUSTOMER_KEY, value: data.user }) }); } catch(e){}
                }
            return { success: true, message: 'Account created successfully!', customer: data.user };
        } else {
            return { success: false, message: data.error || 'Signup failed' };
        }
    } catch (err) {
        console.error('Signup error:', err);
        return { success: false, message: 'Network error: ' + err.message };
    }
}

// Login via backend API
async function loginWithBackend(email, password) {
    try {
        const res = await fetch(API_BASE + '/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        if (res.ok && data.success) {
            // Store token and user info
            localStorage.setItem(AUTH_TOKEN_KEY, data.token);
            localStorage.setItem(CURRENT_CUSTOMER_KEY, JSON.stringify(data.user));
            return { success: true, message: 'Login successful!', customer: data.user };
        } else {
            return { success: false, message: data.error || 'Login failed' };
        }
    } catch (err) {
        console.error('Login error:', err);
        return { success: false, message: 'Network error: ' + err.message };
    }
}

// Get auth token
function getAuthToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
}

// Clear auth token
function clearAuthToken() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
}

// ============= OTP SYSTEM =============

// Generate OTP (6 digits)
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP to phone (simulated - in production use Twilio/AWS SNS)
function sendOTP(phone) {
    const otp = generateOTP();
    const timestamp = Date.now();
    const expiryTime = timestamp + (5 * 60 * 1000); // 5 minutes expiry
    
    const otpData = {
        phone: phone,
        otp: otp,
        created_at: timestamp,
        expires_at: expiryTime,
        attempts: 0,
        verified: false
    };
    
    localStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(otpData));
    
    // In production: Send via Twilio/SNS
    // For demo: Log or show OTP
    console.log(`Demo OTP for ${phone}: ${otp}`);
    
    return { success: true, message: `OTP sent to ${phone}`, otp: otp }; // Remove OTP from production!
}

// Verify OTP
function verifyOTP(phone, enteredOTP) {
    const otpData = JSON.parse(localStorage.getItem(OTP_STORAGE_KEY)) || {};
    
    if (otpData.phone !== phone) {
        return { success: false, message: 'Phone number mismatch' };
    }
    
    if (Date.now() > otpData.expires_at) {
        return { success: false, message: 'OTP expired. Request a new one.' };
    }
    
    if (otpData.attempts >= 3) {
        return { success: false, message: 'Max attempts reached. Request a new OTP.' };
    }
    
    if (otpData.otp !== enteredOTP) {
        otpData.attempts += 1;
        localStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(otpData));
        return { success: false, message: `Incorrect OTP. ${3 - otpData.attempts} attempts remaining.` };
    }
    
    // OTP verified
    otpData.verified = true;
    localStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(otpData));
    return { success: true, message: 'OTP verified successfully!' };
}

// Get customer by phone
function getCustomerByPhone(phone) {
    const customers = getAllCustomers();
    return customers.find(c => c.phone === phone);
}

// Register/Login with OTP
function loginOrRegisterWithOTP(name, phone) {
    let customer = getCustomerByPhone(phone);
    
    if (!customer) {
        // Create new customer
        customer = {
            id: 'CUST-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            name: name,
            email: `user_${phone}@lavanya.local`,
            phone: phone,
            password: '', // No password for OTP login
            otp_login: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        const customers = getAllCustomers();
        customers.push(customer);
        localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(customers));
    }
    
    // Login customer
    localStorage.setItem(CURRENT_CUSTOMER_KEY, JSON.stringify(customer));
    return { success: true, message: 'Login successful!', customer: customer };
}

// ============= CAPTCHA SYSTEM =============

const CAPTCHA_KEY = 'captchaTempData';

// Generate Math CAPTCHA
function generateMathCaptcha() {
    const num1 = Math.floor(Math.random() * 50) + 1;
    const num2 = Math.floor(Math.random() * 50) + 1;
    const operations = ['+', '-', '*'];
    const operation = operations[Math.floor(Math.random() * operations.length)];
    
    let answer;
    if (operation === '+') answer = num1 + num2;
    else if (operation === '-') answer = num1 - num2;
    else answer = num1 * num2;
    
    const captchaData = {
        question: `${num1} ${operation} ${num2} = ?`,
        answer: answer.toString(),
        timestamp: Date.now()
    };
    
    sessionStorage.setItem(CAPTCHA_KEY, JSON.stringify(captchaData));
    return { question: captchaData.question, answer: parseInt(answer) };
}

// Verify CAPTCHA
function verifyCaptcha(userAnswer) {
    const captchaData = JSON.parse(sessionStorage.getItem(CAPTCHA_KEY));
    
    if (!captchaData) {
        return { success: false, message: 'CAPTCHA expired. Please refresh.' };
    }
    
    // 10 minutes expiry
    if (Date.now() - captchaData.timestamp > 10 * 60 * 1000) {
        return { success: false, message: 'CAPTCHA expired. Please refresh.' };
    }
    
    if (userAnswer.toString().trim() === captchaData.answer) {
        sessionStorage.removeItem(CAPTCHA_KEY);
        return { success: true, message: 'CAPTCHA verified!' };
    }
    
    return { success: false, message: 'Incorrect CAPTCHA answer. Try again.' };
}

// ============= ORIGINAL AUTH FUNCTIONS =============

// Register new customer
async function registerCustomer(name, email, phone, password) {
    // Validate inputs
    if (!email || !password || !name || !phone) {
        return { success: false, message: 'All fields are required' };
    }

    // Try backend first if available
    if (AUTH_HAS_BACKEND) {
        return await signupWithBackend(email, phone, password, name);
    }

    // Fallback to localStorage
    const customers = getAllCustomers();
    
    // Check if email already exists
    if (customers.find(c => c.email === email)) {
        return { success: false, message: 'Email already registered' };
    }
    
    // Check if phone already exists
    if (customers.find(c => c.phone === phone)) {
        return { success: false, message: 'Phone number already registered' };
    }
    
    const customer = {
        id: 'CUST-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        name: name,
        email: email,
        phone: phone,
        password: btoa(password), // Basic encoding
        otp_login: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    
    customers.push(customer);
    localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(customers));
    localStorage.setItem(CURRENT_CUSTOMER_KEY, JSON.stringify(customer));
    
    return { success: true, message: 'Registration successful!', customer: customer };
}

// Login customer
async function loginCustomer(email, password) {
    // Try backend first if available
    if (AUTH_HAS_BACKEND) {
        return await loginWithBackend(email, password);
    }

    // Fallback to localStorage
    const customers = getAllCustomers();
    const customer = customers.find(c => c.email === email && c.password === btoa(password));
    
    if (customer) {
        localStorage.setItem(CURRENT_CUSTOMER_KEY, JSON.stringify(customer));
        return { success: true, message: 'Login successful!', customer: customer };
    }
    
    return { success: false, message: 'Invalid email or password' };
}

// Logout customer
function logoutCustomer() {
    localStorage.removeItem(CURRENT_CUSTOMER_KEY);
    clearAuthToken();
}

// Get all customers
function getAllCustomers() {
    const customersJson = localStorage.getItem(CUSTOMERS_STORAGE_KEY);
    return customersJson ? JSON.parse(customersJson) : [];
}

// Get current logged-in customer
function getCurrentCustomer() {
    const customerJson = localStorage.getItem(CURRENT_CUSTOMER_KEY);
    return customerJson ? JSON.parse(customerJson) : null;
}

// Update customer profile
function updateCustomerProfile(customerId, name, phone) {
    const customers = getAllCustomers();
    const customer = customers.find(c => c.id === customerId);
    
    if (customer) {
        customer.name = name;
        customer.phone = phone;
        customer.updated_at = new Date().toISOString();
        localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(customers));
        
        // Update current customer session
        const current = getCurrentCustomer();
        if (current && current.id === customerId) {
            localStorage.setItem(CURRENT_CUSTOMER_KEY, JSON.stringify(customer));
        }
        
        return customer;
    }
    
    return null;
}

// Check if customer is logged in
function isCustomerLoggedIn() {
    return getCurrentCustomer() !== null;
}

// Get customer's orders
function getCustomerOrders(customerId) {
    const allOrders = getAllOrders();
    return allOrders.filter(o => o.customer_id === customerId);
}

// Link order to customer (call this when creating order if customer logged in)
function linkOrderToCustomer(orderId, customerId) {
    const orders = getAllOrders();
    const order = orders.find(o => o.id === orderId);
    
    if (order) {
        order.customer_id = customerId;
        localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
        return order;
    }
    
    return null;
}
