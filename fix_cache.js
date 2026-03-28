const fs = require('fs');
const h = fs.readFileSync('public/index.html', 'utf8');
const updated = h.replace('src="/js/app.js"', 'src="/js/app.js?v=1740558600"');
fs.writeFileSync('public/index.html', updated, 'utf8');
console.log('Done. Updated script tag.');
