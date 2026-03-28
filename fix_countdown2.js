const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'public', 'index.html');
let html = fs.readFileSync(file, 'utf8');

const countdownScript = `  <script src="/js/app.js?v=1740558600"></script>
  <script>
    // Receipt upload preview
    document.getElementById('receiptInput')?.addEventListener('change', function(e) {
      const file = e.target.files[0];
      const preview = document.getElementById('receiptPreview');
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(ev) {
        preview.innerHTML = '<img src="' + ev.target.result + '" alt="Receipt preview">';
      };
      reader.readAsDataURL(file);
    });

    // ========== HARDcoded COUNTDOWN ==========
    (function() {
      var TARGET_DATE = new Date('2026-10-10T10:00:00+08:00');
      console.log('[COUNTDOWN] Target date:', TARGET_DATE);

      function pad(n, len) { return String(n).padStart(len, '0'); }

      function updateCountdown() {
        var now = new Date();
        var diff = TARGET_DATE - now;
        console.log('[COUNTDOWN] diff (ms):', diff);

        var elDays = document.getElementById('days');
        var elHours = document.getElementById('hours');
        var elMinutes = document.getElementById('minutes');
        var elSeconds = document.getElementById('seconds');

        if (diff <= 0) {
          if (elDays) elDays.textContent = '000';
          if (elHours) elHours.textContent = '00';
          if (elMinutes) elMinutes.textContent = '00';
          if (elSeconds) elSeconds.textContent = '00';
          return;
        }

        var days = Math.floor(diff / 86400000);
        var hours = Math.floor((diff % 86400000) / 3600000);
        var mins = Math.floor((diff % 3600000) / 60000);
        var secs = Math.floor((diff % 60000) / 1000);

        if (elDays) elDays.textContent = pad(days, 3);
        if (elHours) elHours.textContent = pad(hours, 2);
        if (elMinutes) elMinutes.textContent = pad(mins, 2);
        if (elSeconds) elSeconds.textContent = pad(secs, 2);
      }

      updateCountdown();
      setInterval(updateCountdown, 1000);
    })();
  </script>
</body>
</html>`;

const oldEnd = `  <script src="/js/app.js?v=1740558600"></script>
  <script>
    // Receipt upload preview
    document.getElementById('receiptInput')?.addEventListener('change', function(e) {
      const file = e.target.files[0];
      const preview = document.getElementById('receiptPreview');
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(ev) {
        preview.innerHTML = '<img src="' + ev.target.result + '" alt="Receipt preview">';
      };
      reader.readAsDataURL(file);
    });
  </script>
</body>
</html>`;

if (html.includes(oldEnd)) {
  html = html.replace(oldEnd, countdownScript);
  fs.writeFileSync(file, html, 'utf8');
  console.log('SUCCESS: Countdown fixed with inline script');
} else {
  console.log('ERROR: Could not find the expected ending to replace');
  console.log('Last 500 chars of file:');
  console.log(JSON.stringify(html.substring(html.length - 500)));
}
