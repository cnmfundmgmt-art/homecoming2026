with open('C:/Users/000/.openclaw/workspace/homecoming-2026/public/checkin.html', 'r', encoding='utf-8') as f:
    content = f.read()

old = '''        const res = await fetch(`${API_BASE}/seats/checkin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refCode })
        });
        
        const result = await res.json();
        
        if (result.success) {
          let tableInfo = '';
          if (result.seat && result.seat.table_number) {
            tableInfo = `
              <div class="table-info">
                <div class="table-info-title">您的桌位 Your Table</div>
                <div class="table-number">第 ${result.seat.table_number} 桌</div>
              </div>
            `;
          }
          showResult('success', '🎉', '签到成功!', `Welcome! 欢迎回来!`, result.refCode || refCode, tableInfo);
        } else {
          showResult('error', '❌', result.message || '签到失败', 'Please try again or seek assistance from our volunteers.');
        }'''

new = '''        const res = await fetch(`${API_BASE}/checkin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refCode })
        });

        const result = await res.json();

        if (result.success) {
          let extra = '';
          if (result.totalSeats) {
            extra = `<div style="margin-top:0.75rem;color:#555;font-size:0.95rem;">共 ${result.totalSeats} 席 · 请到签到台领取您的姓名牌</div>`;
          }
          showResult('success', '🎉', '签到成功!', `Welcome, ${result.name || ''}! 欢迎回来!`, result.refCode, extra);
        } else {
          showResult('error', '❌', result.message || '签到失败', '请稍后重试或联系筹委会志愿者。');
        }'''

content = content.replace(old, new)

with open('C:/Users/000/.openclaw/workspace/homecoming-2026/public/checkin.html', 'w', encoding='utf-8') as f:
    f.write(content)
print('done')
