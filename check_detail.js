const fs = require('fs');
const h = fs.readFileSync('public/index.html', 'utf8');

// Check countdown
const tIdx = h.indexOf('TARGET_DATE');
const iIdx = h.indexOf('initCountdown');
console.log('TARGET_DATE at:', tIdx, 'initCountdown at:', iIdx);
if (tIdx > 0 && iIdx > 0) {
  console.log('TARGET_DATE context:', h.substring(tIdx-50, tIdx+80));
  console.log('initCountdown call:', h.substring(iIdx, iIdx+50));
}

// Check dress code
const dIdx = h.indexOf('Dress Code');
console.log('Dress Code at:', dIdx);
if (dIdx > 0) {
  console.log('Dress Code context:', h.substring(dIdx-100, dIdx+200));
}

// Check if chkl_bank_qr exists
console.log('Has chkl_bank_qr in index:', h.includes('chkl_bank_qr'));
console.log('Has receiptInput in index:', h.includes('receiptInput'));
