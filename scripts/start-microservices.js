#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

const services = [
  { name: 'Auth Service', path: 'services/auth-service', port: 3001 },
  { name: 'Products Service', path: 'services/products-service', port: 3002 },
  { name: 'Orders Service', path: 'services/orders-service', port: 3003 },
  { name: 'Cart Service', path: 'services/cart-service', port: 3004 },
  { name: 'Admin Service', path: 'services/admin-service', port: 3005 },
  { name: 'API Gateway', path: 'services/api-gateway', port: 3000 }
];

const startedProcesses = [];
let readyServices = 0;

function logServiceStatus(service, message, type = 'info') {
  const symbols = {
    info: 'ℹ️ ',
    success: '✅',
    error: '❌',
    start: '🚀'
  };
  console.log(`${symbols[type]} [${service}] ${message}`);
}

function startService(service) {
  return new Promise((resolve) => {
    const cwd = path.join(process.cwd(), service.path);
    
    // Use npm.cmd on Windows, npm on Unix
    const command = os.platform() === 'win32' ? 'npm.cmd' : 'npm';
    
    const proc = spawn(command, ['start'], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: process.platform !== 'win32',
      shell: true
    });

    startedProcesses.push(proc);

    let output = '';
    let isReady = false;

    proc.stdout.on('data', (data) => {
      output += data.toString();
      console.log(`[${service.name}] ${data.toString().trim()}`);

      if (!isReady && (output.includes('running on') || output.includes('listening'))) {
        isReady = true;
        readyServices++;
        logServiceStatus(service.name, `Ready on port ${service.port}`, 'success');
      }
    });

    proc.stderr.on('data', (data) => {
      console.error(`[${service.name}] ${data.toString().trim()}`);
    });

    proc.on('error', (err) => {
      logServiceStatus(service.name, `Failed to start: ${err.message}`, 'error');
    });

    proc.on('exit', (code) => {
      if (code !== 0) {
        logServiceStatus(service.name, `Exited with code ${code}`, 'error');
      }
    });

    // Give it time to start and resolve
    setTimeout(() => resolve(), 1000);
  });
}

async function startAllServices() {
  console.clear();
  console.log('🚀 Starting Plant Nursery Microservices\n');
  console.log('═'.repeat(50));

  // Start all services in parallel
  const startPromises = services.map(service => {
    logServiceStatus(service.name, `Starting...`, 'start');
    return startService(service);
  });

  await Promise.all(startPromises);

  // Wait for services to be ready
  let attempts = 0;
  while (readyServices < services.length && attempts < 30) {
    await new Promise(r => setTimeout(r, 500));
    attempts++;
  }

  console.log('\n' + '═'.repeat(50));
  console.log('✅ Microservices are running!\n');
  console.log('📍 Service Endpoints:');
  services.forEach(s => {
    console.log(`   ${s.name}: http://localhost:${s.port}`);
  });
  console.log('\n' + '═'.repeat(50));
  console.log('Press Ctrl+C to stop all services\n');

  // Keep process running
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping services...');
    startedProcesses.forEach(proc => {
      if (process.platform === 'win32') {
        require('child_process').exec(`taskkill /pid ${proc.pid} /t /f`);
      } else {
        proc.kill('SIGTERM');
      }
    });
    setTimeout(() => process.exit(0), 1000);
  });
}

startAllServices().catch(err => {
  console.error('❌ Failed to start services:', err);
  process.exit(1);
});
