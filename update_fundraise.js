const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'public', 'index.html');
let html = fs.readFileSync(file, 'utf8');

// Find fundraising section (between <!-- Fundraising Section --> and <!-- Alumni Directory Section -->)
const fStart = html.indexOf('<!-- Fundraising Section -->');
const fEnd = html.indexOf('<!-- Alumni Directory Section -->');
const oldFund = html.substring(fStart, fEnd);
console.log('Old fundraising length:', fEnd - fStart);

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
              <div class="progress-amount" id="fundsRaised">RM 0</div>
              <div class="progress-goal">目标 Goal: RM 500,000</div>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" id="progressFill"></div>
            </div>
            <div class="progress-stats">
              <span id="fundsPercent">0%</span>
              <span>已筹得 Raised</span>
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
fs.writeFileSync(file, html, 'utf8');
console.log('Fundraising replaced, file written');
