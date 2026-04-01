const fs = require('fs');
const h = fs.readFileSync('public/index.html', 'utf8');
const replaced = h.replace(/href="\/css\/style\.css"/, 'href="/css/style.css?v=20260329"');
fs.writeFileSync('public/index.html', replaced);
console.log('OK', fs.statSync('public/index.html').size);
