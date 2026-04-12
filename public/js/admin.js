const API = '/api';
const TICKET_LABELS = { single: '单人票 Single', family: '家庭票 Family', table: '桌席 Table' };
const STATUS_LABELS = { pending: '待审核', approved: '已批准', cancelled: '已取消' };
const MERCH_LABELS = { tshirt: 'T-恤', tumbler: '保温瓶', badge: '校徽', bag: '环保袋' };
const AUDIT_ACTION_LABELS = {
  registration_created: '📝 报名创建',
  receipt_uploaded: '🧾 凭证上传',
  registration_approved: '✅ 报名批准',
  registration_cancelled: '❌ 报名取消',
  checked_in: '🎫 已签到'
};

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
  expandedRows.clear();
  document.getElementById('loginPage').style.display = 'flex';
  document.getElementById('adminPage').style.display = 'none';
}

// ─── Admin Panel ──────────────────────────────────────────────────────────────
function showAdminPanel() {
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('adminPage').style.display = 'block';
  expandedRows.clear();
  loadRegistrations();
}

async function loadRegistrations() {
  const tbody = document.getElementById('regTableBody');
  tbody.innerHTML = '<tr class="loading-row"><td colspan="13">加载中... Loading...</td></tr>';
  expandedRows.clear();
  document.querySelectorAll('.detail-row').forEach(el => { el.classList.remove('visible'); el.style.display = 'none'; el.style.visibility = 'hidden'; });
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

  const regContent = document.getElementById('regContent');
  const auditContent = document.getElementById('auditContent');
  const toolbar = document.querySelector('.admin-toolbar');

  if (tab === 'audit') {
    regContent.style.display = 'none';
    auditContent.style.display = 'block';
    if (toolbar) toolbar.style.display = 'none';
    loadAuditLogs();
  } else {
    regContent.style.display = 'block';
    auditContent.style.display = 'none';
    if (toolbar) toolbar.style.display = 'flex';
    applyFilters();
  }
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
      const label = MERCH_LABELS[m.item_type] || m.item_type;
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
      <td data-label="" style="text-align:center;">
        <button class="expand-btn ${isExpanded ? 'expanded' : ''}" id="expand-btn-${r.id}">${isExpanded ? '−' : '+'}</button>
      </td>
      <td data-label="Ref"><span class="ref-code">${r.ref_code}</span></td>
      <td data-label="姓名"><strong>${r.name || '—'}</strong></td>
      <td data-label="学号" style="font-family:monospace;font-size:0.82rem;">${r.student_id || '—'}</td>
      <td data-label="手机">${r.mobile || '—'}</td>
      <td data-label="班别">${r.class || '—'}</td>
      <td data-label="票务">${ticketChips || '<span style="color:#ccc">—</span>'}</td>
      <td data-label="周边">${merchChips || '<span style="color:#ccc">—</span>'}</td>
      <td data-label="席位数"><strong style="color:#28a745;font-size:0.9rem;">${r.total_seats} 席</strong></td>
      <td data-label="总额"><span class="amount">RM ${(r.total_amount || 0).toLocaleString('en-MY')}</span></td>
      <td data-label="状态"><span class="status-badge ${r.status}">${STATUS_LABELS[r.status] || r.status}</span></td>
      <td data-label="登记日期" style="font-size:0.8rem;color:#666;">${date}</td>
      <td class="actions-cell" data-label="操作" onclick="event.stopPropagation();">${actionHtml}</td>
    </tr>`;

    // Detail row — NO inline style, rely entirely on CSS classes
    html += `
    <tr id="detail-${r.id}" class="detail-row" style="display:none;">
      <td colspan="13">
        <div class="detail-inner">
          <div class="detail-section">
            <h4>个人信息</h4>
            <p><strong>姓名:</strong> ${r.name || '—'}</p>
            <p><strong>学号:</strong> ${r.student_id || '—'}</p>
            <p><strong>手机:</strong> ${r.mobile || '—'}</p>
            <p><strong>邮箱:</strong> ${r.email || '—'}</p>
            <p><strong>班别:</strong> ${r.class || '—'}</p>
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
              const label = MERCH_LABELS[m.item_type] || m.item_type;
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
    detailRow.classList.remove('visible');
    detailRow.style.display = 'none';
    detailRow.style.visibility = 'hidden';
    if (btn) { btn.textContent = '+'; btn.classList.remove('expanded'); }
    if (mainRow) mainRow.classList.remove('row-expanded');
  } else {
    expandedRows.add(id);
    detailRow.classList.add('visible');
    detailRow.style.display = 'block';
    detailRow.style.visibility = 'visible';
    if (btn) { btn.textContent = '−'; btn.classList.add('expanded'); }
    if (mainRow) mainRow.classList.add('row-expanded');
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
    ['Ref', '姓名', '学号', '手机', '邮箱', '班别', '票务', '周边', '席位数', '总额(RM)', '状态', '登记日期']
  ];
  const filtered = getFilteredRegs();
  filtered.forEach(r => {
    const tickets = (r.tickets || []).map(t => {
      const label = TICKET_LABELS[t.ticket_type] || t.ticket_type;
      return `${label}×${t.quantity}`;
    }).join('; ');
    const merch = (r.merchandise || []).map(m => {
      const label = MERCH_LABELS[m.item_type] || m.item_type;
      return `${label}${m.size ? '(' + m.size + ')' : ''}×${m.quantity}`;
    }).join('; ');
    rows.push([
      r.ref_code,
      r.name || '',
      r.student_id || '',
      r.mobile || '',
      r.email || '',
      r.class || '',
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

// ─── Audit Log ────────────────────────────────────────────────────────────────
let auditLogs = [];
let auditSortCol = 'created_at';
let auditSortDir = 'desc';
let auditOffset = 0;
const AUDIT_LIMIT = 50;

async function loadAuditLogs(reset = true) {
  const tbody = document.getElementById('auditTableBody');
  if (reset) {
    auditLogs = [];
    auditOffset = 0;
    tbody.innerHTML = '<tr class="loading-row"><td colspan="5">加载中... Loading...</td></tr>';
  }
  try {
    const res = await fetch(`${API}/admin/audit-logs?limit=${AUDIT_LIMIT}&offset=${auditOffset}`, { credentials: 'include' });
    const data = await res.json();
    if (!data.success) { tbody.innerHTML = '<tr class="loading-row"><td colspan="5">请先登录</td></tr>'; return; }
    if (reset) auditLogs = data.audit_logs || [];
    else auditLogs.push(...(data.audit_logs || []));
    auditOffset += data.audit_logs?.length || 0;
    document.getElementById('auditCount').textContent = `${auditLogs.length} 条记录`;
    document.getElementById('auditLoadMore').style.display = (data.audit_logs?.length === AUDIT_LIMIT) ? 'inline-block' : 'none';
    renderAuditTable();
  } catch (e) { tbody.innerHTML = `<tr class="loading-row"><td colspan="5">加载失败: ${e.message}</td></tr>`; }
}

function renderAuditTable() {
  const tbody = document.getElementById('auditTableBody');
  if (!auditLogs.length) {
    tbody.innerHTML = '<tr class="loading-row"><td colspan="5">📋 暂无动态记录</td></tr>';
    return;
  }
  // Sort
  const sorted = [...auditLogs].sort((a, b) => {
    let va = a[auditSortCol] ?? '';
    let vb = b[auditSortCol] ?? '';
    if (auditSortCol === 'created_at') { va = new Date(va); vb = new Date(vb); }
    if (va < vb) return auditSortDir === 'asc' ? -1 : 1;
    if (va > vb) return auditSortDir === 'asc' ? 1 : -1;
    return 0;
  });
  tbody.innerHTML = sorted.map(log => {
    const actionLabel = AUDIT_ACTION_LABELS[log.action] || log.action;
    const time = new Date(log.created_at).toLocaleString('zh-CN', { dateStyle: 'medium', timeStyle: 'short' });
    const details = log.details ? formatAuditDetails(log.action, log.details) : '—';
    return `
      <tr>
        <td data-label="时间" style="font-size:0.8rem;color:#666;white-space:nowrap;">${time}</td>
        <td data-label="操作"><strong>${actionLabel}</strong></td>
        <td data-label="对象"><span class="item-chip">${log.target_type}</span></td>
        <td data-label="ID" style="font-family:monospace;font-size:0.82rem;">${log.target_id || '—'}</td>
        <td data-label="详情" style="font-size:0.82rem;color:#555;max-width:320px;">${details}</td>
      </tr>`;
  }).join('');
}

function formatAuditDetails(action, details) {
  switch (action) {
    case 'registration_created':
      return `Ref: ${details.ref_code || '—'} · ${details.name || '—'} · ${details.ticket_types?.join(', ') || '—'} · RM ${details.total || 0}`;
    case 'receipt_uploaded':
      return `📎 ${details.filename || '—'} · ${details.size ? (details.size / 1024).toFixed(1) + ' KB' : '—'}`;
    case 'registration_approved':
      return `Ref: ${details.ref_code || '—'} · ${details.name || '—'}`;
    case 'registration_cancelled':
      return `Ref: ${details.ref_code || '—'} · ${details.name || '—'}`;
    case 'checked_in':
      return `Ref: ${details.ref_code || '—'}`;
    default:
      return JSON.stringify(details);
  }
}

function sortAuditBy(col) {
  if (auditSortCol === col) {
    auditSortDir = auditSortDir === 'asc' ? 'desc' : 'asc';
  } else {
    auditSortCol = col;
    auditSortDir = 'desc';
  }
  document.querySelectorAll('#auditTable th[data-sort]').forEach(th => {
    th.classList.remove('sorted');
    th.querySelector('.sort-icon').textContent = '↕';
  });
  const activeTh = document.querySelector(`#auditTable th[data-sort="${col}"]`);
  if (activeTh) {
    activeTh.classList.add('sorted');
    activeTh.querySelector('.sort-icon').textContent = auditSortDir === 'asc' ? '↑' : '↓';
  }
  renderAuditTable();
}

function loadMoreAuditLogs() {
  loadAuditLogs(false);
}
