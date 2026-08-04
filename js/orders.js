// Sri Lavanya Nursery - Order Management System
// Handles saving, retrieving, and managing orders using localStorage

const ORDERS_STORAGE_KEY = 'nurseryOrders';
const ADMIN_PASSWORD = 'Satya@12345'; // Default admin password

function getStoredAdminPassword() {
    return localStorage.getItem('adminPassword') || ADMIN_PASSWORD;
}

// Generate unique order ID
function generateOrderId() {
    return 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

// Get all orders
function getAllOrders() {
    const ordersJson = localStorage.getItem(ORDERS_STORAGE_KEY);
    return ordersJson ? JSON.parse(ordersJson) : [];
}

// Get single order by ID
function getOrderById(orderId) {
    const orders = getAllOrders();
    return orders.find(o => o.id === orderId);
}

// Create new order
function createOrder(items, method = 'whatsapp', phone = '', email = '', notes = '') {
    const order = {
        id: generateOrderId(),
        items: items,
        method: method, // 'whatsapp', 'stripe', 'direct'
        phone: phone,
        email: email,
        customer_id: '', // Will be set if customer is logged in
        status: 'pending', // pending, confirmed, shipped, delivered, cancelled
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        notes: notes || '',
        total_amount: calculateOrderTotal(items)
    };
    
    const orders = getAllOrders();
    orders.push(order);
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
    
    return order;
}

// Update order status
function updateOrderStatus(orderId, newStatus) {
    const orders = getAllOrders();
    const order = orders.find(o => o.id === orderId);
    
    if (order) {
        order.status = newStatus;
        order.updated_at = new Date().toISOString();
        localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
        return order;
    }
    return null;
}

// Update order notes
function updateOrderNotes(orderId, notes) {
    const orders = getAllOrders();
    const order = orders.find(o => o.id === orderId);
    
    if (order) {
        order.notes = notes;
        order.updated_at = new Date().toISOString();
        localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
        return order;
    }
    return null;
}

// Calculate order total
function calculateOrderTotal(items) {
    let total = 0;
    items.forEach(item => {
        const itemPrice = item.price || item.unit_price_cents || 0;
        const quantity = item.quantity || 1;
        total += itemPrice * quantity;
    });
    return total;
}

// Delete order
function deleteOrder(orderId) {
    let orders = getAllOrders();
    orders = orders.filter(o => o.id !== orderId);
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
    return true;
}

// Associate a local order with server identifiers
function setOrderServerInfo(orderId, serverId, serverNumber) {
    const orders = getAllOrders();
    const order = orders.find(o => o.id === orderId);
    if (!order) return null;
    if (serverId) order.serverOrderId = serverId;
    if (serverNumber) order.serverOrderNumber = serverNumber;
    order.updated_at = new Date().toISOString();
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
    return order;
}

// Get orders by status
function getOrdersByStatus(status) {
    const orders = getAllOrders();
    return orders.filter(o => o.status === status);
}

// Get recent orders
function getRecentOrders(limit = 10) {
    const orders = (typeof window !== 'undefined' && window.allOrders !== undefined) ? window.allOrders : getAllOrders();
    return orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, limit);
}

// Get orders statistics
function getOrdersStatistics() {
    const orders = (typeof window !== 'undefined' && window.allOrders !== undefined) ? window.allOrders : getAllOrders();
    const revenueTotal = orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
    const completed = orders.filter(o => ['confirmed', 'shipped', 'delivered'].includes(o.status)).length;
    return {
        total_orders: orders.length,
        pending: orders.filter(o => o.status === 'pending').length,
        confirmed: orders.filter(o => o.status === 'confirmed').length,
        shipped: orders.filter(o => o.status === 'shipped').length,
        delivered: orders.filter(o => o.status === 'delivered').length,
        cancelled: orders.filter(o => o.status === 'cancelled').length,
        revenue_total: revenueTotal,
        avg_order_value: orders.length ? revenueTotal / orders.length : 0,
        fulfillment_rate: orders.length ? Math.round((completed / orders.length) * 100) : 0
    };
}

// Export order data to JSON
function exportOrdersToJson() {
    const orders = getAllOrders();
    const dataStr = JSON.stringify(orders, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Orders_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
}

// Verify admin password
function verifyAdminPassword(password) {
    return password === getStoredAdminPassword();
}

// Attempt to cancel an order. Tries server cancel if backend + server id available,
// otherwise falls back to local cancellation (updates localStorage status).
async function cancelOrder(orderId) {
    const order = getOrderById(orderId);
    if (!order) return { success: false, error: 'Order not found' };

    // If a backend is available and the order has a server id, try server cancel
    const serverId = order.serverOrderId || order.server_order_id || order.order_id || null;
    if (window.hasBackend && serverId) {
        const token = localStorage.getItem('authToken');
        if (token) {
            try {
                // First, try customer cancel endpoint which requires customer token
                const resCust = await fetch((window.API_BASE || '') + '/api/orders/' + serverId + '/cancel', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }
                });
                if (resCust.ok) {
                    updateOrderStatus(orderId, 'cancelled');
                    return { success: true, server: true, path: 'customer' };
                }

                // If customer cancel not allowed (403) or failed, try admin path as fallback
                if (resCust.status === 403) {
                    // try admin endpoint (may require admin token)
                    const resAdmin = await fetch((window.API_BASE || '') + '/api/admin/orders/' + serverId + '/status', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                        body: JSON.stringify({ status: 'cancelled' })
                    });
                    if (resAdmin.ok) {
                        updateOrderStatus(orderId, 'cancelled');
                        return { success: true, server: true, path: 'admin' };
                    }
                    const j = await resAdmin.json().catch(() => ({}));
                    return { success: false, error: j.error || ('http:' + resAdmin.status) };
                }

                const j = await resCust.json().catch(() => ({}));
                return { success: false, error: j.error || ('http:' + resCust.status) };
            } catch (e) {
                return { success: false, error: e.message };
            }
        }
    }

    // Fallback: mark as cancelled locally
    const updated = updateOrderStatus(orderId, 'cancelled');
    if (updated) return { success: true, server: false };
    return { success: false, error: 'Could not update order' };
}
