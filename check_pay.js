const fs = require('fs');
const h = fs.readFileSync('public/index.html', 'utf8');

// Find payment modal
const pIdx = h.indexOf('paymentModalOverlay');
console.log('paymentModalOverlay at:', pIdx);
if (pIdx > 0) {
  console.log('Payment modal content:', h.substring(pIdx, pIdx + 800));
}
