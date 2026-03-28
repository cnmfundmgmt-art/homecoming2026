const fs = require('fs');
const h = fs.readFileSync('public/index.html', 'utf8');

// Find payment modal - search for its end
const pStart = h.indexOf('id="paymentModalOverlay"');
// Find the next </div> after paymentModalOverlay
let searchFrom = pStart;
let depth = 0;
let pEnd = -1;
for (let i = pStart; i < h.length; i++) {
  if (h[i] === '<' && h.substring(i, i+5) === '<div>') { depth++; i += 4; }
  else if (h[i] === '<' && h.substring(i, i+6) === '</div>') { depth--; i += 5; if (depth === 0) { pEnd = i + 6; break; } }
}
console.log('Payment modal from:', pStart, 'to:', pEnd);
if (pEnd > 0) {
  console.log(h.substring(pStart, pEnd));
} else {
  // Try finding the closing tag differently
  const altEnd = h.indexOf('</div>\n\n  <script>', pStart);
  console.log('Alt end (</div>\\n\\n  <script>):', altEnd);
  if (altEnd > 0) console.log(h.substring(pStart, altEnd + 6));
}
