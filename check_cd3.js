const fs = require('fs');
const h = fs.readFileSync('public/js/app.js', 'utf8');
// Find the countdown function
const fnIdx = h.indexOf('function initCountdown');
if (fnIdx > 0) console.log('initCountdown fn:', h.substring(fnIdx, fnIdx + 400));
// Find what IDs it updates
const docIdx = h.indexOf("document.getElementById('cdDays')");
if (docIdx > 0) console.log('cdDays usage:', h.substring(docIdx, docIdx + 300));
