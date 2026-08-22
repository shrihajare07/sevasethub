// Verification script for Technician Management integration
const fs = require('fs');

console.log('--- Verifying Technician Management Integration ---');

const apiContent = fs.readFileSync('assets/js/api.js', 'utf8');
const adminJsContent = fs.readFileSync('assets/js/admin.js', 'utf8');
const adminHtmlContent = fs.readFileSync('frontend/admin/index.html', 'utf8');

const checks = [
  { name: 'API has createTechnician', pass: apiContent.includes('createTechnician') },
  { name: 'API has updateTechnician', pass: apiContent.includes('updateTechnician') },
  { name: 'API has deleteTechnician', pass: apiContent.includes('deleteTechnician') },
  { name: 'Admin HTML has section-technicians', pass: adminHtmlContent.includes('id="section-technicians"') },
  { name: 'Admin HTML has modalAddTechnician', pass: adminHtmlContent.includes('id="modalAddTechnician"') },
  { name: 'Admin HTML has Technicians sidebar link', pass: adminHtmlContent.includes('data-target="technicians"') },
  { name: 'Admin JS has loadAdminTechnicians', pass: adminJsContent.includes('loadAdminTechnicians') },
  { name: 'Admin JS has form-add-technician handler', pass: adminJsContent.includes('#form-add-technician') }
];

let allPassed = true;
checks.forEach(c => {
  if (c.pass) {
    console.log(`[PASS] ${c.name}`);
  } else {
    console.error(`[FAIL] ${c.name}`);
    allPassed = false;
  }
});

if (allPassed) {
  console.log('\nAll Technician Management checks PASSED successfully!');
}
