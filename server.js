const express = require('express');
const session = require('express-session');
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

// Lazy query accessor — queries are only accessed after init() completes
const q = () => database.getQueries();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session
app.use(session({
  secret: 'homecoming2026-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
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

// ─── API: Student lookup ──────────────────────────────────────────────────────
app.get('/api/student/:id', (req, res) => {
  const student = q().getStudent(req.params.id);
  if (!student) return res.status(404).json({ success: false, message: 'Student ID not found' });
  res.json({ success: true, student });
});

// ─── API: Ticket & merch config ───────────────────────────────────────────────
app.get('/api/config', (req, res) => {
  res.json({
    tickets: q().TICKET_CONFIG,
    merchandise: q().MERCH_CONFIG
  });
});

// ─── API: Create registration ─────────────────────────────────────────────────
app.post('/api/register', async (req, res) => {
  try {
    const { studentId, name, mobile, email, intakeYear, tickets, merchandise } = req.body;

    if (!name || !tickets || !tickets.length) {
      return res.status(400).json({ success: false, message: 'Name and at least one ticket required' });
    }

    // Validate student ID if provided
    if (studentId) {
      const student = await q().getStudent(studentId);
      if (!student) return res.status(404).json({ success: false, message: 'Student ID not found in database' });
      if (student.chinese_name !== name) {
        return res.status(400).json({ success: false, message: 'Name does not match student ID' });
      }
    }

    const reg = await q().createRegistration({ studentId, name, mobile, email, intakeYear, tickets, merchandise });
    res.json({ success: true, registration: reg });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── API: Get registration by ID ───────────────────────────────────────────────
app.get('/api/registration/:id', (req, res) => {
  const reg = q().getRegistration(parseInt(req.params.id));
  if (!reg) return res.status(404).json({ success: false, message: 'Registration not found' });
  res.json({ success: true, registration: reg });
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
    res.json({ success: true, registrations: regs });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/admin/pending', requireAdmin, async (req, res) => {
  try {
    const regs = await q().getPendingRegistrations();
    res.json({ success: true, registrations: regs });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  try {
    const stats = await q().getStats();
    res.json({ success: true, stats });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
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
app.post('/api/checkin', (req, res) => {
  const { refCode } = req.body;
  if (!refCode) return res.status(400).json({ success: false, message: 'Reference code required' });

  const reg = db.prepare(`SELECT * FROM registrations WHERE ref_code = ?`).get(refCode);
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

  db.prepare(`UPDATE registrations SET checked_in_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(reg.id);

  const tickets = db.prepare(`SELECT * FROM tickets WHERE registration_id = ?`).all(reg.id);
  const totalSeats = tickets.reduce((sum, t) => sum + (t.seats || 0), 0);

  res.json({
    success: true,
    message: 'Check-in successful! 签到成功！',
    refCode: reg.ref_code,
    name: reg.name,
    totalSeats,
    checkedInAt: new Date().toISOString()
  });
});

// ─── Root → index.html (landing page with embedded booking form) ─────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── /book → redirect to landing page ───────────────────────────────────────
app.get('/book', (req, res) => {
  res.redirect('/');
  return;
});

// ─── Start ────────────────────────────────────────────────────────────────────
(async () => {
// --- Start ---
app.listen(PORT, async () => {
  await database.init();
  console.log("\n🏠 Homecoming 2026 running on http://localhost:" + PORT);
  console.log("   Landing Page:  http://localhost:" + PORT + "/");
  console.log("   Admin:        http://localhost:" + PORT + "/admin");
  console.log("   Check-in:     http://localhost:" + PORT + "/checkin\n");
});
})();
