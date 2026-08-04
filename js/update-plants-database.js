const fs = require('fs');
const path = require('path');

const file = path.resolve(process.cwd(), 'plants-database.json');
if (!fs.existsSync(file)) {
  console.error('plants-database.json not found at', file);
  process.exit(1);
}

const raw = fs.readFileSync(file, 'utf8');
let data;
try {
  data = JSON.parse(raw);
} catch (err) {
  console.error('Failed to parse JSON:', err.message);
  process.exit(1);
}

if (!Array.isArray(data.plants)) {
  console.error('Expected top-level `plants` array in plants-database.json');
  process.exit(1);
}

const updated = data.plants.map((p, i) => {
  const existingId = p.id || (i + 1);
  const { price, ...rest } = p;
  // choose a random price in 50-step increments between 100 and 1000 (100,150,200,...,1000)
  const steps = Math.floor((1000 - 100) / 50) + 1; // 19 steps
  const newPrice = 100 + Math.floor(Math.random() * steps) * 50;
  return { id: existingId, ...rest, price: newPrice, stock: p.stock || 1000 };
});

fs.writeFileSync(file, JSON.stringify({ plants: updated }, null, 2), 'utf8');
console.log(`Updated ${updated.length} plants — set random price 100..1000 and ensured stock property`);
