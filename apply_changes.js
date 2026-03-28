const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'public', 'index.html');
let html = fs.readFileSync(file, 'utf8');

console.log('File length:', html.length);
console.log('Has 3步完成:', html.includes('3步完成'));
console.log('Has Book Table:', html.includes('Book Table'));
console.log('Has committee-table:', html.includes('committee-table'));
console.log('Has 清寒子弟:', html.includes('清寒子弟'));
console.log('Has openstreetmap:', html.includes('openstreetmap'));

// 1. Remove "3步完成" subtitle from register section
if (html.includes('3步完成')) {
  html = html.replace(/<p class="section-subtitle">3步完成[^<]*<[^<]*<a[^>]*>立即报名<\/a>/,
    '<p class="section-subtitle">请填写以下信息完成报名<\/p>\n          <a');
  console.log('1. Removed 3步完成 subtitle');
} else {
  console.log('1. 3步完成 not found - skipping');
}

// 2. Replace committee cards with table
const cStart = html.indexOf('<!-- Committee Section -->');
const cEnd = html.indexOf('<!-- Fundraising Section -->');
if (cStart > 0 && cEnd > 0) {
  const oldCom = html.substring(cStart, cEnd);
  const newCom = `<!-- Committee Section -->
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
  html = html.replace(oldCom, newCom);
  console.log('2. Replaced committee section with table');
} else {
  console.log('2. Committee section boundaries not found');
}

// 3. Replace fundraising section
const fStart = html.indexOf('<!-- Fundraising Section -->');
const fEnd = html.indexOf('<!-- Alumni Directory Section -->');
if (fStart > 0 && fEnd > 0) {
  const oldFund = html.substring(fStart, fEnd);
  const newFund = `<!-- Fundraising Section -->
    <section id="fundraising" class="section fundraising-section">
      <div class="section-container">
        <div class="section-header">
          <h2 class="section-title">💝 清寒子弟资助计划</h2>
          <p class="section-subtitle">您的善心，让清寒子弟也能完成学业梦想</p>
        </div>
        <div class="fundraising-content">
          <div class="fundraising-intro">
            <p>吉隆坡中华独立中学向来坚持"有教无类"的办学精神，每年帮助无数家境清寒的学生完成学业。此募款旨在资助清寒子弟，让他们能安心上学，追逐梦想。</p>
          </div>
          <div class="fundraising-progress">
            <div class="progress-header">
              <div>
                <div class="progress-amount" id="fundsRaised">RM 0</div>
                <div class="progress-goal">目标 Goal: RM 500,000</div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 1.5rem; font-weight: 700; color: var(--gold);" id="fundsPercent">0%</div>
                <div style="font-size: 0.85rem; color: var(--warm-gray);">已筹得 Achieved</div>
              </div>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" id="progressFill"></div>
            </div>
            <div class="progress-stats">
              <span>已筹得 Raised</span>
              <span>目标 Target: RM 500,000</span>
            </div>
          </div>
          <div class="fund-usage-grid">
            <div class="fund-usage-card">
              <div class="fund-usage-icon">🎓</div>
              <h4>RM 42,000 / 年</h4>
              <p>6位清寒子弟资助<br>Student Sponsorship</p>
            </div>
            <div class="fund-usage-card">
              <div class="fund-usage-icon">📖</div>
              <h4>每生 RM 7,000 / 年</h4>
              <p>助学金包括学费、住宿、餐食<br>Tuition, Stay & Meals</p>
            </div>
            <div class="fund-usage-card">
              <div class="fund-usage-icon">❤️</div>
              <h4>让爱延续</h4>
              <p>您的善心，改变一个孩子的命运<br>Your Kindness Changes Lives</p>
            </div>
          </div>
          <div class="fundraising-cta">
            <p>欲捐款请联络筹委会秘书处 · For donations, please contact the Committee Secretariat</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Alumni Directory Section -->`;
  html = html.replace(oldFund, newFund);
  console.log('3. Replaced fundraising section with 清寒子弟 content');
} else {
  console.log('3. Fundraising section boundaries not found, fStart:', fStart, 'fEnd:', fEnd);
}

// 4. Fix Google Maps - replace openstreetmap with Google embed
if (html.includes('openstreetmap')) {
  html = html.replace(
    /src="https:\/\/www\.openstreetmap\.org\/export\/embed\.html\?bbox=[^"]+"/,
    'src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3983.5336!2d101.6865818!3d3.1899123!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31cc48753045c3a7%3A0xb2cdc18d05d5e95b!2sChong%20Hwa%20Private%20High%20School!5e0!3m2!1sen!2smy!4v1700000000000!5m2!1sen!2smy&hl=en"'
  );
  console.log('4. Fixed Google Maps embed');
} else {
  console.log('4. openstreetmap not found');
}

// 5. Add CSS for committee-table-wrap and fundraising intro/cta
const committeeTableCSS = `
    .committee-table-wrap { overflow-x: auto; border-radius: 12px; box-shadow: var(--shadow); }
    .committee-table { width: 100%; border-collapse: collapse; background: white; font-size: 1rem; }
    .committee-table th { background: var(--primary-red); color: white; padding: 1rem 1.5rem; text-align: left; font-weight: 600; font-size: 1.05rem; white-space: nowrap; }
    .committee-table td { padding: 0.875rem 1.5rem; border-bottom: 1px solid var(--light-gray); color: var(--dark-text); }
    .committee-table tr:last-child td { border-bottom: none; }
    .committee-table tr:hover td { background: rgba(139, 35, 35, 0.04); }
    .committee-table td:first-child { font-weight: 600; color: var(--primary-red); white-space: nowrap; }
    .fundraising-intro { background: white; border-radius: 16px; padding: 1.5rem 2rem; margin-bottom: 2rem; box-shadow: var(--shadow); text-align: center; font-size: 1.05rem; color: var(--dark-text); line-height: 1.8; border-left: 5px solid var(--gold); }
    .fundraising-intro p { max-width: 700px; margin: 0 auto; }
    .fundraising-cta { text-align: center; margin-top: 2rem; padding: 1rem; background: rgba(139, 35, 35, 0.05); border-radius: 12px; }
    .fundraising-cta p { margin: 0; color: var(--warm-gray); font-size: 0.95rem; }
`;

// Add before </style> in the inline style section
const styleEnd = html.lastIndexOf('</style>');
if (styleEnd > 0) {
  html = html.slice(0, styleEnd) + committeeTableCSS + '\n' + html.slice(styleEnd);
  console.log('5. Added committee table CSS');
} else {
  console.log('5. </style> not found');
}

fs.writeFileSync(file, html, 'utf8');
console.log('\nAll changes applied! File written.');
console.log('Has committee-table:', html.includes('committee-table'));
console.log('Has 清寒子弟:', html.includes('清寒子弟'));
console.log('Has openstreetmap:', html.includes('openstreetmap'));
console.log('Has 光前堂:', html.includes('光前堂'));
