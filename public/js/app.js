// ========== Configuration ==========
const API_BASE = '/api';
const TARGET_DATE = new Date('2026-10-10T10:00:00+08:00');

// ========== DOM Elements ==========
const navbar = document.querySelector('.navbar');
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
const countdown = document.getElementById('countdown');
const registrationForm = document.getElementById('registrationForm');
const modalOverlay = document.getElementById('modalOverlay');
const modal = document.getElementById('modal');

// ========== Initialize App ==========
document.addEventListener('DOMContentLoaded', () => {
  // Check if we're on admin route
  if (window.location.pathname === '/admin') {
    initAdmin();
  } else {
    initMain();
  }
});

// ========== Main Site Functions ==========
function initMain() {
  initCountdown();
  initNavigation();
  initTicketSelection();
  initRegistrationForm();
  initAlumniDirectory();
  initFundraising();
  initModal();
  initScrollAnimations();
}

function initCountdown() {
  function updateCountdown() {
    const now = new Date();
    const diff = TARGET_DATE - now;

    if (diff <= 0) {
      document.getElementById('days').textContent = '000';
      document.getElementById('hours').textContent = '00';
      document.getElementById('minutes').textContent = '00';
      document.getElementById('seconds').textContent = '00';
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    document.getElementById('days').textContent = String(days).padStart(3, '0');
    document.getElementById('hours').textContent = String(hours).padStart(2, '0');
    document.getElementById('minutes').textContent = String(minutes).padStart(2, '0');
    document.getElementById('seconds').textContent = String(seconds).padStart(2, '0');
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);
}

function initNavigation() {
  // Mobile navigation toggle
  navToggle.addEventListener('click', () => {
    navToggle.classList.toggle('active');
    navLinks.classList.toggle('active');
  });

  // Close mobile nav when clicking a link
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navToggle.classList.remove('active');
      navLinks.classList.remove('active');
    });
  });

  // Navbar scroll effect
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }

    // Update active nav link
    updateActiveNavLink();
  });

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        const offset = 80;
        const targetPosition = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
}

function updateActiveNavLink() {
  const sections = document.querySelectorAll('section[id]');
  const scrollPos = window.scrollY + 150;

  sections.forEach(section => {
    const sectionTop = section.offsetTop;
    const sectionHeight = section.offsetHeight;
    const sectionId = section.getAttribute('id');
    const navLink = document.querySelector(`.nav-links a[href="#${sectionId}"]`);

    if (navLink) {
      if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
        document.querySelectorAll('.nav-links a').forEach(l => l.classList.remove('active'));
        navLink.classList.add('active');
      }
    }
  });
}

function initTicketSelection() {
  const ticketCards = document.querySelectorAll('.ticket-card');
  const selectedTicketInput = document.getElementById('selectedTicket');
  const selectedAmountInput = document.getElementById('selectedAmount');
  const totalAmountDisplay = document.getElementById('totalAmount');
  const attendeesSelect = document.querySelector('select[name="attendees"]');

  ticketCards.forEach(card => {
    card.addEventListener('click', () => {
      ticketCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');

      const ticketType = card.dataset.ticket;
      const price = parseInt(card.dataset.price);
      const attendees = parseInt(attendeesSelect.value);

      selectedTicketInput.value = ticketType;
      
      // Calculate total (family package is a flat rate for 4 people)
      let total = ticketType === 'family' ? price : price * attendees;
      selectedAmountInput.value = total;
      totalAmountDisplay.textContent = `RM ${total}`;
    });
  });

  // Update total when attendees change
  attendeesSelect.addEventListener('change', () => {
    const selectedCard = document.querySelector('.ticket-card.selected');
    if (selectedCard && selectedCard.dataset.ticket !== 'family') {
      const price = parseInt(selectedCard.dataset.price);
      const attendees = parseInt(attendeesSelect.value);
      const total = price * attendees;
      selectedAmountInput.value = total;
      totalAmountDisplay.textContent = `RM ${total}`;
    }
  });
}

function initRegistrationForm() {
  registrationForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Clear previous errors
    document.querySelectorAll('.form-error').forEach(err => err.classList.remove('visible'));
    document.querySelectorAll('.form-input.error').forEach(input => input.classList.remove('error'));

    // Get form data
    const formData = new FormData(registrationForm);
    const data = {
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      intakeYear: formData.get('intakeYear'),
      attendees: formData.get('attendees'),
      mealPreference: formData.get('mealPreference'),
      ticketType: formData.get('ticketType'),
      amountPaid: formData.get('amountPaid')
    };

    // Validate
    let hasError = false;

    if (!data.name.trim()) {
      showFieldError('input[name="name"]', '请输入姓名');
      hasError = true;
    }

    if (!data.email.trim() || !isValidEmail(data.email)) {
      showFieldError('input[name="email"]', '请输入有效的电子邮箱');
      hasError = true;
    }

    if (!data.phone.trim() || !isValidPhone(data.phone)) {
      showFieldError('input[name="phone"]', '请输入有效的电话号码');
      hasError = true;
    }

    if (!data.intakeYear) {
      showFieldError('select[name="intakeYear"]', '请选择入学年份');
      hasError = true;
    }

    if (hasError) return;

    // Submit
    try {
      const response = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (result.success) {
        showModal('success', '报名成功！Registration Successful!', 
          `感谢您报名参加Homecoming 2026！我们已发送确认邮件到 ${data.email}`);
        registrationForm.reset();
        // Reset ticket selection
        document.querySelectorAll('.ticket-card').forEach(c => c.classList.remove('selected'));
        document.querySelector('[data-ticket="early-bird"]').classList.add('selected');
        document.getElementById('selectedTicket').value = 'early-bird';
        document.getElementById('selectedAmount').value = '150';
        document.getElementById('totalAmount').textContent = 'RM 150';
      } else {
        showModal('error', '报名失败 Registration Failed', result.message);
      }
    } catch (error) {
      console.error('Registration error:', error);
      showModal('error', '报名失败 Registration Failed', '网络错误，请稍后重试 Network error, please try again.');
    }
  });
}

function showFieldError(selector, message) {
  const input = document.querySelector(selector);
  if (input) {
    input.classList.add('error');
    const errorEl = input.parentElement.querySelector('.form-error');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.add('visible');
    }
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  return /^[\d\s\-\+]{8,}$/.test(phone);
}

async function initAlumniDirectory() {
  const searchInput = document.getElementById('alumniSearch');
  const yearFilter = document.getElementById('yearFilter');
  const alumniGrid = document.getElementById('alumniGrid');

  let allAlumni = [];

  // Fetch alumni data
  try {
    const response = await fetch(`${API_BASE}/alumni`);
    allAlumni = await response.json();
    renderAlumni(allAlumni);
  } catch (error) {
    console.error('Error fetching alumni:', error);
    alumniGrid.innerHTML = '<div class="alumni-empty">无法加载校友数据<br>Unable to load alumni data</div>';
  }

  // Search handler with debounce
  let searchTimeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => filterAlumni(), 300);
  });

  // Year filter handler
  yearFilter.addEventListener('change', filterAlumni);

  function filterAlumni() {
    const searchTerm = searchInput.value.toLowerCase();
    const year = yearFilter.value;

    const filtered = allAlumni.filter(alumni => {
      const matchesSearch = !searchTerm || 
        alumni.name.toLowerCase().includes(searchTerm) ||
        alumni.englishName.toLowerCase().includes(searchTerm) ||
        alumni.class.toLowerCase().includes(searchTerm);
      
      const matchesYear = !year || alumni.graduationYear === parseInt(year);

      return matchesSearch && matchesYear;
    });

    renderAlumni(filtered);
  }

  function renderAlumni(alumni) {
    if (alumni.length === 0) {
      alumniGrid.innerHTML = '<div class="alumni-empty">没有找到匹配的校友<br>No matching alumni found</div>';
      return;
    }

    alumniGrid.innerHTML = alumni.map(a => `
      <div class="alumni-card">
        <div class="alumni-header">
          <div class="alumni-avatar">${a.name.charAt(0)}</div>
          <div>
            <div class="alumni-name">${a.name}</div>
            <div class="alumni-english">${a.englishName}</div>
          </div>
        </div>
        <div class="alumni-details">
          <span class="alumni-tag class">${a.class}</span>
          <span class="alumni-tag year">${a.graduationYear}届</span>
          <span class="alumni-tag">📍 ${a.currentLocation}</span>
        </div>
      </div>
    `).join('');
  }
}

function initFundraising() {
  const fundsRaised = document.getElementById('fundsRaised');
  const fundsPercent = document.getElementById('fundsPercent');
  const progressFill = document.getElementById('progressFill');
  const donateBtn = document.getElementById('donateBtn');

  // Simulate fundraising progress (in real app, fetch from API)
  let currentAmount = 125000; // Simulated
  const goal = 500000;
  const percent = Math.min((currentAmount / goal) * 100, 100);

  fundsRaised.textContent = `RM ${currentAmount.toLocaleString()}`;
  fundsPercent.textContent = `${percent.toFixed(1)}%`;

  // Animate progress bar
  setTimeout(() => {
    progressFill.style.width = `${percent}%`;
  }, 500);

  donateBtn.addEventListener('click', () => {
    showModal('info', '支付系统即将推出 Payment Gateway Coming Soon', 
      '感谢您的爱心！支付功能正在准备中，敬请期待。<br>Thank you for your generosity! Payment feature is being prepared.');
  });
}

function initModal() {
  const modalClose = document.getElementById('modalClose');
  
  modalClose.addEventListener('click', closeModal);
  
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

function showModal(type, title, message) {
  const modalIcon = document.getElementById('modalIcon');
  
  if (type === 'success') {
    modalIcon.textContent = '✓';
    modalIcon.style.background = 'linear-gradient(135deg, #4A7C59, #6B9B7A)';
  } else if (type === 'error') {
    modalIcon.textContent = '✕';
    modalIcon.style.background = 'linear-gradient(135deg, #C0392B, #E74C3C)';
  } else {
    modalIcon.textContent = 'ℹ';
    modalIcon.style.background = 'linear-gradient(135deg, var(--gold), var(--primary-red))';
  }

  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalMessage').innerHTML = message;
  
  modalOverlay.classList.add('active');
}

function closeModal() {
  modalOverlay.classList.remove('active');
}

function initScrollAnimations() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-fade-in');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Observe sections
  document.querySelectorAll('.section').forEach(section => {
    section.style.opacity = '0';
    section.style.transform = 'translateY(20px)';
    observer.observe(section);
  });

  // Observe cards
  document.querySelectorAll('.activity-card, .committee-card, .alumni-card, .fund-usage-card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    observer.observe(card);
  });
}

// ========== Admin Functions ==========
function initAdmin() {
  checkAdminAuth();
  initAdminLogin();
  initAdminActions();
}

async function checkAdminAuth() {
  try {
    const response = await fetch(`${API_BASE}/admin/status`);
    const data = await response.json();
    
    if (data.isAdmin) {
      showAdminPanel();
      loadAdminData();
    } else {
      showAdminLogin();
    }
  } catch (error) {
    console.error('Auth check error:', error);
    showAdminLogin();
  }
}

function showAdminLogin() {
  document.getElementById('adminLogin').style.display = 'flex';
  document.getElementById('adminPanel').style.display = 'none';
}

function showAdminPanel() {
  document.getElementById('adminLogin').style.display = 'none';
  document.getElementById('adminPanel').style.display = 'block';
  document.body.classList.add('admin-view');
}

function initAdminLogin() {
  const loginForm = document.getElementById('adminLoginForm');
  
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(loginForm);
    const username = formData.get('username');
    const password = formData.get('password');

    try {
      const response = await fetch(`${API_BASE}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const result = await response.json();

      if (result.success) {
        showAdminPanel();
        loadAdminData();
      } else {
        showModal('error', '登录失败 Login Failed', '用户名或密码错误<br>Invalid username or password');
      }
    } catch (error) {
      console.error('Login error:', error);
      showModal('error', '登录失败 Login Failed', '网络错误，请稍后重试 Network error');
    }
  });
}

function initAdminActions() {
  const logoutBtn = document.getElementById('logoutBtn');
  const exportBtn = document.getElementById('exportBtn');
  const searchBtn = document.getElementById('searchBtn');
  const adminSearchInput = document.getElementById('adminSearch');

  logoutBtn.addEventListener('click', async () => {
    try {
      await fetch(`${API_BASE}/admin/logout`, { method: 'POST' });
      showAdminLogin();
      document.body.classList.remove('admin-view');
    } catch (error) {
      console.error('Logout error:', error);
    }
  });

  exportBtn.addEventListener('click', () => {
    window.location.href = `${API_BASE}/admin/export`;
  });

  searchBtn.addEventListener('click', loadAdminData);
  
  adminSearchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') loadAdminData();
  });
}

async function loadAdminData() {
  const searchTerm = document.getElementById('adminSearch').value;
  
  try {
    // Load stats
    const statsResponse = await fetch(`${API_BASE}/stats`);
    const stats = await statsResponse.json();
    
    document.getElementById('statRegistrations').textContent = stats.total_registrations || 0;
    document.getElementById('statAttendees').textContent = stats.total_attendees || 0;
    document.getElementById('statRevenue').textContent = `RM ${(stats.total_revenue || 0).toLocaleString()}`;
    document.getElementById('statDonations').textContent = `RM ${(stats.totalDonations || 0).toLocaleString()}`;

    // Load registrations
    const url = searchTerm ? `${API_BASE}/registrations?search=${encodeURIComponent(searchTerm)}` : `${API_BASE}/registrations`;
    const regResponse = await fetch(url);
    const registrations = await regResponse.json();
    
    renderAdminTable(registrations);
  } catch (error) {
    console.error('Error loading admin data:', error);
  }
}

function renderAdminTable(registrations) {
  const tbody = document.getElementById('adminTableBody');
  
  if (!registrations || registrations.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="table-empty">暂无报名记录<br>No registration records</td></tr>';
    return;
  }

  tbody.innerHTML = registrations.map(r => {
    const ticketClass = r.ticket_type === 'early-bird' ? 'early-bird' : 
                        r.ticket_type === 'family' ? 'family' : 'standard';
    const ticketLabel = r.ticket_type === 'early-bird' ? '早鸟' : 
                        r.ticket_type === 'family' ? '家庭' : '标准';
    
    const date = new Date(r.created_at).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
      <tr>
        <td>${r.id}</td>
        <td><strong>${escapeHtml(r.name)}</strong></td>
        <td>${escapeHtml(r.email)}</td>
        <td>${escapeHtml(r.phone)}</td>
        <td>${escapeHtml(r.intake_year)}</td>
        <td><span class="table-attendees">${r.attendees}</span></td>
        <td><span class="table-ticket ${ticketClass}">${ticketLabel}</span></td>
        <td class="table-amount">RM ${r.amount_paid}</td>
        <td>${date}</td>
      </tr>
    `;
  }).join('');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
