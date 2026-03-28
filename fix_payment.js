const fs = require('fs');
const h = fs.readFileSync('public/index.html', 'utf8');

// Find payment modal content
const pStart = h.indexOf('id="paymentModalOverlay"');
const pEnd = h.indexOf('</div>\n    </div>\n\n    <script>');
console.log('Payment modal starts at:', pStart, 'ends before script at:', pEnd);
if (pStart > 0 && pEnd > 0) {
  console.log('Modal HTML:');
  console.log(h.substring(pStart, pEnd));
}
