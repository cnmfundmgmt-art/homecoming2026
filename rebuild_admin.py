content = '''<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin — Homecoming 2026</title>
  <link rel="stylesheet" href="/css/style.css">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter','Noto Sans SC',system-ui,sans-serif; background: #f0f0f0; color: #333; min-height: 100vh; }
    .login-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .login-box { background: white; border-radius: 16px; padding: 2.5rem; box-shadow: 0 4px 24px rgba(0,0,0,0.1); width: 360px; }
    .login-box h1 { color: #8B1A1A; font-size: 1.4rem; margin-bottom: 0.3rem; text-align: center; }
    .login-box p { color: #888; font-size: 0.85rem; text-align: center; margin-bottom: 2rem; }
    .login-field { margin-bottom: 1rem; }
    .login-field label { display: block; font-weight: 600; font-size: 0.85rem; margin-bottom: 0.3rem; color: #555; }
    .login-field input { width: 100%; padding: 0.7rem 1rem; border: 2px solid #ddd; border-radius: 8px; font-size: 1rem; transition: border-color 0.2s; }
    .login-field input:focus { outline: none; border-color: #8B1A1A; }
    .btn-login { width: 100%; padding: 0.85rem; background: #8B1A1A; color: white; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; margin-top: 1rem; transition: background 0.2s; }
    .btn-login:hover { background: #6B1010; }
    .login-error { color: #e53e3e; font-size: 0.85rem; text-align: center; margin-top: 0.75rem; min-height: 1.2em; }
    .login-footer { text-align: center; margin-top: 1.5rem; }
    .login-footer a { color: #8B1A1A; text-decoration: none; font-size: 0.85rem; }
    .admin-page { display: none; }
    .admin-header { background: linear-gradient(135deg, #8B1A1A, #6B1010); color: white; padding: 1rem 2rem; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 100; }
    .admin-header h1 { font-size: 1.2rem; }
    .admin-header-right { display: flex; align-items: center; gap: 1rem; }
    .admin-stats { display: flex; gap: 1.5rem; }
    .admin-stat { text-align: center; }
    .admin-stat-val { font-size: 1.4rem; font-weight: 800; }
    .admin-stat-label { font-size: 0.7rem; opacity: 0.8; }
    .btn-logout { background: rgba(255,255,255,0.15); color: white; border: 1px solid rgba(255,255,255,0.3); padding: 0.4rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; }
    .admin-tabs { background: white; padding: 0 2rem; border-bottom: 1px solid #eee; display: flex; }
    .admin-tab { padding: 0.9rem 1.5rem; font-size: 0.9rem; font-weight: 600; color: #888; cursor: pointer; border-bottom: 3px solid transparent; transition: all 0.2s; }
    .admin-tab:hover { color: #8B1A1A; }
    .admin-tab.active { color: #8B1A1A; border-bottom-color: #8B1A1A; }
    .admin-content { padding: 1.5rem 2rem; max-width: 1200px; margin: 0 auto; }
    .filter-bar { display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; margin-bottom: 1.5rem; }
    .filter-group { display: flex; align-items: center; gap: 0.5rem; }
    .filter-group label { font-size: 0.85rem; font-weight: 600; color: #666; }
    .filter-select { padding: 0.5rem 1rem; border: 2px solid #ddd; border-radius: 8px; font-size: 0.9rem; background: white; cursor: pointer; }
    .reg-count { margin-left: auto; font-size: 0.85rem; color: #888; font-weight: 600; }
    .reg-list { display: flex; flex-direction: column; gap: 1rem; }
    .reg-card { background: white; border-radius: 14px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); overflow: hidden; border-left: 5px solid #ddd; }
    .reg-card.pending { border-left-color: #D4A853; }
    .reg-card.approved { border-left-color: #28a745; }
    .reg-card.cancelled { border-left-color: #e53e3e; opacity: 0.7; }
    .reg-card-header { display: flex; align-items: center; gap: 1rem; padding: 1rem 1.25rem; flex-wrap: wrap; }
    .reg-ref { font-weight: 800; font-size: 1rem; color: #333; font-family: monospace; letter-spacing: 1px; }
    .reg-status { padding: 0.2rem 0.7rem; border-radius: 20px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }
    .reg-status.pending { background: #FEF3C7; color: #92400E; }
    .reg-status.approved { background: #D1FAE5; color: #065F46; }
    .reg-status.cancelled { background: #FEE2E2; color: #991B1B; }
    .reg-date { margin-left: auto; font-size: 0.8rem; color: #999; }
    .reg-card-body { padding: 0 1.25rem 1rem; }
    .reg-info-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 0.75rem; margin-bottom: 1rem; }
    .reg-info-item label { font-size: 0.72rem; color: #999; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 0.15rem; }
    .reg-info-item span { font-weight: 600; font-size: 0.9rem; color: #333; }
    .reg-items { background: #f9f9f9; border-radius: 10px; padding: 0.75rem 1rem; margin-bottom: 1rem; }
    .reg-items-title { font-size: 0.75rem; color: #999; text-transform: uppercase; margin-bottom: 0.4rem; }
    .reg-item-row { display: flex; justify-content: space-between; align-items: center; padding: 0.25rem 0; font-size: 0.88rem; }
    .reg-item-row .label { color: #555; }
    .reg-item-row .val { font-weight: 600; color: #333; }
    .reg-total-row { border-top: 1px solid #ddd; margin-top: 0.4rem; padding-top: 0.4rem; font-weight: 700; color: #8B1A1A; font-size: 0.95rem; }
    .reg-receipt { margin-bottom: 1rem; }
    .reg-receipt-title { font-size: 0.75rem; color: #999; text-transform: uppercase; margin-bottom: 0.4rem; }
    .reg-receipt-img { max-width: 280px; border-radius: 8px; border: 2px solid #eee; cursor: pointer; }
    .reg-receipt-none { font-size: 0.85rem; color: #ccc; font-style: italic; }
    .reg-actions { display: flex; gap: 0.75rem; padding: 0.75rem 1.25rem; background: #f9f9f9; border-top: 1px solid #eee; }
    .btn-approve { padding: 0.5rem 1.25rem; background: #28a745; color: white; border: none; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; }
    .btn-cancel { padding: 0.5rem 1.25rem; background: #e53e3e; color: white; border: none; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; }
    .btn-action-msg { padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.85rem; font-weight: 600; }
    .btn-action-msg.approved { background: #D1FAE5; color: #065F46; }
    .btn-action-msg.cancelled { background: #FEE2E2; color: #991B1B; }
    .empty-state { text-align: center; padding: 3rem; color: #aaa; }
    .empty-state .emoji { font-size: 3rem; margin-bottom: 1rem; }
    .loading { text-align: center; padding: 2rem; color: #aaa; }
    .img-modal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 1000; align-items: center; justify-content: center; cursor: pointer; }
    .img-modal.active { display: flex; }
    .img-modal img { max-width: 90vw; max-height: 90vh; border-radius: 12px; }
    @media (max-width: 600px) {
      .admin-header { flex-direction: column; gap: 0.75rem; align-items: flex-start; }
      .admin-content { padding: 1rem; }
    }
  </style>
</head>
<body>
<div class="login-page" id="loginPage">
  <div class="login-box">
    <h1>Homecoming 2026</h1>
    <p>吉隆坡中华独立中学 · 校友回校日管理后台</p>
    <div class="login-field">
      <label>用户名 Username</label>
      <input type="text" id="loginUser" placeholder="admin" autocomplete="username">
    </div>
    <div class="login-field">
      <label>密码 Password</label>
      <input type="password" id="loginPass" placeholder="" autocomplete="current-password">
    </div>
    <button class="btn-login" id="btnLogin" onclick="doLogin()">登录 Login</button>
    <div class="login-error" id="loginError"></div>
    <div class="login-footer">
      <a href="/">← 返回首页 Back to Home</a>
    </div>
  </div>
</div>

<div class="admin-page" id="adminPage">
  <div class="admin-header">
    <h1>Homecoming 2026 管理后台</h1>
    <div class="admin-header-right">
      <div class="admin-stats" id="adminStats">
        <div class="admin-stat"><div class="admin-stat-val" id="statTotal">—</div><div class="admin-stat-label">总计 Total</div></div>
        <div class="admin-stat"><div class="admin-stat-val" id="statPending">—</div><div class="admin-stat-label">待审核 Pending</div></div>
        <div class="admin-stat"><div class="admin-stat-val" id="statApproved">—</div><div class="admin-stat-label">已批准 Approved</div></div>
        <div class="admin-stat"><div class="admin-stat-val" id="statRevenue">—</div><div class="admin-stat-label">收入 Revenue</div></div>
      </div>
      <button class="btn-logout" onclick="doLogout()">登出 Logout</button>
    </div>
  </div>
  <div class="admin-tabs">
    <div class="admin-tab active" data-tab="all" onclick="switchTab('all')">全部 All</div>
    <div class="admin-tab" data-tab="pending" onclick="switchTab('pending')">待审核 Pending</div>
    <div class="admin-tab" data-tab="approved" onclick="switchTab('approved')">已批准 Approved</div>
    <div class="admin-tab" data-tab="cancelled" onclick="switchTab('cancelled')">已取消 Cancelled</div>
  </div>
  <div class="admin-content">
    <div class="filter-bar">
      <div class="filter-group">
        <label>快速搜索:</label>
        <input type="text" class="filter-select" id="searchInput" placeholder="姓名 / 学号 / Ref..." style="min-width:200px;" oninput="applyFilters()">
      </div>
      <div class="reg-count" id="regCount">— 条记录</div>
    </div>
    <div class="reg-list" id="regList"><div class="loading">加载中...</div></div>
  </div>
</div>

<div class="img-modal" id="imgModal" onclick="this.classList.remove('active')">
  <img id="imgModalContent" src="" alt="Receipt">
</div>

<script src="/js/admin.js"></script>
</body>
</html>'''

with open('C:/Users/000/.openclaw/workspace/homecoming-2026/public/admin.html', 'w', encoding='utf-8') as f:
    f.write(content)
print('done')
