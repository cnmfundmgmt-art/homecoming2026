const fs = require('fs');
const h = fs.readFileSync('public/index.html', 'utf8');
const idx = h.indexOf('id="countdown"');
if (idx < 0) { console.log('countdown not found'); process.exit(1); }
console.log('Countdown HTML context:');
console.log(h.substring(idx - 100, idx + 600));
