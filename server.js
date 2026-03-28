const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { queries } = require('./database');
const QRCode = require('qrcode');

// Receipt upload config
const receiptDir = path.join(__dirname, 'public', 'uploads', 'receipts');
if (!fs.existsSync(receiptDir)) fs.mkdirSync(receiptDir, { recursive: true });
const upload = multer({
  dest: receiptDir,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only image or PDF allowed'));
  }
});

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'homecoming-2026-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// ========== BANK INFO ==========
const BANK = {
  bankName: 'Bank Islam Malaysia Berhad',
  bankNameShort: 'Bank Islam',
  accountName: 'PERSATUAN BEKAS MURID CHONG HWA KL',
  accountNumber: '1018 2120 1456',
  swiftCode: 'BIMBMYKL'
};

// ========== TICKET PRICES ==========
const TICKET_PRICES = {
  single: { name: '个人票 Single', price: 150, seats: 1 },
  family: { name: '家庭票 Family', price: 500, seats: 4 },
  table: { name: '包桌 Whole Table', price: 1500, seats: 10 }
};

const MERCHANDISE = {
  tshirt: { name: 'T-Shirt', price: 50, sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] }
};

const DONATION_PRESETS = [100, 200, 500, 1000];

// ========== REF CODE ==========
function generateRefCode(studentId) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 6; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
  return studentId ? `${studentId}-${suffix}` : `HC26-${suffix}`;
}

// ========== PUBLIC APIs ==========

// Config for frontend
app.get('/api/config', (req, res) => {
  res.json({
    ticketPrices: TICKET_PRICES,
    merchandise: MERCHANDISE,
    donationPresets: DONATION_PRESETS,
    bank: BANK
  });
});

// Student lookup
app.get('/api/student/:studentId', (req, res) => {
  const { studentId } = req.params;
  const student = queries.getStudent(studentId);
  
  if (!student) {
    return res.json({ found: false, studentId });
  }

  // Get latest registration for this student
  const registration = queries.getRegistrationByStudent(studentId);
  
  res.json({
    found: true,
    studentId: student.student_id,
    chineseName: student.chinese_name,
    registration: registration ? {
      id: registration.id,
      status: registration.status,
      ticketType: registration.ticket_type,
      attendees: registration.attendees
    } : null
  });
});

// List all students
app.get('/api/students', (req, res) => {
  const students = queries.getAllStudents();
  res.json({ success: true, students });
});

// Create new registration
app.post('/api/register', (req, res) => {
  const { studentId, name, email, phone, intakeYear, ticketType, attendees } = req.body;

  if (!name || !ticketType) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  const ticket = TICKET_PRICES[ticketType];
  if (!ticket) {
    return res.status(400).json({ success: false, message: 'Invalid ticket type' });
  }

  // Auto-add student to students table if provided
  if (studentId && name) {
    const existing = queries.getStudent(studentId);
    if (!existing) {
      queries.insertStudent(studentId, name);
    }
  }

  const seats = ticket.seats;
  const registration = queries.createRegistration({
    studentId, name, email, phone, intakeYear,
    ticketType, attendees: seats
  });

  // Create seats (unassigned to table initially)
  queries.createSeats(registration.id, studentId, seats);

  res.json({
    success: true,
    registration,
    ticket,
    bank: BANK
  });
});

// Add donation to registration
app.post('/api/registration/:id/donation', (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;

  const reg = queries.getRegistration(id);
  if (!reg) return res.status(404).json({ success: false, message: 'Registration not found' });

  const donation = queries.addDonation(parseInt(id), parseFloat(amount));
  const newTotal = (reg.amount_paid || 0) + parseFloat(amount);
  queries.updateAmount(parseInt(id), newTotal);

  res.json({ success: true, donation, newTotal });
});

// Add merchandise
app.post('/api/registration/:id/merchandise', (req, res) => {
  const { id } = req.params;
  const { itemType, size, quantity } = req.body;

  const reg = queries.getRegistration(id);
  if (!reg) return res.status(404).json({ success: false, message: 'Registration not found' });

  const price = MERCHANDISE[itemType]?.price || 0;
  const merch = queries.addMerchandise(parseInt(id), itemType, size, parseInt(quantity), price);
  
  const newTotal = (reg.amount_paid || 0) + (price * quantity);
  queries.updateAmount(parseInt(id), newTotal);

  res.json({ success: true, merchandise: merch, newTotal });
});

// Get registration details
app.get('/api/registration/:id', (req, res) => {
  const { id } = req.params;
  const reg = queries.getRegistration(parseInt(id));
  if (!reg) return res.status(404).json({ success: false, message: 'Not found' });

  const seats = queries.getSeatsByRegistration(parseInt(id));
  const donations = queries.getDonationsByRegistration(parseInt(id));
  const merchandise = queries.getMerchandiseByRegistration(parseInt(id));

  res.json({
    success: true,
    registration: reg,
    seats,
    donations,
    merchandise,
    ticketInfo: TICKET_PRICES[reg.ticket_type]
  });
});

// Get QR code for payment (just bank info display, no real payment gateway)
app.get('/api/registration/:id/payment', (req, res) => {
  const { id } = req.params;
  const reg = queries.getRegistration(parseInt(id));
  if (!reg) return res.status(404).json({ success: false, message: 'Not found' });

  const total = reg.amount_paid || TICKET_PRICES[reg.ticket_type].price;
  const refCode = generateRefCode(reg.student_id);

  const qrString = JSON.stringify({
    ref: refCode,
    bank: BANK.bankNameShort,
    acc: BANK.accountNumber,
    name: BANK.accountName,
    amount: total,
    currency: 'MYR'
  });

  QRCode.toDataURL(qrString, { width: 280, margin: 2 })
    .then(qrDataUrl => {
      res.json({
        success: true,
        refCode,
        qrDataUrl,
        total,
        bank: BANK,
        registration: {
          id: reg.id,
          name: reg.name,
          ticketType: reg.ticket_type
        }
      });
    });
});

// ========== ADMIN APIs ==========

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'homecoming2026') {
    req.session.isAdmin = true;
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

app.post('/api/admin/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/admin/status', (req, res) => {
  res.json({ isAdmin: req.session.isAdmin || false });
});

function requireAdmin(req, res, next) {
  if (!req.session.isAdmin) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
}

// Get all registrations (admin)
app.get('/api/admin/registrations', requireAdmin, (req, res) => {
  const { status } = req.query;
  const registrations = status 
    ? queries.getRegistrationsByStatus(status)
    : queries.getAllRegistrations();
  res.json({ success: true, registrations });
});

// Update registration status (admin: confirm/cancel)
app.post('/api/admin/registration/:id/status', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['pending', 'completed', 'cancelled'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  const reg = queries.getRegistration(parseInt(id));
  if (!reg) return res.status(404).json({ success: false, message: 'Not found' });

  queries.updateStatus(parseInt(id), status);

  // If cancelled, free up seats
  if (status === 'cancelled') {
    queries.assignSeatsToTable(parseInt(id), null);
  }

  res.json({ success: true, message: `Status updated to ${status}` });
});

// Public stats (no auth needed)
app.get('/api/public/stats', (req, res) => {
  try {
    const stats = queries.getStats();
    res.json({ success: true, stats: { ...stats, fundraisingGoal: 500000 } });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// Get stats (admin)
app.get('/api/admin/stats', requireAdmin, (req, res) => {
  res.json({ success: true, stats: queries.getStats() });
});

// Get all tables with seat info (admin)
app.get('/api/admin/tables', requireAdmin, (req, res) => {
  const tables = queries.getAllTablesWithSeats();
  res.json({ success: true, tables });
});

// Get single table details (admin)
app.get('/api/admin/table/:tableNumber', requireAdmin, (req, res) => {
  const { tableNumber } = req.params;
  const table = queries.getTableWithSeats(parseInt(tableNumber));
  if (!table) return res.status(404).json({ success: false, message: 'Table not found' });

  const seats = queries.getSeatsByTable(parseInt(tableNumber));
  res.json({ success: true, table, seats });
});

// Assign seats to table (admin or student after paid)
app.post('/api/assign-table', (req, res) => {
  const { registrationId, tableNumber } = req.body;

  const reg = queries.getRegistration(parseInt(registrationId));
  if (!reg) return res.status(404).json({ success: false, message: 'Registration not found' });

  if (reg.status !== 'completed') {
    return res.status(400).json({ success: false, message: 'Payment not completed yet' });
  }

  // Check table capacity
  const seats = queries.getSeatsByRegistration(parseInt(registrationId));
  const seatCount = seats.length;
  const currentBooked = queries.getAvailableSeatsInTable(parseInt(tableNumber));
  
  const table = queries.getTable(parseInt(tableNumber));
  if (currentBooked.count + seatCount > table.capacity) {
    return res.status(400).json({ 
      success: false, 
      message: `Table ${tableNumber} only has ${table.capacity - currentBooked.count} seats available`
    });
  }

  queries.assignSeatsToTable(parseInt(registrationId), parseInt(tableNumber));

  res.json({ success: true, message: `Assigned ${seatCount} seats to Table ${tableNumber}` });
});

// Get available tables (for student booking)
app.get('/api/available-tables', (req, res) => {
  const allTables = queries.getAllTablesWithSeats();
  const available = allTables.map(t => ({
    tableNumber: t.table_number,
    capacity: t.capacity,
    bookedSeats: t.booked_seats || 0,
    availableSeats: t.capacity - (t.booked_seats || 0),
    seatInfo: t.seat_info || null
  })).filter(t => t.availableSeats > 0);

  res.json({ success: true, tables: available });
});

// Bulk import students
app.post('/api/admin/students/bulk', requireAdmin, (req, res) => {
  const { students } = req.body;
  if (!Array.isArray(students)) {
    return res.status(400).json({ success: false, message: 'Expected students array' });
  }

  let inserted = 0;
  for (const { studentId, chineseName } of students) {
    if (studentId && chineseName) {
      queries.insertStudent(studentId, chineseName);
      inserted++;
    }
  }
  res.json({ success: true, inserted });
});

// Export CSV
app.get('/api/admin/export', requireAdmin, (req, res) => {
  const regs = queries.getAllRegistrations();
  const headers = ['ID', 'Student ID', 'Name', 'Email', 'Phone', 'Intake Year', 'Ticket Type', 'Seats', 'Amount', 'Status', 'Date'];
  const rows = regs.map(r => [
    r.id, r.student_id || '', `"${r.name}"`, r.email || '', r.phone || '', 
    r.intake_year || '', r.ticket_type, r.attendees, r.amount_paid, r.status, r.created_at
  ].join(','));
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=registrations.csv');
  res.send([headers.join(','), ...rows].join('\n'));
});

// ========== RECEIPT UPLOAD ==========
app.post('/api/upload-receipt', upload.single('receipt'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
  const regId = parseInt(req.body.registrationId) || 0;
  const ext = path.extname(req.file.originalname) || '.jpg';
  const savedName = `receipt_${regId}_${Date.now()}${ext}`;
  const savedPath = path.join(receiptDir, savedName);
  fs.renameSync(req.file.path, savedPath);
  const url = `/uploads/receipts/${savedName}`;
  console.log(`Receipt uploaded for reg ${regId}: ${url}`);
  res.json({ success: true, url, filename: savedName });
});

// ========== STATIC PAGES ==========
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/book', (req, res) => res.sendFile(path.join(__dirname, 'public', 'book.html')));

app.listen(PORT, () => {
  console.log(`\n🏠 Homecoming 2026 running on http://localhost:${PORT}`);
  console.log(`   Admin: http://localhost:${PORT}/admin`);
  console.log(`   Book:  http://localhost:${PORT}/book\n`);
});
