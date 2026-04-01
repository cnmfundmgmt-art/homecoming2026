with open('C:/Users/000/.openclaw/workspace/homecoming-2026/public/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the inline booking script section: from <!-- Booking Form JS --> to the closing </script>
marker = '<!-- Booking Form JS -->'
marker_idx = content.find(marker)
if marker_idx == -1:
    print('Marker not found!')
    exit(1)

# Find the closing </script> that closes the inline booking script
# It's right after the marker
script_open = content.find('<script>', marker_idx)
# Find the </script> that closes THIS script (not app.js)
script_close = content.find('</script>', script_open)

# The app.js script tag comes after
after_inline = script_close + len('</script>')
app_js_script = content.find('<script src="/js/app.js', after_inline)
app_js_close = content.find('</script>', app_js_script)

print(f'Marker at: {marker_idx}')
print(f'Inline script open at: {script_open}')
print(f'Inline script close at: {script_close}')
print(f'app.js open at: {app_js_script}')
print(f'app.js close at: {app_js_close}')

# Replace everything from marker to end of </script> of app.js with new content
new_content = content[:marker_idx] + '''  <!-- Booking Form JS -->
  <script src="/js/booking.js"></script>
  <script src="/js/app.js"></script>
</body>
</html>'''

with open('C:/Users/000/.openclaw/workspace/homecoming-2026/public/index.html', 'w', encoding='utf-8') as f:
    f.write(new_content)

print('Done!')
