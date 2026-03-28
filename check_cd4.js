const fs = require('fs');
const h = fs.readFileSync('public/js/app.js', 'utf8');
const fnIdx = h.indexOf('function initCountdown');
if (fnIdx > 0) {
  console.log(h.substring(fnIdx, fnIdx + 600));
}
