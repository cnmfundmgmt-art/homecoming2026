const express = require('express');
const session = require('express-session');
const TursoSessionStore = require('./TursoSessionStore');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const database = require('./database');

// ─── Cloudinary config ───────────────────────────────────────────────────────
let cloudinary = null;
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary = require('cloudinary').v2;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log('☁️  Cloudinary configured');
}

const app = express();
const PORT = process.env.PORT || 3000;

// DB ready flag — set true after database.init() completes
let dbReady = false;
const q = () => database.getQueries();

// ─── Middleware: hold requests until DB is ready ─────────────────────────────
app.use((req, res, next) => {
  if (dbReady) return next();
  res.set('Retry-After', '3');
  res.status(503).send('<h1>Starting up...</h1><p>Please retry in a few seconds.</p>');
});

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session — use TursoSessionStore in production, MemoryStore locally
const sessionTtl = 24 * 60 * 60 * 1000; // 24h
let sessionStore;
if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
  sessionStore = new TursoSessionStore({ ttl: sessionTtl / 1000 });
  console.log('📦 Session store: Turso (persistent)');
} else {
  const MemoryStore = require('express-session').MemoryStore;
  sessionStore = new MemoryStore();
  console.log('📦 Session store: Memory (local dev only)');
}
app.use(session({
  secret: process.env.SESSION_SECRET || 'homecoming2026-secret',
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: { maxAge: sessionTtl, httpOnly: true, sameSite: 'lax' }
}));

// ─── Receipt Upload Config ────────────────────────────────────────────────────
const receiptDir = path.join(__dirname, 'public', 'uploads', 'receipts');
if (!fs.existsSync(receiptDir)) fs.mkdirSync(receiptDir, { recursive: true });

const upload = multer({
  dest: receiptDir,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only image or PDF allowed'));
  }
});

// ─── Static Files ─────────────────────────────────────────────────────────────
app.use('/admin', (req, res) => res.redirect('/admin.html'));
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));

// Block /book.html when not in production (localhost dev uses local SQLite — disable to prevent confusion)
if (process.env.NODE_ENV !== 'production') {
  app.get('/book.html', (req, res) => {
    res.status(503).send('<h1>Registration temporarily unavailable</h1><p>Please use the homepage form at <a href="/">Home</a>.</p>');
  });
}

// ─── API: Student lookup ──────────────────────────────────────────────────────
app.get('/api/student/:id', async (req, res) => {
  try {
    const student = await q().getStudent(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student ID not found' });
    res.json({ success: true, student });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── API: Ticket & merch config ───────────────────────────────────────────────
app.get('/api/config', (req, res) => {
  res.json({
    tickets: q().TICKET_CONFIG,
    merchandise: q().MERCH_CONFIG,
    sponsorship: {
      goal: 500000,
      description: '清寒子弟助学金 — 每RM 42,000 赞助一位清寒子弟完成6年学业',
      currency: 'RM',
      perStudent: 42000
    }
  });
});

app.get('/api/sponsorship', async (req, res) => {
  try {
    const stats = await q().getStats();
    res.json({ success: true, raised: stats.revenue || 0, goal: 500000, per_student: 42000 });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── API: Create registration ─────────────────────────────────────────────────
// Supports both JSON (original) and multipart/form-data (new book.html)
app.post('/api/register', async (req, res) => {
  try {
    let { studentId, name, mobile, email, tickets, merchandise, donation } = req.body;

    // Support FormData: ticketType + ticketQty fields → build tickets array
    if (typeof tickets === 'undefined' && req.body.ticketType) {
      const tc = { single: { price: 200, seats: 1 }, table: { price: 1800, seats: 10 } };
      const tType = req.body.ticketType;
      const tQty  = parseInt(req.body.ticketQty) || 1;
      tickets = [{ type: tType, quantity: tQty }];

      // Support FormData: merchandise as JSON string
      if (req.body.merchandise) {
        try { merchandise = JSON.parse(req.body.merchandise); } catch {}
      }
      donation = parseInt(req.body.donation) || 0;
    }

    if (!name || !tickets || !tickets.length) {
      return res.status(400).json({ success: false, message: 'Name and at least one ticket required' });
    }

    // Log student ID if provided (name validation skipped — accept any name typed)
    if (studentId) {
      const student = await q().getStudent(studentId);
      if (student) {
        console.log('[Register] Student ID found:', studentId, '| Name typed:', name, '| DB name:', student.chinese_name);
      } else {
        console.log('[Register] Student ID not found:', studentId, '| Allowing open registration');
      }
    }

    const reg = await q().createRegistration({ studentId, name, mobile, email, tickets, merchandise, donation: donation || 0 });
    await q().logAudit('registration_created', 'registration', reg.id, null, { ref_code: reg.ref_code, name, mobile, ticket_types: tickets.map(t => t.type), total: reg.total_amount });
    console.log('[Register] success, regId:', reg?.id, 'ref:', reg?.ref_code);
    res.json({ success: true, registration: reg });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── API: Get registration by ID ───────────────────────────────────────────────
app.get('/api/registration/:id', async (req, res) => {
  try {
    const reg = await q().getRegistration(parseInt(req.params.id));
    if (!reg) return res.status(404).json({ success: false, message: 'Registration not found' });
    res.json({ success: true, registration: reg });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── API: Upload receipt ──────────────────────────────────────────────────────
app.post('/api/upload-receipt', upload.single('receipt'), async (req, res) => {
  try {
    console.log(`[UploadReceipt] body:`, JSON.stringify(req.body), `file:`, req.file ? `${req.file.originalname} (${req.file.size}b, path=${req.file.path})` : 'NONE');
    const regId = parseInt(req.body.registrationId);
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded - check formData field name matches "receipt"' });
    if (isNaN(regId)) return res.status(400).json({ success: false, message: 'Invalid registrationId: ' + req.body.registrationId });

    // Ensure file size is a finite number (Turso rejects NaN/Infinity)
    const fileSize = Number(req.file.size);
    const safeFileSize = Number.isFinite(fileSize) ? fileSize : 0;

    let url;
    if (cloudinary) {
      // Upload to Cloudinary
      if (!req.file.path || !fs.existsSync(req.file.path)) {
        return res.status(400).json({ success: false, message: 'Temp file missing, please retry' });
      }
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'homecoming-2026/receipts',
        public_id: `receipt_${regId}_${Date.now()}`,
        resource_type: 'auto',
      });
      url = result.secure_url;
      // Use Cloudinary's bytes as the authoritative file size
      const cloudinaryBytes = Number(result.bytes);
      console.log(`[UploadReceipt] Cloudinary: ${url}, bytes=${cloudinaryBytes}`);
      await q().uploadReceipt(regId, url, req.file.originalname, Number.isFinite(cloudinaryBytes) ? cloudinaryBytes : safeFileSize);
    } else {
      // Fallback: local disk
      const ext = path.extname(req.file.originalname).toLowerCase() || '.jpg';
      const safeName = `receipt_${regId}_${Date.now()}${ext}`;
      const savedPath = path.join(receiptDir, safeName);
      fs.renameSync(req.file.path, savedPath);
      url = `/uploads/receipts/${safeName}`;
      console.log(`[UploadReceipt] Local: ${url}, size=${safeFileSize}`);
      await q().uploadReceipt(regId, url, req.file.originalname, safeFileSize);
    }

    console.log(`[UploadReceipt] done`);

    await q().logAudit('receipt_uploaded', 'registration', regId, null, { filename: req.file.originalname, size: safeFileSize, url });
    res.json({ success: true, url, filename: url.split('/').pop() });
  } catch (err) {
    console.error('[UploadReceipt] ERROR:', err.message, err.stack);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Admin auth ───────────────────────────────────────────────────────────────
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'homecoming2026';

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.admin = true;
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

app.get('/api/admin/logout', (req, res) => {
  req.session.admin = null;
  res.json({ success: true });
});

function requireAdmin(req, res, next) {
  if (!req.session.admin) return res.status(401).json({ success: false, message: 'Unauthorized' });
  next();
}

// ─── Admin: Registrations ─────────────────────────────────────────────────────
app.get('/api/admin/registrations', requireAdmin, async (req, res) => {
  try {
    const status = req.query.status;
    let regs;
    if (status) regs = await q().getRegsByStatus(status);
    else regs = await q().getAllRegistrations();
    console.log('[Registrations] status=', status, 'count=', regs?.length || 0);
    res.json({ success: true, registrations: regs });
  } catch (err) { console.error('[Registrations] ERROR:', err.message); res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/admin/pending', requireAdmin, async (req, res) => {
  try {
    const regs = await q().getPendingRegistrations();
    res.json({ success: true, registrations: regs });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  try {
    console.log('[Stats] calling q().getStats()...');
    const stats = await q().getStats();
    console.log('[Stats] result:', JSON.stringify(stats));
    res.json({ success: true, stats });
  } catch (err) { console.error('[Stats] ERROR:', err.message); res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/admin/audit-logs', requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const offset = parseInt(req.query.offset) || 0;
    const targetType = req.query.target_type;
    const targetId = req.query.target_id ? parseInt(req.query.target_id) : null;

    let logs;
    if (targetType && targetId) {
      logs = await q().getAuditLogsByTarget(targetType, targetId);
    } else {
      logs = await q().getAuditLogs(limit, offset);
    }

    // Parse details JSON strings
    const parsed = logs.map(l => ({ ...l, details: l.details ? JSON.parse(l.details) : null }));
    res.json({ success: true, audit_logs: parsed, count: parsed.length });
  } catch (err) { console.error('[AuditLogs] ERROR:', err.message); res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/admin/registration/:id', requireAdmin, async (req, res) => {
  try {
    const reg = await q().getRegistration(parseInt(req.params.id));
    if (!reg) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, registration: reg });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.post('/api/admin/registration/:id/approve', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const reg = await q().getRegistration(id);
    if (!reg) return res.status(404).json({ success: false, message: 'Not found' });
    await q().updateStatus(id, 'approved');
    await q().logAudit('registration_approved', 'registration', id, 'admin', { ref_code: reg.ref_code, name: reg.name });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.post('/api/admin/registration/:id/cancel', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });
    console.log(`[Cancel] id=${id}, calling getRegistration...`);
    const reg = await q().getRegistration(id);
    console.log(`[Cancel] getRegistration returned:`, reg ? `id=${reg.id}, status=${reg.status}` : 'NULL');
    if (!reg) return res.status(404).json({ success: false, message: 'Not found' });
    console.log(`[Cancel] calling updateStatus(${id}, 'cancelled')...`);
    const result = await q().updateStatus(id, 'cancelled');
    await q().logAudit('registration_cancelled', 'registration', id, 'admin', { ref_code: reg.ref_code, name: reg.name });
    console.log(`[Cancel] updateStatus completed:`, result);
    res.json({ success: true });
  } catch (err) { console.error('[Cancel] ERROR:', err); res.status(500).json({ success: false, message: err.message }); }
});

// TEMP: diagnostic endpoint — remove after debugging
app.get('/api/admin/test-db', requireAdmin, async (req, res) => {
  try {
    const all = await q().getAllRegistrations();
    const stats = await q().getStats();
    res.json({ success: true, count: all.length, stats });
  } catch (err) { res.status(500).json({ success: false, message: err.message, stack: err.stack }); }
});

// ─── Check-in ─────────────────────────────────────────────────────────────────
app.post('/api/checkin', async (req, res) => {
  try {
    const { refCode } = req.body;
    if (!refCode) return res.status(400).json({ success: false, message: 'Reference code required' });

    const reg = await q().getRegistrationByRef(refCode);
    if (!reg) return res.json({ success: false, message: 'Reference code not found' });

    if (reg.status === 'pending') {
      return res.json({ success: false, message: 'Registration is pending approval. Please wait for committee confirmation.' });
    }
    if (reg.status === 'cancelled') {
      return res.json({ success: false, message: 'Registration has been cancelled. Please contact the committee.' });
    }
    if (reg.checked_in_at) {
      return res.json({ success: false, message: 'You have already checked in! 已签到。' });
    }

    await q().checkin(reg.id);
    await q().logAudit('checked_in', 'registration', reg.id, null, { ref_code: reg.ref_code });
    const updated = await q().getRegistration(reg.id);

    res.json({
      success: true,
      message: 'Check-in successful! 签到成功！',
      refCode: updated.ref_code,
      name: updated.name,
      totalSeats: updated.total_seats || 0,
      checkedInAt: new Date().toISOString()
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── Root → landing page ──────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── /book → new registration page ──────────────────────────────────
app.get('/book', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'book.html'));
});

// ─── Start ────────────────────────────────────────────────────────────────────
// Start the HTTP server immediately so Render's port health check passes
// without waiting for async DB init (Turso schema + student seeding takes time)
const server = app.listen(PORT, () => {
  console.log(`\n🏠 Homecoming 2026 starting on http://localhost:${PORT}`);
});

// Init DB in background — once complete, the server is fully ready
(async () => {
  try {
    await database.init();
    dbReady = true;
    console.log(`   ✅ Database ready — all systems go`);
    console.log(`   Landing Page:  http://localhost:${PORT}/`);
    console.log(`   Admin:        http://localhost:${PORT}/admin`);
    console.log(`   Check-in:     http://localhost:${PORT}/checkin\n`);
  } catch (err) {
    console.error(`   ❌ Database init failed: ${err.message}`);
  }
})();
