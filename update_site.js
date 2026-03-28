const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'public', 'index.html');
let html = fs.readFileSync(file, 'utf8');

// 1. Replace committee section
const cStart = html.indexOf('<!-- Committee Section -->');
const cEnd = html.indexOf('<!-- Fundraising Section -->');
const oldCommittee = html.substring(cStart, cEnd);
const newCommittee = `<!-- Committee Section -->
    <section id="committee" class="section committee-section">
      <div class="section-container">
        <div class="section-header">
          <h2 class="section-title">📋 筹委会 Committee</h2>
          <p class="section-subtitle">感谢筹委会全体成员 · Thanks to Our Organizing Team</p>
        </div>
        <div class="committee-table-wrap">
          <table class="committee-table">
            <thead>
              <tr>
                <th>组别 Group</th>
                <th>负责人 PIC</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>主席</td><td>Mar Win, Yizao</td></tr>
              <tr><td>秘书</td><td>Yizao, Mun Beng</td></tr>
              <tr><td>财政</td><td>Lek Kee, Shi Ling</td></tr>
              <tr><td>票务组</td><td>Kenny, Yizao</td></tr>
              <tr><td>宣传 / 设计 / 周边</td><td>Kang Yao, Hui Shien, Mun Beng, Aifen, Shze Been</td></tr>
              <tr><td>筹款组</td><td>Ah Kok, Lek Kee, Yizao, Mar Win, Kang Yao</td></tr>
              <tr><td>活动节目组</td><td>Ah Kok, Mar Win</td></tr>
              <tr><td>音响 / 技术组</td><td>（待定）</td></tr>
              <tr><td>膳食组</td><td>Hui Wen</td></tr>
              <tr><td>场地 / 主持</td><td>Mar Win, Aifen, Yizao</td></tr>
              <tr><td>摄影 / 摄像</td><td>友胜（负责人）</td></tr>
              <tr><td>联络组</td><td>（由宣传组延伸）</td></tr>
              <tr><td>老师代表</td><td>洁莹师, 嘉娴师</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- Fundraising Section -->`;
html = html.replace(oldCommittee, newCommittee);
console.log('Committee replaced');

fs.writeFileSync(file, html, 'utf8');
console.log('Done!');
