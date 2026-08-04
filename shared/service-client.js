// Service-to-service HTTP client
const axios = require('axios');

const SERVICE_URLS = {
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  products: process.env.PRODUCTS_SERVICE_URL || 'http://localhost:3002',
  orders: process.env.ORDERS_SERVICE_URL || 'http://localhost:3003',
  cart: process.env.CART_SERVICE_URL || 'http://localhost:3004',
  admin: process.env.ADMIN_SERVICE_URL || 'http://localhost:3005'
};

async function callService(serviceName, method, path, data = null, headers = {}) {
  try {
    const url = `${SERVICE_URLS[serviceName]}${path}`;
    const config = { headers };
    
    let response;
    if (method === 'GET') {
      response = await axios.get(url, config);
    } else if (method === 'POST') {
      response = await axios.post(url, data, config);
    } else if (method === 'PUT') {
      response = await axios.put(url, data, config);
    } else if (method === 'PATCH') {
      response = await axios.patch(url, data, config);
    } else if (method === 'DELETE') {
      response = await axios.delete(url, config);
    }
    
    return response.data;
  } catch (err) {
    console.error(`Service call failed: ${serviceName} ${method} ${path}`, err.message);
    throw err;
  }
}

module.exports = {
  callService,
  SERVICE_URLS
};
