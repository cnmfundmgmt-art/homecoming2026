const fs = require('fs');
const h = fs.readFileSync('public/js/app.js', 'utf8');
const idx = h.indexOf('initCountdown');
if (idx > 0) console.log('initCountdown:', h.substring(idx, idx + 200));
const tIdx = h.indexOf('TARGET_DATE');
if (tIdx > 0) console.log('TARGET_DATE:', h.substring(tIdx, tIdx + 80));
