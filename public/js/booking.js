const API = '/api';

// ─── State ───────────────────────────────────────────────────────────────────
let ticketConfig = {};
let merchConfig = {};
let currentRegId = null;
let selectedTicket = null;
let selectedMerch = {};

// ─── Init ─────────────────────────────────────────────────────────────────────
(async function regInit() {
  // Detect which page: book.html has #ticketGrid, index.html has #regTicketGrid + #regMerchGrid
  const isBookPage = !!document.getElementById('ticketGrid');
  const isIndexPage = !!document.getElementById('regTicketGrid') || !!document.getElementById('regMerchGrid');

  await loadTicketConfig();

  if (isBookPage) {
    renderTickets();
    renderMerchInto(document.getElementById('merchGrid'));
  } else if (isIndexPage) {
    // index.html: render merch dynamically into the container (same as book.html)
    // This ensures selectedMerch is properly initialized and event delegation works
    renderMerchInto(document.getElementById('regMerchGrid'));
    // Bind all booking form event handlers
    bindBookingEvents();
  }
})();

// ─── Bind event handlers for index.html hardcoded HTML elements ───────────────
function bindBookingEvents() {
  // Ticket selection
  document.querySelectorAll('.ticket-card').forEach(card => {
    card.addEventListener('click', () => {
      const type = card.dataset.type;
      selectTicket(type);
    });
  });
  // Merch (delegated through container)
  const merchContainer = document.getElementById('regMerchGrid');
  if (merchContainer) {
    merchContainer.addEventListener('click', handleMerchClick);
  }

  // Form navigation
  const step1Next = document.querySelector('#regStep1 .btn-next');
  if (step1Next) step1Next.addEventListener('click', goToStep2);
  const step2Next = document.querySelector('#regStep2 .btn-next');
  if (step2Next) step2Next.addEventListener('click', goToStep3);
  const confirmBtn = document.getElementById('regBtnConfirm');
  if (confirmBtn) confirmBtn.addEventListener('click', submitRegistration);
  const resetBtn = document.getElementById('regBtnReset');
  if (resetBtn) resetBtn.addEventListener('click', resetForm);

  // Student lookup
  const lookupBtn = document.getElementById('regBtnLookup');
  if (lookupBtn) lookupBtn.addEventListener('click', regLookupStudent);

  // Receipt upload
  const receiptInput = document.getElementById('regReceiptInput');
  if (receiptInput) {
    receiptInput.addEventListener('change', e => {
      const file = e.target.files[0];
      const preview = document.getElementById('regReceiptPreview');
      if (file && preview) {
        const reader = new FileReader();
        reader.onload = ev => { preview.innerHTML = `<img src="${ev.target.result}" alt="Receipt">`; };
        reader.readAsDataURL(file);
      }
    });
  }
}

// ─── Stub functions for index.html inline onclick handlers ───────────────────
function regSelectTicket(type) { selectTicket(type); }
function regChangeQty(delta) { changeQty(delta); }
function regToggleMerch(item) { toggleMerch(item); }
function regSelectSize(item, size) { selectSize(item, size); }
function regChangeMerchQty(item, delta) { changeMerchQty(item, delta); }
function regUpdateMerchTotal() { updateMerchTotal(); }
function regGoToStep1() { goToStep1(); }
function regGoToStep2() { goToStep2(); }
function regGoToStep3() { goToStep3(); }
function regReset() { resetForm(); }
async function regLookupStudent() { await lookupStudent(); }

// ─── Load config from API ─────────────────────────────────────────────────────
async function loadTicketConfig() {
  try {
    const res = await fetch(`${API}/config`);
    const data = await res.json();
    ticketConfig = data.tickets || {};
    merchConfig = data.merchandise || {};
  } catch (e) {
    ticketConfig = {
      single: { price: 200, seats: 1, label: '单人票 Single' },
      family: { price: 800, seats: 4, label: '家庭票 Family' },
      table:  { price: 1800, seats: 10, label: '桌席 Table' }
    };
    merchConfig = {
      tshirt:  { price: 60, label: 'T-恤 T-shirt', sizes: ['S','M','L','XL','XXL'] },
      tumbler: { price: 50, label: '保温瓶 Tumbler', sizes: null }
    };
  }
}

// ─── Student lookup ───────────────────────────────────────────────────────────
async function lookupStudent() {
  const studentId = document.getElementById('studentId')?.value.trim() || document.getElementById('regStudentId')?.value.trim();
  const result = document.getElementById('lookupResult') || document.getElementById('regLookupResult');
  if (!studentId) { result?.classList.add('fail'); if(result) result.textContent = '请输入学号'; return; }

  const btn = document.getElementById('btnLookup') || document.getElementById('regBtnLookup');
  if (btn) { btn.disabled = true; btn.textContent = '查找中...'; }

  try {
    const res = await fetch(`${API}/student/${encodeURIComponent(studentId)}`);
    const data = await res.json();
    if (data.success) {
      const nameInput = document.getElementById('buyerName') || document.getElementById('regBuyerName');
      if (nameInput) nameInput.value = data.student.chinese_name;
      if (result) { result.className = 'lookup-result ok'; result.textContent = '✓ 找到: ' + data.student.chinese_name; }
    } else {
      if (result) { result.className = 'lookup-result fail'; result.textContent = '学号未找到，请直接输入姓名'; }
    }
  } catch (e) {
    if (result) { result.className = 'lookup-result fail'; result.textContent = '查找失败，请稍后重试'; }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '查找 Lookup'; }
  }
}

// ─── Render tickets (for book.html) ────────────────────────────────────────────
function renderTickets() {
  const grid = document.getElementById('ticketGrid');
  if (!grid) return;
  grid.innerHTML = '';
  for (const [type, cfg] of Object.entries(ticketConfig)) {
    const isSingle = type === 'single';
    const card = document.createElement('div');
    card.className = 'ticket-card' + (isSingle ? ' selected' : '');
    card.dataset.type = type;
    card.onclick = () => selectTicket(type);

    card.innerHTML = `
      <div class="ticket-radio"></div>
      <div class="ticket-info">
        <div class="ticket-name">${cfg.label}</div>
        <div class="ticket-desc">${type === 'single' ? '单人参加' : type === 'family' ? '4人家庭套票' : '10人桌席'}</div>
        <div class="ticket-seats">含 ${cfg.seats} 席</div>
        ${isSingle ? `
          <div class="qty-stepper">
            <span style="font-size:0.8rem;color:#888;">数量:</span>
            <button class="qty-btn" onclick="event.stopPropagation(); changeQty(-1)">−</button>
            <span class="qty-display" id="singleQty">1</span>
            <button class="qty-btn" onclick="event.stopPropagation(); changeQty(1)">+</button>
          </div>
        ` : ''}
      </div>
      <div class="ticket-price">RM ${cfg.price}</div>
    `;
    grid.appendChild(card);
    selectedTicket = { type: 'single', quantity: 1, unitPrice: cfg.price, seats: cfg.seats };
  }
}

function selectTicket(type) {
  document.querySelectorAll('.ticket-card').forEach(c => c.classList.remove('selected'));
  const selected = document.querySelector(`.ticket-card[data-type="${type}"]`);
  if (selected) selected.classList.add('selected');
  const qtyEl = document.getElementById('singleQty');
  const qty = type === 'single' ? parseInt(qtyEl?.textContent || '1') : 1;
  selectedTicket = { type, quantity: qty, unitPrice: ticketConfig[type].price, seats: ticketConfig[type].seats };
  updateMerchTotal();
}

function changeQty(delta) {
  const qtyEl = document.getElementById('singleQty');
  if (!qtyEl) return;
  let qty = parseInt(qtyEl.textContent) + delta;
  if (qty < 1) qty = 1;
  if (qty > 10) qty = 10;
  qtyEl.textContent = qty;
  if (selectedTicket) { selectedTicket.quantity = qty; updateMerchTotal(); }
}

// ─── Render merch into a given container ─────────────────────────────────────
function renderMerchInto(target) {
  if (!target) return;
  target.innerHTML = '';
  for (const [item, cfg] of Object.entries(merchConfig)) {
    if (!selectedMerch[item]) {
      selectedMerch[item] = { checked: false, size: cfg.sizes ? cfg.sizes[1] : null, quantity: 1 };
    }
    const div = document.createElement('div');
    div.className = 'merch-item';
    div.dataset.item = item;
    div.id = `merch-${item}`;
    let optionsHtml = '';
    if (cfg.sizes) {
      optionsHtml = `<div class="merch-options" id="merch-opts-${item}">
        <span style="font-size:0.8rem;color:#666;">尺码 Size:</span>
        ${cfg.sizes.map(s => `<button class="size-btn${s === 'M' ? ' selected' : ''}" data-size="${s}" data-action="size" data-item="${item}">${s}</button>`).join('')}
      </div>`;
    } else {
      optionsHtml = `<div class="merch-options" id="merch-opts-${item}">
        <span style="font-size:0.8rem;color:#666;">数量 Qty:</span>
        <div class="merch-qty">
          <button class="qty-btn" data-action="merch-qty" data-item="${item}" data-delta="-1">−</button>
          <span class="qty-display" id="merch-qty-${item}">1</span>
          <button class="qty-btn" data-action="merch-qty" data-item="${item}" data-delta="1">+</button>
        </div>
      </div>`;
    }
    div.innerHTML = `
      <div class="merch-header">
        <div class="merch-checkbox" id="merch-check-${item}"></div>
        <div class="merch-info">
          <div class="merch-name">${cfg.label}</div>
          <div class="merch-price">RM ${cfg.price}</div>
        </div>
      </div>
      ${optionsHtml}
    `;
    target.appendChild(div);
  }
  // Note: onclick delegation is handled by bindBookingEvents()
}

function handleMerchClick(e) {
  const item = e.target.closest('.merch-item')?.dataset.item;
  if (!item) return;
  const action = e.target.dataset.action;
  if (action === 'size') selectSize(item, e.target.dataset.size);
  else if (action === 'merch-qty') changeMerchQty(item, parseInt(e.target.dataset.delta));
  else toggleMerch(item);
}

function renderMerch() {
  const grid = document.getElementById('merchGrid');
  if (grid) renderMerchInto(grid);
}

// ─── Merch interactions ───────────────────────────────────────────────────────
function toggleMerch(item) {
  if (!selectedMerch[item]) return;
  selectedMerch[item].checked = !selectedMerch[item].checked;
  const el = document.getElementById('merch-' + item);
  if (el) el.classList.toggle('checked', selectedMerch[item].checked);
  updateMerchTotal();
}

function selectSize(item, size) {
  if (!selectedMerch[item]) return;
  selectedMerch[item].size = size;
  const opts = document.getElementById('merch-opts-' + item);
  if (opts) opts.querySelectorAll('.size-btn').forEach(b => b.classList.toggle('selected', b.dataset.size === size));
}

function changeMerchQty(item, delta) {
  if (!selectedMerch[item]) return;
  let qty = (selectedMerch[item].quantity || 1) + delta;
  if (qty < 1) qty = 1;
  if (qty > 10) qty = 10;
  selectedMerch[item].quantity = qty;
  const display = document.getElementById('merch-qty-' + item);
  if (display) display.textContent = qty;
  updateMerchTotal();
}

// ─── Summary ──────────────────────────────────────────────────────────────────
function updateMerchTotal() {
  const ticketRow = document.getElementById('summaryTickets') || document.getElementById('regSummaryTickets');
  const merchRow = document.getElementById('summaryMerch') || document.getElementById('regSummaryMerch');
  const totalEl = document.getElementById('summaryTotal') || document.getElementById('regSummaryTotal');
  if (!ticketRow || !totalEl) return;

  const t = selectedTicket;
  if (!t) return;

  const tTotal = t.unitPrice * t.quantity;
  const tSeats = t.seats * t.quantity;
  const tLabel = t.quantity > 1 ? `${ticketConfig[t.type]?.label || t.type} × ${t.quantity}` : (ticketConfig[t.type]?.label || t.type);
  ticketRow.innerHTML = `<span>票务 ${tLabel}</span><span>RM ${tTotal.toFixed(0)} (${tSeats}席)</span>`;

  let merchTotal = 0, merchParts = [];
  for (const [item, state] of Object.entries(selectedMerch)) {
    if (!state?.checked) continue;
    const price = merchConfig[item]?.price || 0;
    const qty = state.quantity || 1;
    merchTotal += price * qty;
    const label = merchConfig[item]?.label || item;
    const size = state.size ? ` (${state.size})` : '';
    merchParts.push(`${label}${size} ×${qty}`);
  }
  if (merchRow) {
    merchRow.innerHTML = merchParts.length
      ? `<span>周边 ${merchParts.join(', ')}</span><span>RM ${merchTotal.toFixed(0)}</span>`
      : `<span>周边 Merchandise</span><span>—</span>`;
  }
  totalEl.textContent = `RM ${(tTotal + merchTotal).toFixed(0)}`;
  return tTotal + merchTotal;
}

// ─── Step navigation ─────────────────────────────────────────────────────────
function showStep(n) {
  ['step1','step2','step3','successScreen'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
  ['regStep1','regStep2','regStep3','regSuccess'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
  const el = document.getElementById(`step${n}`) || document.getElementById(`regStep${n}`) || (n === 'success' ? (document.getElementById('successScreen') || document.getElementById('regSuccess')) : null);
  if (el) el.style.display = 'block';

  document.querySelectorAll('.step-item').forEach(s => {
    const sn = parseInt(s.dataset.step);
    s.classList.remove('active','done');
    if (sn === n) s.classList.add('active');
    else if (sn < n) s.classList.add('done');
  });
}

function hideErrors() {
  document.querySelectorAll('.error-msg').forEach(e => e.classList.remove('visible'));
  document.querySelectorAll('.form-input.error').forEach(e => e.classList.remove('error'));
}

function showError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg; el.classList.add('visible');
}

function goToStep1() { showStep(1); }

function goToStep2() {
  hideErrors();
  const name = (document.getElementById('buyerName') || document.getElementById('regBuyerName'))?.value.trim();
  const mobile = (document.getElementById('buyerMobile') || document.getElementById('regBuyerMobile'))?.value.trim();
  let ok = true;
  if (!name) {
    (document.getElementById('buyerName') || document.getElementById('regBuyerName'))?.classList.add('error');
    showError('regStep1Error', '请输入姓名');
    ok = false;
  }
  if (!mobile) ok = false;
  if (!ok) return;
  updateMerchTotal();
  showStep(2);
}

async function goToStep3() {
  hideErrors();
  updateMerchTotal();
  const name = (document.getElementById('buyerName') || document.getElementById('regBuyerName'))?.value.trim();
  const mobile = (document.getElementById('buyerMobile') || document.getElementById('regBuyerMobile'))?.value.trim();
  const email = (document.getElementById('buyerEmail') || document.getElementById('regBuyerEmail'))?.value.trim();
  const intakeYear = (document.getElementById('intakeYear') || document.getElementById('regIntakeYear'))?.value;
  const studentId = (document.getElementById('studentId') || document.getElementById('regStudentId'))?.value.trim();
  if (!name || !mobile) return;

  const tickets = [{ type: selectedTicket.type, quantity: selectedTicket.quantity }];
  const merchandise = [];
  for (const [item, state] of Object.entries(selectedMerch)) {
    if (!state?.checked) continue;
    merchandise.push({ item, size: state.size || null, quantity: state.quantity || 1 });
  }

  const btn = document.querySelector('#regStep2 .btn-next') || document.querySelector('#step2 .btn-next');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> 处理中...'; }

  try {
    const res = await fetch(`${API}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: studentId || null, name, mobile, email: email || null, intakeYear: intakeYear || null, tickets, merchandise })
    });
    const data = await res.json();
    if (!data.success) { showError('regStep2Error', data.message || '提交失败'); if (btn) { btn.disabled = false; btn.textContent = '下一步 Next →'; } return; }
    currentRegId = data.registration.id;
    (document.getElementById('payRef') || document.getElementById('regPayRef')).textContent = data.registration.ref_code;
    (document.getElementById('payAmount') || document.getElementById('regPayAmount')).textContent = `RM ${data.registration.total_amount.toFixed(0)}`;
    showStep(3);
  } catch (e) { showError('regStep2Error', '网络错误'); } finally { if (btn) { btn.disabled = false; btn.textContent = '下一步 Next →'; } }
}

// ─── Receipt upload ───────────────────────────────────────────────────────────
document.getElementById('receiptInput')?.addEventListener('change', function(e) {
  const file = e.target.files[0];
  const preview = document.getElementById('receiptPreview') || document.getElementById('regReceiptPreview');
  if (!file || !preview) return;
  const reader = new FileReader();
  reader.onload = ev => { preview.innerHTML = `<img src="${ev.target.result}" alt="Receipt preview">`; };
  reader.readAsDataURL(file);
});

// ─── Submit registration ──────────────────────────────────────────────────────
async function submitRegistration() {
  const fileInput = document.getElementById('receiptInput') || document.getElementById('regReceiptInput');
  const file = fileInput?.files[0];
  if (!file) { showError('regStep3Error', '请上传付款凭证'); return; }

  const btn = document.getElementById('regBtnConfirm') || document.getElementById('btnConfirm');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> 上传中...'; }

  const formData = new FormData();
  formData.append('receipt', file);
  formData.append('registrationId', currentRegId);

  try {
    const res = await fetch(`${API}/upload-receipt`, { method: 'POST', body: formData });
    const data = await res.json();
    if (data.success) {
      const refEl = document.getElementById('successRef') || document.getElementById('regSuccessRef');
      const payRefEl = document.getElementById('payRef') || document.getElementById('regPayRef');
      if (refEl && payRefEl) refEl.textContent = `Reference: ${payRefEl.textContent}`;
      showStep('success');
    } else { showError('regStep3Error', data.message || '上传失败'); }
  } catch (e) { showError('regStep3Error', '网络错误'); } finally { if (btn) { btn.disabled = false; btn.textContent = '确认提交 Confirm'; } }
}

// ─── Reset ────────────────────────────────────────────────────────────────────
function resetForm() {
  currentRegId = null;
  selectedTicket = { type: 'single', quantity: 1, unitPrice: 200, seats: 1 };
  selectedMerch = {};
  ['buyerName','buyerMobile','buyerEmail','intakeYear','studentId','lookupResult','regBuyerName','regBuyerMobile','regBuyerEmail','regStudentId','regLookupResult'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.value = ''; el.classList.remove('error'); }
  });
  const receiptInput = document.getElementById('receiptInput') || document.getElementById('regReceiptInput');
  if (receiptInput) receiptInput.value = '';
  const preview = document.getElementById('receiptPreview') || document.getElementById('regReceiptPreview');
  if (preview) preview.innerHTML = '';
  hideErrors();
  const merchGrid = document.getElementById('merchGrid') || document.getElementById('regMerchGrid');
  if (merchGrid) { selectedMerch = {}; renderMerchInto(merchGrid); }
  showStep(1);
}