// test/integration_test.js - Comprehensive endpoint & asset verification
const http = require('http');
const assert = require('assert');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    }).on('error', reject);
  });
}

async function runTests() {
  console.log('--- Running Hangly Windows Integration Tests ---');
  const base = 'http://localhost:3030';

  const endpoints = [
    { url: `${base}/`, expectedStatus: 200, label: 'HTML Homepage' },
    { url: `${base}/style.css`, expectedStatus: 200, label: 'Fluent CSS' },
    { url: `${base}/js/physics.js`, expectedStatus: 200, label: 'Physics Engine JS' },
    { url: `${base}/js/charms.js`, expectedStatus: 200, label: 'Charms Catalog JS' },
    { url: `${base}/js/sound.js`, expectedStatus: 200, label: 'Audio Synthesizer JS' },
    { url: `${base}/js/app.js`, expectedStatus: 200, label: 'App Controller JS' },
    { url: `${base}/api/settings`, expectedStatus: 200, label: 'Settings API' },
    { url: `${base}/api/library`, expectedStatus: 200, label: 'Library API' },
    { url: `${base}/assets/charms/Daruma.svg`, expectedStatus: 200, label: 'Daruma SVG' },
    { url: `${base}/assets/charms/nazar.svg`, expectedStatus: 200, label: 'Nazar SVG' },
    { url: `${base}/assets/charms/Hamsa.svg`, expectedStatus: 200, label: 'Hamsa SVG' },
    { url: `${base}/assets/charms/Ghanta.svg`, expectedStatus: 200, label: 'Ghanta SVG' },
    { url: `${base}/assets/charms/panchangJie.svg`, expectedStatus: 200, label: 'PanchangJie SVG' },
    { url: `${base}/assets/previews/charm-preview-daruma@2x.png`, expectedStatus: 200, label: 'Daruma Preview PNG' },
    { url: `${base}/assets/icons/hangly-icon-256.png`, expectedStatus: 200, label: 'Hangly Icon PNG' }
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetchUrl(ep.url);
      assert.strictEqual(res.status, ep.expectedStatus, `${ep.label} returned ${res.status}`);
      console.log(`✓ [${res.status}] ${ep.label} (${ep.url})`);
    } catch (err) {
      console.error(`✗ FAILED: ${ep.label} - ${err.message}`);
      process.exit(1);
    }
  }

  // Verify Library content contains 16 charms
  const libRes = await fetchUrl(`${base}/api/library`);
  const libData = JSON.parse(libRes.body);
  assert(Array.isArray(libData.charms), 'charms must be an array');
  assert.strictEqual(libData.charms.length, 16, 'Library must have exactly 16 built-in charms');
  console.log(`✓ Charm Library has all ${libData.charms.length} built-in charms!`);

  console.log('--- All Integration Tests Passed Successfully! ---');
}

runTests();
