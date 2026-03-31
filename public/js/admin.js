const API = '/api';
const TICKET_LABELS = { single: '单人票 Single', family: '家庭票 Family', table: '桌席 Table' };
const STATUS_LABELS = { pending: '待审核', approved: '已批准', cancelled: '已取消' };

let allRegistrations = [];
let currentTab = 'all';
let sortCol = 'created_at';
let sortDir = 'desc';
let expandedRows = new Set();

// ─── Init ─────────────────────────────────────────────────────────────────────
(async function init() {
  const isLoggedIn = await checkAuth();
  if (isLoggedIn) showAdminPanel();
})();

async function checkAuth() {
  try {
    const res = await fetch(`${API}/admin/registrations`, { credentials: 'include' });
    return res.ok;
  } catch { return false; }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
async function doLogin() {
  const user = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPass').value;
  const err = document.getElementById('loginError');
  err.textContent = '';
  const btn = document.getElementById('btnLogin');
  btn.disabled = true; btn.textContent = '登录中...';
  try {
    const res = await fetch(`${API}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username: user, password: pass })
    });
    const data = await res.json();
    if (data.success) { showAdminPanel(); loadRegistrations(); }
    else { err.textContent = data.message || '用户名或密码错误'; }
  } catch (e) { err.textContent = '网络错误: ' + e.message; }
  btn.disabled = false; btn.textContent = '登录 Login';
}

document.getElementById('loginPass')?.addEventListener('keypress', e => { if (e.key === 'Enter') doLogin(); });
document.getElementById('loginUser')?.addEventListener('keypress', e => { if (e.key === 'Enter') doLogin(); });

async function doLogout() {
  await fetch(`${API}/admin/logout`, { credentials: 'include' });
  document.getElementById('loginPage').style.display = 'flex';
  document.getElementById('adminPage').style.display = 'none';
}

// ─── Admin Panel ──────────────────────────────────────────────────────────────
function showAdminPanel() {
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('adminPage').style.display = 'block';
}

async function loadRegistrations() {
  const tbody = document.getElementById('regTableBody');
  tbody.innerHTML = '<tr class="loading-row"><td colspan="13">加载中... Loading...</td></tr>';
  try {
    const res = await fetch(`${API}/admin/registrations`, { credentials: 'include' });
    const data = await res.json();
    if (!data.success) { tbody.innerHTML = '<tr class="loading-row"><td colspan="13">请先登录</td></tr>'; return; }
    allRegistrations = (data.registrations || []).map(r => ({
      ...r,
      total_seats: (r.tickets || []).reduce((s, t) => s + (t.seats || 0), 0)
    }));
    expandedRows.clear();
    await loadStats();
    applyFilters();
  } catch (e) { tbody.innerHTML = '<tr class="loading-row"><td colspan="13">加载失败: ' + e.message + '</td></tr>'; }
}

async function loadStats() {
  try {
    const res = await fetch(`${API}/admin/stats`, { credentials: 'include' });
    const data = await res.json();
    if (data.success) {
      const s = data.stats;
      document.getElementById('statTotal').textContent = s.total || 0;
      document.getElementById('statPending').textContent = s.pending || 0;
      document.getElementById('statApproved').textContent = s.approved || 0;
      document.getElementById('statRevenue').textContent = 'RM ' + (s.revenue || 0).toLocaleString('en-MY');
      document.getElementById('countAll').textContent = s.total || 0;
      document.getElementById('countPending').textContent = s.pending || 0;
      document.getElementById('countApproved').textContent = s.approved || 0;
      document.getElementById('countCancelled').textContent = s.cancelled || 0;
    }
  } catch (e) {}
}

// ─── Tab switching ────────────────────────────────────────────────────────────
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.admin-tab[data-tab="${tab}"]`)?.classList.add('active');
  applyFilters();
}

// ─── Sorting ──────────────────────────────────────────────────────────────────
function sortBy(col) {
  if (sortCol === col) {
    sortDir = sortDir === 'asc' ? 'desc' : 'asc';
  } else {
    sortCol = col;
    sortDir = 'asc';
  }
  // Update header styling
  document.querySelectorAll('.admin-table th[data-sort]').forEach(th => {
    th.classList.remove('sorted');
    th.querySelector('.sort-icon').textContent = '↕';
  });
  const activeTh = document.querySelector(`.admin-table th[data-sort="${col}"]`);
  if (activeTh) {
    activeTh.classList.add('sorted');
    activeTh.querySelector('.sort-icon').textContent = sortDir === 'asc' ? '↑' : '↓';
  }
  applyFilters();
}

// ─── Filters + Sort + Render ──────────────────────────────────────────────────
function applyFilters() {
  const q = document.getElementById('searchInput')?.value.trim().toLowerCase() || '';
  let filtered = allRegistrations.filter(r => {
    const matchTab = currentTab === 'all' || r.status === currentTab;
    const matchSearch = !q ||
      (r.name && r.name.toLowerCase().includes(q)) ||
      (r.student_id && r.student_id.toLowerCase().includes(q)) ||
      (r.ref_code && r.ref_code.toLowerCase().includes(q)) ||
      (r.mobile && r.mobile.includes(q));
    return matchTab && matchSearch;
  });

  // Sort
  filtered.sort((a, b) => {
    let va = a[sortCol] ?? '';
    let vb = b[sortCol] ?? '';
    if (sortCol === 'created_at') { va = new Date(va); vb = new Date(vb); }
    if (sortCol === 'total_amount') { va = Number(va); vb = Number(vb); }
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  document.getElementById('regCount').textContent = `${filtered.length} 条记录`;
  renderTable(filtered);
}

function renderTable(regs) {
  const tbody = document.getElementById('regTableBody');
  if (!regs.length) {
    tbody.innerHTML = '<tr class="loading-row"><td colspan="13">📋 暂无记录</td></tr>';
    return;
  }
  let html = '';
  regs.forEach(r => {
    const isExpanded = expandedRows.has(r.id);
    const totalSeats = (r.tickets || []).reduce((s, t) => s + (t.seats || 0) * (t.quantity || 1), 0);
    const date = new Date(r.created_at).toLocaleString('zh-CN', { dateStyle: 'medium', timeStyle: 'short' });

    // Ticket chips
    const ticketChips = (r.tickets || []).map(t => {
      const label = TICKET_LABELS[t.ticket_type] || t.ticket_type;
      const qty = t.quantity > 1 ? `×${t.quantity}` : '';
      return `<span class="item-chip">${label}${qty ? ' ' + qty : ''}</span>`;
    }).join('');

    // Merch chips
    const merchChips = (r.merchandise || []).map(m => {
      const label = m.item_type === 'tshirt' ? 'T-恤' : '保温瓶';
      const size = m.size ? `(${m.size})` : '';
      const qty = m.quantity > 1 ? `×${m.quantity}` : '';
      return `<span class="item-chip merch">${label}${size} ${qty}</span>`;
    }).join('');

    // Actions
    let actionHtml = '';
    if (r.status === 'pending') {
      actionHtml = `
        <button class="btn-sm btn-approve-sm" onclick="approveReg(${r.id}, event)">✅ 批准</button>
        <button class="btn-sm btn-cancel-sm" onclick="cancelReg(${r.id}, event)">❌ 取消</button>`;
    } else if (r.status === 'approved') {
      actionHtml = `<div class="action-done approved">✅ 已批准</div>`;
    } else {
      actionHtml = `<div class="action-done cancelled">❌ 已取消</div>`;
    }

    // Main row
    html += `
    <tr id="row-${r.id}" class="${isExpanded ? 'row-expanded' : ''}" onclick="toggleRow(${r.id})">
      <td style="text-align:center;">
        <button class="expand-btn ${isExpanded ? 'expanded' : ''}" id="expand-btn-${r.id}">${isExpanded ? '−' : '+'}</button>
      </td>
      <td><span class="ref-code">${r.ref_code}</span></td>
      <td><strong>${r.name || '—'}</strong></td>
      <td style="font-family:monospace;font-size:0.82rem;">${r.student_id || '—'}</td>
      <td>${r.mobile || '—'}</td>
      <td>${r.intake_year || '—'}</td>
      <td>${ticketChips || '<span style="color:#ccc">—</span>'}</td>
      <td>${merchChips || '<span style="color:#ccc">—</span>'}</td>
      <td><strong style="color:#28a745;font-size:0.9rem;">${r.total_seats} 席</strong></td>
      <td><span class="amount">RM ${(r.total_amount || 0).toLocaleString('en-MY')}</span></td>
      <td><span class="status-badge ${r.status}">${STATUS_LABELS[r.status] || r.status}</span></td>
      <td style="font-size:0.8rem;color:#666;">${date}</td>
      <td class="actions-cell" onclick="event.stopPropagation();">${actionHtml}</td>
    </tr>`;

    // Detail row
    html += `
    <tr id="detail-${r.id}" class="detail-row" style="display:${isExpanded ? 'table-row' : 'none'};">
      <td colspan="13">
        <div class="detail-inner">
          <div class="detail-section">
            <h4>个人信息</h4>
            <p><strong>姓名:</strong> ${r.name || '—'}</p>
            <p><strong>学号:</strong> ${r.student_id || '—'}</p>
            <p><strong>手机:</strong> ${r.mobile || '—'}</p>
            <p><strong>邮箱:</strong> ${r.email || '—'}</p>
            <p><strong>入学年份:</strong> ${r.intake_year || '—'}</p>
            <p><strong>总席位数:</strong> <span style="color:#28a745;font-weight:700;">${totalSeats} 席</span></p>
          </div>
          <div class="detail-section">
            <h4>票务详情</h4>
            ${(r.tickets || []).length ? (r.tickets || []).map(t => {
              const label = TICKET_LABELS[t.ticket_type] || t.ticket_type;
              return `<p><strong>${label} ×${t.quantity}:</strong> RM ${(t.unit_price * t.quantity).toLocaleString('en-MY')} (${t.seats}席)</p>`;
            }).join('') : '<p class="detail-empty">无</p>'}
          </div>
          <div class="detail-section">
            <h4>周边详情</h4>
            ${(r.merchandise || []).length ? (r.merchandise || []).map(m => {
              const label = m.item_type === 'tshirt' ? 'T-恤' : '保温瓶';
              return `<p><strong>${label}${m.size ? ' (' + m.size + ')' : ''}:</strong> ×${m.quantity} RM ${(m.unit_price * m.quantity).toLocaleString('en-MY')}</p>`;
            }).join('') : '<p class="detail-empty">无周边</p>'}
          </div>
          <div class="detail-section">
            <h4>付款凭证</h4>
            ${r.receipt
              ? `<img class="detail-receipt-img" src="${r.receipt.file_path}" alt="Receipt" onclick="viewReceipt('${r.receipt.file_path}')">`
              : '<p class="detail-empty">暂无凭证</p>'}
          </div>
          <div class="detail-section">
            <h4>系统信息</h4>
            <p><strong>Ref:</strong> <span class="ref-code">${r.ref_code}</span></p>
            <p><strong>状态:</strong> <span class="status-badge ${r.status}">${STATUS_LABELS[r.status] || r.status}</span></p>
            <p><strong>登记时间:</strong> ${new Date(r.created_at).toLocaleString('zh-CN')}</p>
            <p><strong>总金额:</strong> <span class="amount">RM ${(r.total_amount || 0).toLocaleString('en-MY')}</span></p>
          </div>
        </div>
      </td>
    </tr>`;
  });
  tbody.innerHTML = html;
}

function toggleRow(id) {
  const detailRow = document.getElementById(`detail-${id}`);
  const btn = document.getElementById(`expand-btn-${id}`);
  const mainRow = document.getElementById(`row-${id}`);
  if (!detailRow) return;
  if (expandedRows.has(id)) {
    expandedRows.delete(id);
    detailRow.style.display = 'none';
    btn.textContent = '+';
    btn.classList.remove('expanded');
    mainRow.classList.remove('row-expanded');
  } else {
    expandedRows.add(id);
    detailRow.style.display = 'table-row';
    btn.textContent = '−';
    btn.classList.add('expanded');
    mainRow.classList.add('row-expanded');
  }
}

// ─── Actions ──────────────────────────────────────────────────────────────────
async function approveReg(id, e) {
  e?.stopPropagation();
  if (!confirm('批准此报名？')) return;
  setActionState(id, 'pending', '批准中...');
  try {
    const res = await fetch(`${API}/admin/registration/${id}/approve`, { method: 'POST', credentials: 'include' });
    const data = await res.json();
    if (data.success) {
      updateRegInList(id, 'approved');
    }
  } catch (e) { setActionState(id, 'approved', '操作失败'); }
}

async function cancelReg(id, e) {
  e?.stopPropagation();
  if (!confirm('取消此报名？')) return;
  setActionState(id, 'pending', '取消中...');
  try {
    const res = await fetch(`${API}/admin/registration/${id}/cancel`, { method: 'POST', credentials: 'include' });
    const data = await res.json();
    if (data.success) {
      updateRegInList(id, 'cancelled');
    }
  } catch (e) { setActionState(id, 'cancelled', '操作失败'); }
}

function setActionState(id, status, msg) {
  const row = document.getElementById(`row-${id}`);
  const actionsCell = row?.querySelector('.actions-cell');
  if (!actionsCell) return;
  actionsCell.innerHTML = `<div class="action-done" style="background:#FEF3C7;color:#92400E;">${msg}</div>`;
}

function updateRegInList(id, newStatus) {
  const r = allRegistrations.find(r => r.id === id);
  if (r) r.status = newStatus;

  const row = document.getElementById(`row-${id}`);
  if (!row) return;
  // Update status badge
  const badge = row.querySelector('.status-badge');
  if (badge) { badge.className = `status-badge ${newStatus}`; badge.textContent = STATUS_LABELS[newStatus] || newStatus; }
  // Update actions
  const actionsCell = row.querySelector('.actions-cell');
  if (actionsCell) {
    if (newStatus === 'approved') {
      actionsCell.innerHTML = '<div class="action-done approved">✅ 已批准</div>';
    } else if (newStatus === 'cancelled') {
      actionsCell.innerHTML = '<div class="action-done cancelled">❌ 已取消</div>';
    }
  }
  // Refresh stats
  loadStats();
}

function viewReceipt(src) {
  const modal = document.getElementById('imgModal');
  const img = document.getElementById('imgModalContent');
  if (modal && img) { img.src = src; modal.classList.add('active'); }
}

// ─── CSV Export ───────────────────────────────────────────────────────────────
function exportCSV() {
  const rows = [
    ['Ref', '姓名', '学号', '手机', '邮箱', '入学年份', '票务', '周边', '席位数', '总额(RM)', '状态', '登记日期']
  ];
  const filtered = getFilteredRegs();
  filtered.forEach(r => {
    const tickets = (r.tickets || []).map(t => {
      const label = TICKET_LABELS[t.ticket_type] || t.ticket_type;
      return `${label}×${t.quantity}`;
    }).join('; ');
    const merch = (r.merchandise || []).map(m => {
      const label = m.item_type === 'tshirt' ? 'T-恤' : '保温瓶';
      return `${label}${m.size ? '(' + m.size + ')' : ''}×${m.quantity}`;
    }).join('; ');
    rows.push([
      r.ref_code,
      r.name || '',
      r.student_id || '',
      r.mobile || '',
      r.email || '',
      r.intake_year || '',
      tickets,
      merch,
      r.total_seats || 0,
      r.total_amount || 0,
      STATUS_LABELS[r.status] || r.status,
      new Date(r.created_at).toLocaleString('zh-CN')
    ]);
  });

  const csvContent = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `homecoming-2026-registrations-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function getFilteredRegs() {
  const q = document.getElementById('searchInput')?.value.trim().toLowerCase() || '';
  return allRegistrations.filter(r => {
    const matchTab = currentTab === 'all' || r.status === currentTab;
    const matchSearch = !q ||
      (r.name && r.name.toLowerCase().includes(q)) ||
      (r.student_id && r.student_id.toLowerCase().includes(q)) ||
      (r.ref_code && r.ref_code.toLowerCase().includes(q)) ||
      (r.mobile && r.mobile.includes(q));
    return matchTab && matchSearch;
  });
}
