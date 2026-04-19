const fs = require('fs');
const p = 'C:\\Users\\000\\.openclaw\\workspace\\homecoming-2026\\public\\index.html';
let html = fs.readFileSync(p, 'utf8');

// Fix #7: Make renderCart empty stub - need to find the FULL function body and replace
// Match from "// ── Render Cart ─────────────────────────────────────────────────\n  function renderCart() {"
// to the closing brace before "// ── Cart actions"

const renderCartFull = /\/\/ ── Render Cart ─────────────────────────────────────────────────\n  function renderCart\(\) \{[\s\S]*?^\n  \/\/ ── Cart actions/m;
if (renderCartFull.test(html)) {
  html = html.replace(renderCartFull, 'function renderCart() { }\n\n  // ── Cart actions');
  console.log('Fixed #7: renderCart empty stub');
} else {
  console.log('Warning: renderCart pattern not found');
}

fs.writeFileSync(p, html, 'utf8');
console.log('Done!');