#!/bin/bash

# Microservices Startup Script

echo "🚀 Starting Plant Nursery Microservices..."

# Check if services directories exist
if [ ! -d "services" ]; then
    echo "❌ services directory not found!"
    exit 1
fi

# Install dependencies for all services if node_modules don't exist
echo "📦 Checking dependencies..."

for service in auth-service products-service orders-service cart-service admin-service api-gateway; do
    if [ ! -d "services/$service/node_modules" ]; then
        echo "📥 Installing dependencies for $service..."
        cd "services/$service"
        npm install --loglevel=error
        cd ../../
    fi
done

echo ""
echo "🔧 Starting services..."
echo "======================================"
echo "Press Ctrl+C to stop all services"
echo "======================================"
echo ""

# Function to handle cleanup
cleanup() {
    echo ""
    echo "🛑 Stopping all services..."
    kill $AUTH_PID $PRODUCTS_PID $ORDERS_PID $CART_PID $ADMIN_PID $GATEWAY_PID 2>/dev/null
    exit 0
}

# Set trap for Ctrl+C
trap cleanup INT

# Start all services in background
cd services/auth-service && npm start > ../../logs/auth.log 2>&1 &
AUTH_PID=$!
echo "✅ Auth Service started (PID: $AUTH_PID)"

cd ../products-service && npm start > ../../logs/products.log 2>&1 &
PRODUCTS_PID=$!
echo "✅ Products Service started (PID: $PRODUCTS_PID)"

cd ../orders-service && npm start > ../../logs/orders.log 2>&1 &
ORDERS_PID=$!
echo "✅ Orders Service started (PID: $ORDERS_PID)"

cd ../cart-service && npm start > ../../logs/cart.log 2>&1 &
CART_PID=$!
echo "✅ Cart Service started (PID: $CART_PID)"

cd ../admin-service && npm start > ../../logs/admin.log 2>&1 &
ADMIN_PID=$!
echo "✅ Admin Service started (PID: $ADMIN_PID)"

cd ../api-gateway && npm start > ../../logs/gateway.log 2>&1 &
GATEWAY_PID=$!
echo "✅ API Gateway started (PID: $GATEWAY_PID)"

cd ../..

echo ""
echo "🌐 Services are starting up..."
echo ""
echo "API Gateway: http://localhost:3000"
echo "Auth Service: http://localhost:3001"
echo "Products Service: http://localhost:3002"
echo "Orders Service: http://localhost:3003"
echo "Cart Service: http://localhost:3004"
echo "Admin Service: http://localhost:3005"
echo ""

# Wait for all processes
wait
