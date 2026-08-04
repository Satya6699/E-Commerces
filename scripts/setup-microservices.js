#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const services = [
  'auth-service',
  'products-service',
  'orders-service',
  'cart-service',
  'admin-service',
  'api-gateway'
];

const servicesPath = path.join(__dirname, '../services');

console.log('📦 Setting up microservices dependencies...\n');

let failedServices = [];

services.forEach((service) => {
  const servicePath = path.join(servicesPath, service);
  const packageJsonPath = path.join(servicePath, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    console.log(`❌ ${service}: package.json not found`);
    failedServices.push(service);
    return;
  }

  const nodeModulesPath = path.join(servicePath, 'node_modules');

  if (fs.existsSync(nodeModulesPath)) {
    console.log(`✅ ${service}: dependencies already installed`);
    return;
  }

  try {
    console.log(`📥 Installing dependencies for ${service}...`);
    execSync('npm install --loglevel=error', {
      cwd: servicePath,
      stdio: 'inherit'
    });
    console.log(`✅ ${service}: dependencies installed\n`);
  } catch (err) {
    console.error(`❌ ${service}: failed to install dependencies`);
    console.error(err.message);
    failedServices.push(service);
  }
});

console.log('\n' + '='.repeat(50));
if (failedServices.length === 0) {
  console.log('✅ All microservices setup complete!');
  console.log('\nNext steps:');
  console.log('1. Configure .env file with your settings');
  console.log('2. Start services: npm run start:microservices');
  console.log('3. View setup guide: cat MICROSERVICES_SETUP.md');
} else {
  console.log(`❌ Setup failed for: ${failedServices.join(', ')}`);
  process.exit(1);
}
