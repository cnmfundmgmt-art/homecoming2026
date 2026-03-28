const fs = require('fs');
const h = fs.readFileSync('public/index.html', 'utf8');
const idx = h.indexOf('id="countdown"');
if (idx < 0) { console.log('not found'); process.exit(1); }
console.log(h.substring(idx, idx + 500));
