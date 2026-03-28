const fs = require('fs');
const h = fs.readFileSync('public/js/app.js', 'utf8');
const updated = h
  .replace('function initMain() {', 'function initMain() { console.log("[DEBUG] initMain called");')
  .replace('initCountdown();', 'console.log("[DEBUG] calling initCountdown"); initCountdown(); console.log("[DEBUG] initCountdown done");');
fs.writeFileSync('public/js/app.js', updated, 'utf8');
console.log('Done');
