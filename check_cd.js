const fs = require('fs');
const h = fs.readFileSync('public/index.html', 'utf8');
const ids = ['cdDays', 'cdHours', 'cdMinutes', 'cdSeconds', 'days', 'hours', 'minutes', 'seconds', 'countdown'];
ids.forEach(id => {
  const idx = h.indexOf('id="' + id + '"');
  console.log(id + ':', idx > 0 ? 'EXISTS at ' + idx : 'MISSING');
});
