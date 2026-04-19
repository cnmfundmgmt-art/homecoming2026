const fs = require('fs');
const path = 'C:\\Users\\000\\.openclaw\\workspace\\homecoming-2026\\public\\index.html';

let html = fs.readFileSync(path, 'utf8');

// 1. Add .merch-price-inline CSS
html = html.replace(
  '.merch-price { font-size: 0.88rem; color: #8B1A1A; font-weight: 600; }',
  '.merch-price { font-size: 0.88rem; color: #8B1A1A; font-weight: 600; }\n    .merch-price-inline { font-size: 0.82rem; color: #8B1A1A; font-weight: 600; margin-left: 0.5rem; }'
);

// 2. T-shirt - inline price + horizontal qty + remove unit
html = html.replace(
  `        <div class="merch-info">
          <div class="merch-name">T-shirt</div>
          <div class="merch-price">RM 60/件</div>
          <div class="merch-ctrl hidden" id="merch-ctrl-tshirt">
            <div class="merch-qty merch-qty-vertical" id="merch-qty-row-tshirt">
              <span class="size-label">数量:</span>
              <div class="qty-vertical">
                <button class="qty-btn" onclick="event.stopPropagation(); changeMerchQty('tshirt',-1)">−</button>
                <span class="qty-display" id="merch-qty-tshirt">1</span>
                <button class="qty-btn" onclick="event.stopPropagation(); changeMerchQty('tshirt',1)">+</button>
              </div>
            </div>
          </div>
        </div>
        <div class="merch-right" id="merch-right-tshirt">
          <div class="merch-unit">RM 60</div>
          <div class="merch-subtotal zero" id="merch-sub-tshirt">—</div>
        </div>`,
  `        <div class="merch-info">
          <div class="merch-name">T-shirt <span class="merch-price-inline">RM 60/件</span></div>
          <div class="merch-ctrl hidden" id="merch-ctrl-tshirt">
            <div class="merch-qty">
              <span class="size-label">数量:</span>
              <button class="qty-btn" onclick="event.stopPropagation(); changeMerchQty('tshirt',-1)">−</button>
              <span class="qty-display" id="merch-qty-tshirt">1</span>
              <button class="qty-btn" onclick="event.stopPropagation(); changeMerchQty('tshirt',1)">+</button>
            </div>
          </div>
        </div>
        <div class="merch-right" id="merch-right-tshirt">
          <div class="merch-subtotal zero" id="merch-sub-tshirt">—</div>
        </div>`
);

// 3. Badge - inline price + remove unit
html = html.replace(
  `        <div class="merch-info">
          <div class="merch-name">School Badge 校徽</div>
          <div class="merch-price">RM 30/个</div>
          <div class="merch-ctrl hidden" id="merch-ctrl-badge">`,
  `        <div class="merch-info">
          <div class="merch-name">School Badge 校徽 <span class="merch-price-inline">RM 30/个</span></div>
          <div class="merch-ctrl hidden" id="merch-ctrl-badge">`
);
html = html.replace(
  `        <div class="merch-right" id="merch-right-badge">
          <div class="merch-unit">RM 30</div>
          <div class="merch-subtotal zero" id="merch-sub-badge">—</div>
        </div>`,
  `        <div class="merch-right" id="merch-right-badge">
          <div class="merch-subtotal zero" id="merch-sub-badge">—</div>
        </div>`
);

// 4. Bag - inline price + remove unit
html = html.replace(
  `          <div class="merch-name">Recycle Bag 环保袋</div>
          <div class="merch-price">RM 15/个</div>
          <div class="merch-ctrl hidden" id="merch-ctrl-bag">`,
  `          <div class="merch-name">Recycle Bag 环保袋 <span class="merch-price-inline">RM 15/个</span></div>
          <div class="merch-ctrl hidden" id="merch-ctrl-bag">`
);
html = html.replace(
  `        <div class="merch-right" id="merch-right-bag">
          <div class="merch-unit">RM 15</div>
          <div class="merch-subtotal zero" id="merch-sub-bag">—</div>
        </div>`,
  `        <div class="merch-right" id="merch-right-bag">
          <div class="merch-subtotal zero" id="merch-sub-bag">—</div>
        </div>`
);

// 5. openCart/closeCart empty
html = html.replace(
  `  function openCart()  { document.body.classList.add('cart-open'); document.getElementById('cartPanel').classList.add('open'); document.getElementById('cartOverlay').classList.add('open'); renderCart(); }
  function closeCart() { document.body.classList.remove('cart-open'); document.getElementById('cartPanel').classList.remove('open'); document.getElementById('cartOverlay').classList.remove('open'); }`,
  `  function openCart()  { }
  function closeCart() { }`
);

// 6. showStep - remove cart refs
html = html.replace(
  `    document.getElementById('successScreen').style.display = n === 'success' ? 'block' : 'none';
        document.getElementById('cartOverlay').classList.remove('open');
    document.getElementById('cartPanel').classList.remove('open');
    document.body.classList.remove('cart-open');
    // Scroll to top`,
  `    document.getElementById('successScreen').style.display = n === 'success' ? 'block' : 'none';
    // Scroll to top`
);

// 7. renderCart() stub (keep existing calls - they will call empty function)
html = html.replace(
  `  // ── Render Cart ─────────────────────────────────────────────────
  function renderCart() {`,
  `  function renderCart() { }`
);

// 8. updateTotal() - add null check for merch-unit
html = html.replace(
  `if (right) right.querySelector('.merch-unit').style.display = '';`,
  `if (right) { const unit = right.querySelector('.merch-unit'); if (unit) unit.style.display = ''; }`
);
html = html.replace(
  `if (right) right.querySelector('.merch-unit').style.display = 'none';`,
  `if (right) { const unit = right.querySelector('.merch-unit'); if (unit) unit.style.display = 'none'; }`
);

// 9. QR code mobile responsive
html = html.replace(
  `.qr-wrap img { width: 320px; }`,
  `.qr-wrap img { width: 280px; max-width: 100%; }`
);
html = html.replace(
  `.qr-wrap img { width: 400px; border-radius: 12px; border: 3px solid #f0f0f0; }`,
  `.qr-wrap img { width: 400px; max-width: 100%; height: auto; border-radius: 12px; border: 3px solid #f0f0f0; }`
);

fs.writeFileSync(path, html, 'utf8');
console.log('Done!');