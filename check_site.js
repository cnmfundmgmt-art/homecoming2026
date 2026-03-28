const fs = require('fs');
const h = fs.readFileSync('public/index.html', 'utf8');

// Find all section IDs
const idMatches = h.match(/id="([^"]+)"/g);
console.log('Section IDs:', idMatches ? idMatches.join(', ') : 'none');

// Find venue
const vidx = h.indexOf('Venue');
console.log('Venue area:', h.substring(vidx, vidx + 300));
