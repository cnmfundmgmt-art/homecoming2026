const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'public', 'index.html');
let html = fs.readFileSync(file, 'utf8');

const countdownScript = `
  <script>
    // ========== COUNTDOWN (standalone) ==========
    (function() {
      var TARGET_DATE = new Date('2026-10-10T10:00:00+08:00');
      console.log('[COUNTDOWN] Target:', TARGET_DATE);

      function pad(n, len) { return String(n).padStart(len, '0'); }

      function update() {
        var now = new Date();
        var diff = TARGET_DATE - now;
        console.log('[COUNTDOWN] diff ms:', diff);

        var d = document.getElementById('days');
        var h = document.getElementById('hours');
        var m = document.getElementById('minutes');
        var s = document.getElementById('seconds');

        if (diff <= 0) {
          if (d) d.textContent = '000';
          if (h) h.textContent = '00';
          if (m) m.textContent = '00';
          if (s) s.textContent = '00';
          return;
        }

        var days = Math.floor(diff / 86400000);
        var hours = Math.floor((diff % 86400000) / 3600000);
        var mins = Math.floor((diff % 3600000) / 60000);
        var secs = Math.floor((diff % 60000) / 1000);

        if (d) d.textContent = pad(days, 3);
        if (h) h.textContent = pad(hours, 2);
        if (m) m.textContent = pad(mins, 2);
        if (s) s.textContent = pad(secs, 2);
      }

      update();
      setInterval(update, 1000);
    })();
  </script>
</body>
</html>`;

// Replace </body></html> (handles both CRLF and LF)
html = html.replace(/\s*<\/body>\s*<\/html>\s*$/, countdownScript);

fs.writeFileSync(file, html, 'utf8');
console.log('Done. File length:', html.length);
