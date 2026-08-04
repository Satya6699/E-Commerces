const fs = require('fs');
const https = require('https');

const file = 'plants-database.json';
if (!fs.existsSync(file)) {
  console.error(file, 'not found');
  process.exit(1);
}

const raw = fs.readFileSync(file, 'utf8');
let data = JSON.parse(raw);

function fetchDuck(query) {
  const q = encodeURIComponent(query + ' price');
  const url = `https://html.duckduckgo.com/html/?q=${q}`;
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' } }, (res) => {
      let body = '';
      res.on('data', (d) => body += d.toString());
      res.on('end', () => resolve({ body, url }));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.abort(); reject(new Error('timeout')); });
  });
}

function extractNumbers(html) {
  const results = [];
  // Look for Rupee symbol patterns
  const rupeeRe = /[₹₹]\s?([0-9,]{2,}|[0-9]{2,})(?:\.\d+)?/g;
  let m;
  while ((m = rupeeRe.exec(html)) !== null) {
    const n = parseInt(m[1].replace(/,/g, ''), 10);
    if (!isNaN(n)) results.push(n);
  }
  // Rs. patterns
  const rsRe = /Rs\.?\s?([0-9,]{2,})(?:\.\d+)?/g;
  while ((m = rsRe.exec(html)) !== null) {
    const n = parseInt(m[1].replace(/,/g, ''), 10);
    if (!isNaN(n)) results.push(n);
  }
  // Generic numbers (filter later)
  const numRe = /\b([0-9]{2,6})(?:,[0-9]{3})*\b/g;
  while ((m = numRe.exec(html)) !== null) {
    const n = parseInt(m[1].replace(/,/g, ''), 10);
    if (!isNaN(n)) results.push(n);
  }
  // Deduplicate and filter plausible ranges
  const uniq = Array.from(new Set(results)).filter(n => n >= 10 && n <= 1000000);
  return uniq;
}

function median(arr) {
  if (!arr || arr.length === 0) return null;
  const a = arr.slice().sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 === 0 ? Math.round((a[mid - 1] + a[mid]) / 2) : a[mid];
}

function roundTo50(n) {
  if (n == null) return null;
  return Math.max(50, Math.round(n / 50) * 50);
}

async function run() {
  console.log('Starting cross-check for', data.plants.length, 'plants (DuckDuckGo best-effort)');
  // backup
  const bak = file + '.marketcheck.bak';
  fs.writeFileSync(bak, raw, 'utf8');

  for (let i = 0; i < data.plants.length; i++) {
    const plant = data.plants[i];
    const name = plant.name || plant.title || `plant ${i+1}`;
    try {
      const { body, url } = await fetchDuck(name);
      const nums = extractNumbers(body);
      const med = median(nums);
      const rounded = roundTo50(med);
      // only accept market-price suggestions inside 50..1000 to avoid scraping noise
      if (rounded && rounded >= 50 && rounded <= 1000) {
        plant.market_price = rounded;
        plant.market_price_source = url;
        console.log(`${i+1}. ${name} -> found ${nums.length} nums, median ${med}, set ${rounded}`);
      } else {
        console.log(`${i+1}. ${name} -> no plausible prices found or out of range (median ${med})`);
      }
    } catch (err) {
      console.error(`${i+1}. ${name} -> fetch failed:`, err.message);
    }
    // polite delay
    await new Promise(r => setTimeout(r, 900));
  }

  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  console.log('Done — wrote market_price fields where found. Backup at', bak);
}

run().catch(err => { console.error(err); process.exit(1); });
