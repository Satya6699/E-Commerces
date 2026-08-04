@echo off
REM Windows batch script to start all microservices

echo.
echo 🚀 Starting Plant Nursery Microservices...
echo.

REM Check if services directory exists
if not exist "services" (
    echo ❌ services directory not found!
    exit /b 1
)

REM Create logs directory
if not exist "logs" mkdir logs

echo 📦 Checking dependencies and starting services...
echo ======================================
echo Press Ctrl+C to stop all services
echo ======================================
echo.

REM Start Auth Service
echo Starting Auth Service on port 3001...
start "Auth Service" cmd /k "cd services\auth-service && npm start"
timeout /t 2 /nobreak

REM Start Products Service
echo Starting Products Service on port 3002...
start "Products Service" cmd /k "cd services\products-service && npm start"
timeout /t 2 /nobreak

REM Start Orders Service
echo Starting Orders Service on port 3003...
start "Orders Service" cmd /k "cd services\orders-service && npm start"
timeout /t 2 /nobreak

REM Start Cart Service
echo Starting Cart Service on port 3004...
start "Cart Service" cmd /k "cd services\cart-service && npm start"
timeout /t 2 /nobreak

REM Start Admin Service
echo Starting Admin Service on port 3005...
start "Admin Service" cmd /k "cd services\admin-service && npm start"
timeout /t 2 /nobreak

REM Start API Gateway
echo Starting API Gateway on port 3000...
start "API Gateway" cmd /k "cd services\api-gateway && npm start"

echo.
echo ✅ All services are starting!
echo.
echo 🌐 Access your services at:
echo    API Gateway: http://localhost:3000
echo    Auth Service: http://localhost:3001
echo    Products Service: http://localhost:3002
echo    Orders Service: http://localhost:3003
echo    Cart Service: http://localhost:3004
echo    Admin Service: http://localhost:3005
echo.
echo Press any key to exit...
pause > nul
