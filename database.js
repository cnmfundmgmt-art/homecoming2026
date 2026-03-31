/**
 * database.js
 * Auto-detects: local SQLite (default) or Turso cloud (when env vars present)
 */
const path = require('path');
const Database = require('better-sqlite3');

const TURSO_URL    = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN  = process.env.TURSO_AUTH_TOKEN;

const TICKET_CONFIG = {
  single: { price: 200, seats: 1,  label: '单人票 Single' },
  family: { price: 800, seats: 4,  label: '家庭票 Family' },
  table:  { price: 1800, seats: 10, label: '桌席 Table' }
};
const MERCH_CONFIG = {
  tshirt:   { price: 60, label: 'T-恤 T-shirt', sizes: ['S','M','L','XL','XXL'] },
  tumbler:  { price: 50, label: '保温瓶 Tumbler', sizes: null }
};

// ─── Local SQLite setup ───────────────────────────────────────────────────────
let db;
function initLocal() {
  const dbPath = path.join(__dirname, 'homecoming.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS students (
      student_id TEXT PRIMARY KEY,
      chinese_name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS registrations (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      ref_code    TEXT    UNIQUE NOT NULL,
      student_id  TEXT,
      name        TEXT    NOT NULL,
      mobile      TEXT,
      email       TEXT,
      intake_year TEXT,
      status      TEXT    DEFAULT 'pending'   CHECK(status IN ('pending','approved','cancelled')),
      total_amount REAL   DEFAULT 0,
      receipt_path TEXT,
      receipt_uploaded_at DATETIME,
      checked_in_at DATETIME,
      notes       TEXT,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS tickets (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      registration_id INTEGER NOT NULL,
      ticket_type     TEXT    NOT NULL         CHECK(ticket_type IN ('single','family','table')),
      quantity        INTEGER DEFAULT 1,
      unit_price      REAL    NOT NULL,
      seats           INTEGER NOT NULL,
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (registration_id) REFERENCES registrations(id)
    );
    CREATE TABLE IF NOT EXISTS merchandise (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      registration_id INTEGER NOT NULL,
      item_type       TEXT    NOT NULL,
      size            TEXT,
      quantity        INTEGER DEFAULT 1,
      unit_price      REAL    NOT NULL,
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (registration_id) REFERENCES registrations(id)
    );
    CREATE TABLE IF NOT EXISTS receipts (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      registration_id INTEGER NOT NULL UNIQUE,
      file_path       TEXT    NOT NULL,
      file_name       TEXT,
      file_size       INTEGER,
      uploaded_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (registration_id) REFERENCES registrations(id)
    );
  `);
  return db;
}

// ─── Query API (local sync — for server.js) ───────────────────────────────────
function buildLocalQueries(db) {
  const stmts = {
    getStudent:        db.prepare(`SELECT * FROM students WHERE student_id = ?`),
    insertStudent:     db.prepare(`INSERT OR IGNORE INTO students (student_id, chinese_name) VALUES (?, ?)`),
    getAllStudents:    db.prepare(`SELECT * FROM students`),
    insertReg:         db.prepare(`INSERT INTO registrations (ref_code, student_id, name, mobile, email, intake_year, status, total_amount) VALUES (@ref_code, @student_id, @name, @mobile, @email, @intake_year, 'pending', @total_amount)`),
    getReg:            db.prepare(`SELECT * FROM registrations WHERE id = ?`),
    getRegByRef:       db.prepare(`SELECT * FROM registrations WHERE ref_code = ?`),
    getRegByStudent:   db.prepare(`SELECT * FROM registrations WHERE student_id = ? ORDER BY id DESC LIMIT 1`),
    updateRegStatus:   db.prepare(`UPDATE registrations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`),
    updateRegReceipt:  db.prepare(`UPDATE registrations SET receipt_path = ?, receipt_uploaded_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`),
    getAllRegs:        db.prepare(`SELECT * FROM registrations ORDER BY created_at DESC`),
    getPendingRegs:    db.prepare(`SELECT * FROM registrations WHERE status = 'pending' ORDER BY created_at DESC`),
    getApprovedRegs:   db.prepare(`SELECT * FROM registrations WHERE status = 'approved' ORDER BY updated_at DESC`),
    getStats:          db.prepare(`SELECT COUNT(*) as total, COUNT(*) FILTER(WHERE status='pending') as pending, COUNT(*) FILTER(WHERE status='approved') as approved, COUNT(*) FILTER(WHERE status='cancelled') as cancelled, COALESCE(SUM(total_amount) FILTER(WHERE status='approved'),0) as revenue FROM registrations`),
    insertTicket:      db.prepare(`INSERT INTO tickets (registration_id, ticket_type, quantity, unit_price, seats) VALUES (?, ?, ?, ?, ?)`),
    getTicketsByReg:   db.prepare(`SELECT * FROM tickets WHERE registration_id = ?`),
    insertMerch:       db.prepare(`INSERT INTO merchandise (registration_id, item_type, size, quantity, unit_price) VALUES (?, ?, ?, ?, ?)`),
    getMerchByReg:     db.prepare(`SELECT * FROM merchandise WHERE registration_id = ?`),
    insertReceipt:     db.prepare(`INSERT INTO receipts (registration_id, file_path, file_name, file_size) VALUES (?, ?, ?, ?)`),
    getReceiptByReg:   db.prepare(`SELECT * FROM receipts WHERE registration_id = ?`),
    getRefCounter:     db.prepare(`SELECT ref_code FROM registrations ORDER BY id DESC LIMIT 1`),
  };

  let _refCounter = null;
  function nextRef() {
    if (_refCounter === null) {
      const row = stmts.getRefCounter.get();
      _refCounter = row ? parseInt(row.ref_code.replace('HOME', ''), 10) : 0;
    }
    return 'HOME' + String(++_refCounter).padStart(4, '0');
  }

  function enrich(r) {
    const tickets = stmts.getTicketsByReg.all(r.id);
    const merch = stmts.getMerchByReg.all(r.id);
    const receipt = stmts.getReceiptByReg.get(r.id);
    const total_seats = tickets.reduce((s, t) => s + t.seats, 0);
    return { ...r, tickets, merchandise: merch, receipt: receipt || null, total_seats };
  }

  return {
    TICKET_CONFIG,
    MERCH_CONFIG,

    getStudent:           (id)  => stmts.getStudent.get(id),
    getAllStudents:       ()   => stmts.getAllStudents.all(),

    createRegistration:   ({ studentId, name, mobile, email, intakeYear, tickets, merchandise }) => {
      let total = 0;
      for (const t of tickets) total += TICKET_CONFIG[t.type].price * t.quantity;
      for (const m of merchandise) total += MERCH_CONFIG[m.item].price * m.quantity;
      const refCode = nextRef();
      const res = stmts.insertReg.run({ ref_code: refCode, student_id: studentId||null, name, mobile: mobile||null, email: email||null, intake_year: intakeYear||null, total_amount: total });
      const regId = res.lastInsertRowid;
      const ticketRows = tickets.map(t => {
        const cfg = TICKET_CONFIG[t.type];
        const r = stmts.insertTicket.run(regId, t.type, t.quantity, cfg.price, cfg.seats * t.quantity);
        return { id: r.lastInsertRowid, ...t, unitPrice: cfg.price, seats: cfg.seats * t.quantity };
      });
      const merchRows = merchandise.map(m => {
        const price = MERCH_CONFIG[m.item].price;
        const r = stmts.insertMerch.run(regId, m.item, m.size||null, m.quantity, price);
        return { id: r.lastInsertRowid, ...m, unitPrice: price };
      });
      return { id: regId, ref_code: refCode, name, mobile, email, tickets: ticketRows, merchandise: merchRows, total_amount: total, status: 'pending', created_at: new Date().toISOString() };
    },

    getRegistration:      (id) => { const r = stmts.getReg.get(id); return r ? enrich(r) : null; },
    getRegistrationByRef: (ref) => { const r = stmts.getRegByRef.get(ref); return r ? enrich(r) : null; },
    getRegistrationByStudent: (sid) => { const r = stmts.getRegByStudent.get(sid); return r ? enrich(r) : null; },

    updateStatus:         (id, status) => stmts.updateRegStatus.run(status, id),
    uploadReceipt:        (id, fp, fn, fs) => { stmts.updateRegReceipt.run(fp, id); return stmts.insertReceipt.run(id, fp, fn, fs); },

    getAllRegistrations:     () => stmts.getAllRegs.all().map(enrich),
    getPendingRegistrations: () => stmts.getPendingRegs.all().map(enrich),
    getApprovedRegistrations: () => {
      const approved = stmts.getApprovedRegs.all();
      return approved.map(r => {
        const tickets = stmts.getTicketsByReg.all(r.id);
        const merch = stmts.getMerchByReg.all(r.id);
        return { ...r, tickets, merchandise: merch };
      });
    },

    getStats: () => {
      const s = stmts.getStats.get();
      const approved = stmts.getApprovedRegs.all().map(r => {
        const tickets = stmts.getTicketsByReg.all(r.id);
        return { ...r, tickets };
      });
      const approvedSeats = approved.reduce((sum, r) => sum + r.tickets.reduce((s, t) => s + t.seats, 0), 0);
      return { ...s, approved_seats: approvedSeats };
    }
  };
}

// ─── Turso async wrapper ─────────────────────────────────────────────────────
function buildTursoQueries(turso) {
  const tGetAll = (sql, args = []) => turso.execute({ sql, args }).then(r => r.rows);
  const tGetOne = (sql, args = []) => tGetAll(sql, args).then(rows => rows[0] || null);
  const tRun = (sql, args = []) => turso.execute({ sql, args }).then(r => ({ lastInsertRowid: r.lastInsertRowid, changes: r.changes }));

  let _refCounter = null;
  function nextRef() {
    if (_refCounter === null) {
      return tGetOne(`SELECT ref_code FROM registrations ORDER BY id DESC LIMIT 1`).then(row => {
        _refCounter = row ? parseInt(row.ref_code.replace('HOME', ''), 10) : 0;
        return 'HOME' + String(++_refCounter).padStart(4, '0');
      });
    }
    return Promise.resolve('HOME' + String(++_refCounter).padStart(4, '0'));
  }

  async function enrich(r) {
    const [tickets, merch, receipt] = await Promise.all([
      tGetAll(`SELECT * FROM tickets WHERE registration_id = ?`, [r.id]),
      tGetAll(`SELECT * FROM merchandise WHERE registration_id = ?`, [r.id]),
      tGetOne(`SELECT * FROM receipts WHERE registration_id = ?`, [r.id]),
    ]);
    const total_seats = tickets.reduce((s, t) => s + t.seats, 0);
    return { ...r, tickets, merchandise: merch, receipt: receipt || null, total_seats };
  }

  return {
    TICKET_CONFIG,
    MERCH_CONFIG,

    getStudent:           (id)  => tGetOne(`SELECT * FROM students WHERE student_id = ?`, [id]),
    getAllStudents:       ()   => tGetAll(`SELECT * FROM students`),

    async createRegistration({ studentId, name, mobile, email, intakeYear, tickets, merchandise }) {
      let total = 0;
      for (const t of tickets) total += TICKET_CONFIG[t.type].price * t.quantity;
      for (const m of merchandise) total += MERCH_CONFIG[m.item].price * m.quantity;
      const refCode = await nextRef();
      const res = await tRun(
        `INSERT INTO registrations (ref_code, student_id, name, mobile, email, intake_year, status, total_amount) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
        [refCode, studentId||null, name, mobile||null, email||null, intakeYear||null, total]
      );
      const regId = res.lastInsertRowid;
      const ticketRows = await Promise.all(tickets.map(async t => {
        const cfg = TICKET_CONFIG[t.type];
        const r = await tRun(`INSERT INTO tickets (registration_id, ticket_type, quantity, unit_price, seats) VALUES (?, ?, ?, ?, ?)`,
          [regId, t.type, t.quantity, cfg.price, cfg.seats * t.quantity]);
        return { id: r.lastInsertRowid, ...t, unitPrice: cfg.price, seats: cfg.seats * t.quantity };
      }));
      const merchRows = await Promise.all(merchandise.map(async m => {
        const price = MERCH_CONFIG[m.item].price;
        const r = await tRun(`INSERT INTO merchandise (registration_id, item_type, size, quantity, unit_price) VALUES (?, ?, ?, ?, ?)`,
          [regId, m.item, m.size||null, m.quantity, price]);
        return { id: r.lastInsertRowid, ...m, unitPrice: price };
      }));
      return { id: regId, ref_code: refCode, name, mobile, email, tickets: ticketRows, merchandise: merchRows, total_amount: total, status: 'pending', created_at: new Date().toISOString() };
    },

    getRegistration:      (id)  => tGetOne(`SELECT * FROM registrations WHERE id = ?`, [id]).then(r => r ? enrich(r) : null),
    getRegistrationByRef: (ref) => tGetOne(`SELECT * FROM registrations WHERE ref_code = ?`, [ref]).then(r => r ? enrich(r) : null),
    getRegistrationByStudent: (sid) => tGetOne(`SELECT * FROM registrations WHERE student_id = ? ORDER BY id DESC LIMIT 1`, [sid]).then(r => r ? enrich(r) : null),

    updateStatus:         (id, status) => tRun(`UPDATE registrations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [status, id]),
    uploadReceipt:        (id, fp, fn, fs) => Promise.all([
      tRun(`UPDATE registrations SET receipt_path = ?, receipt_uploaded_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [fp, id]),
      tRun(`INSERT INTO receipts (registration_id, file_path, file_name, file_size) VALUES (?, ?, ?, ?)`, [id, fp, fn, fs])
    ]).then(() => ({ lastInsertRowid: id })),

    getAllRegistrations:     () => tGetAll(`SELECT * FROM registrations ORDER BY created_at DESC`).then(rs => Promise.all(rs.map(enrich))),
    getPendingRegistrations: () => tGetAll(`SELECT * FROM registrations WHERE status = 'pending' ORDER BY created_at DESC`).then(rs => Promise.all(rs.map(enrich))),
    getApprovedRegistrations: () => tGetAll(`SELECT * FROM registrations WHERE status = 'approved' ORDER BY updated_at DESC`).then(rs => Promise.all(rs.map(enrich))),

    async getStats() {
      const s = await tGetOne(`SELECT COUNT(*) as total, COUNT(*) FILTER(WHERE status='pending') as pending, COUNT(*) FILTER(WHERE status='approved') as approved, COUNT(*) FILTER(WHERE status='cancelled') as cancelled, COALESCE(SUM(total_amount) FILTER(WHERE status='approved'),0) as revenue FROM registrations`);
      const approved = await this.getApprovedRegistrations();
      const approvedSeats = approved.reduce((sum, r) => sum + (r.total_seats || 0), 0);
      return { ...s, approved_seats: approvedSeats };
    }
  };
}

// ─── Init & export ────────────────────────────────────────────────────────────
let _queries;
let _isTurso = false;

async function initAsync() {
  if (TURSO_URL && TURSO_TOKEN) {
    console.log(`☁️  Turso cloud: ${TURSO_URL}`);
    const { createClient } = require('@libsql/client');
    const turso = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
    // Create schema on Turso
    await turso.executeMultiple(`
      CREATE TABLE IF NOT EXISTS students (student_id TEXT PRIMARY KEY, chinese_name TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS registrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT, ref_code TEXT UNIQUE NOT NULL, student_id TEXT, name TEXT NOT NULL,
        mobile TEXT, email TEXT, intake_year TEXT, status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','cancelled')),
        total_amount REAL DEFAULT 0, receipt_path TEXT, receipt_uploaded_at DATETIME, checked_in_at DATETIME, notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT, registration_id INTEGER NOT NULL, ticket_type TEXT NOT NULL CHECK(ticket_type IN ('single','family','table')),
        quantity INTEGER DEFAULT 1, unit_price REAL NOT NULL, seats INTEGER NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (registration_id) REFERENCES registrations(id)
      );
      CREATE TABLE IF NOT EXISTS merchandise (
        id INTEGER PRIMARY KEY AUTOINCREMENT, registration_id INTEGER NOT NULL, item_type TEXT NOT NULL,
        size TEXT, quantity INTEGER DEFAULT 1, unit_price REAL NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (registration_id) REFERENCES registrations(id)
      );
      CREATE TABLE IF NOT EXISTS receipts (
        id INTEGER PRIMARY KEY AUTOINCREMENT, registration_id INTEGER NOT NULL UNIQUE, file_path TEXT NOT NULL,
        file_name TEXT, file_size INTEGER, uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (registration_id) REFERENCES registrations(id)
      );
    `);
    _queries = buildTursoQueries(turso);
    _isTurso = true;
  } else {
    console.log('💾 Local SQLite database');
    const localDb = initLocal();
    _queries = buildLocalQueries(localDb);
    _isTurso = false;
  }
}

// Synchronous queries object used by server.js
// After initAsync() resolves, _queries is populated
const queries = new Proxy({}, {
  get(_, prop) {
    if (!_queries) throw new Error('database.initAsync() must be called before using queries');
    return _queries[prop];
  }
});

module.exports = { init: initAsync, queries, isTurso: () => _isTurso };
