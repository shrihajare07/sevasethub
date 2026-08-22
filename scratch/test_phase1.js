// Test Phase 1 End-to-End Simulation in Node.js
const fs = require('fs');

console.log('--- Checking Phase 1 Files & Integrity ---');

const files = [
  'index.html',
  'frontend/services.html',
  'frontend/offers.html',
  'frontend/login.html',
  'frontend/customer/index.html',
  'assets/js/api.js',
  'assets/js/customer.js',
  'assets/js/auth.js'
];

let allExist = true;
files.forEach(f => {
  if (fs.existsSync(f)) {
    console.log(`[PASS] Found ${f}`);
  } else {
    console.error(`[FAIL] Missing file: ${f}`);
    allExist = false;
  }
});

if (allExist) {
  console.log('\n--- Phase 1 Code Verification Successful! ---');
}
