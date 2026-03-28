const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'homecoming.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS students (
    student_id TEXT PRIMARY KEY,
    chinese_name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    intake_year TEXT,
    ticket_type TEXT NOT NULL,
    attendees INTEGER NOT NULL DEFAULT 1,
    status TEXT DEFAULT 'pending',
    amount_paid REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS seats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    registration_id INTEGER NOT NULL,
    student_id TEXT,
    seat_number INTEGER NOT NULL,
    table_number INTEGER,
    checked_in INTEGER DEFAULT 0,
    checked_in_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (registration_id) REFERENCES registrations(id)
  );

  CREATE TABLE IF NOT EXISTS tables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_number INTEGER UNIQUE NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 10,
    status TEXT DEFAULT 'available',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS donations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    registration_id INTEGER,
    amount REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (registration_id) REFERENCES registrations(id)
  );

  CREATE TABLE IF NOT EXISTS merchandise (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    registration_id INTEGER,
    item_type TEXT NOT NULL,
    size TEXT,
    quantity INTEGER DEFAULT 1,
    unit_price REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (registration_id) REFERENCES registrations(id)
  );
`);

// Initialize 40 tables
const initTables = db.prepare(`INSERT OR IGNORE INTO tables (table_number, capacity) VALUES (?, 10)`);
for (let i = 1; i <= 40; i++) initTables.run(i);

// Prepared statements
const stmts = {
  // Students
  getStudent: db.prepare(`SELECT * FROM students WHERE student_id = ?`),
  insertStudent: db.prepare(`INSERT OR IGNORE INTO students (student_id, chinese_name) VALUES (?, ?)`),
  getAllStudents: db.prepare(`SELECT * FROM students`),

  // Registrations
  insertReg: db.prepare(`
    INSERT INTO registrations (student_id, name, email, phone, intake_year, ticket_type, attendees, status, amount_paid)
    VALUES (@student_id, @name, @email, @phone, @intake_year, @ticket_type, @attendees, @status, @amount_paid)
  `),
  getReg: db.prepare(`SELECT * FROM registrations WHERE id = ?`),
  getRegByStudent: db.prepare(`SELECT * FROM registrations WHERE student_id = ? ORDER BY id DESC LIMIT 1`),
  updateRegStatus: db.prepare(`UPDATE registrations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`),
  updateRegAmount: db.prepare(`UPDATE registrations SET amount_paid = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`),
  getAllRegs: db.prepare(`SELECT * FROM registrations ORDER BY created_at DESC`),
  getPendingRegs: db.prepare(`SELECT * FROM registrations WHERE status = 'pending' ORDER BY created_at DESC`),
  getCompletedRegs: db.prepare(`SELECT * FROM registrations WHERE status = 'completed' ORDER BY created_at DESC`),
  getRegsByStatus: db.prepare(`SELECT * FROM registrations WHERE status = ? ORDER BY created_at DESC`),

  // Seats
  insertSeat: db.prepare(`
    INSERT INTO seats (registration_id, student_id, seat_number, table_number)
    VALUES (@registration_id, @student_id, @seat_number, @table_number)
  `),
  getSeatsByReg: db.prepare(`SELECT * FROM seats WHERE registration_id = ?`),
  getSeatsByStudent: db.prepare(`SELECT s.*, r.ticket_type FROM seats s JOIN registrations r ON s.registration_id = r.id WHERE s.student_id = ? ORDER BY s.id DESC`),
  updateSeatTable: db.prepare(`UPDATE seats SET table_number = ? WHERE registration_id = ?`),
  getSeatsByTable: db.prepare(`SELECT s.*, r.name, r.ticket_type FROM seats s JOIN registrations r ON s.registration_id = r.id WHERE s.table_number = ? ORDER BY s.seat_number`),
  getAvailableSeatsInTable: db.prepare(`SELECT COUNT(*) as count FROM seats WHERE table_number = ?`),
  getTableSeatsCount: db.prepare(`
    SELECT t.table_number, t.capacity, COUNT(s.id) as booked
    FROM tables t
    LEFT JOIN seats s ON t.table_number = s.table_number AND s.checked_in = 1
    GROUP BY t.table_number
  `),

  // Tables
  getAllTables: db.prepare(`SELECT * FROM tables ORDER BY table_number`),
  getTable: db.prepare(`SELECT * FROM tables WHERE table_number = ?`),
  getTableWithSeats: db.prepare(`
    SELECT t.*, 
      (SELECT COUNT(*) FROM seats WHERE table_number = t.table_number AND checked_in = 1) as checked_in,
      (SELECT GROUP_CONCAT(student_id || ' (' || cnt || ' seats)') FROM (
        SELECT student_id, COUNT(*) as cnt FROM seats WHERE table_number = t.table_number GROUP BY student_id
      )) as seat_info
    FROM tables t WHERE t.table_number = ?
  `),
  getAllTablesWithSeats: db.prepare(`
    SELECT t.*,
      (SELECT COUNT(*) FROM seats WHERE table_number = t.table_number) as booked_seats,
      (SELECT GROUP_CONCAT(student_id || ':' || cnt) FROM (
        SELECT student_id, COUNT(*) as cnt FROM seats WHERE table_number = t.table_number GROUP BY student_id
      )) as seat_info
    FROM tables t ORDER BY t.table_number
  `),

  // Donations
  insertDonation: db.prepare(`INSERT INTO donations (registration_id, amount) VALUES (?, ?)`),
  getDonationsByReg: db.prepare(`SELECT * FROM donations WHERE registration_id = ?`),

  // Merchandise
  insertMerch: db.prepare(`INSERT INTO merchandise (registration_id, item_type, size, quantity, unit_price) VALUES (?, ?, ?, ?, ?)`),
  getMerchByReg: db.prepare(`SELECT * FROM merchandise WHERE registration_id = ?`),

  // Stats
  getStats: db.prepare(`
    SELECT 
      COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
      COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
      COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
      COALESCE(SUM(amount_paid) FILTER (WHERE status = 'completed'), 0) as total_revenue
    FROM registrations
  `),
  getSeatsStats: db.prepare(`
    SELECT 
      (SELECT COUNT(*) FROM seats WHERE checked_in = 1) as checked_in,
      (SELECT COUNT(*) FROM seats) as total_seats
  `)
};

const queries = {
  // Students
  getStudent(studentId) {
    return stmts.getStudent.get(studentId);
  },
  insertStudent(studentId, chineseName) {
    return stmts.insertStudent.run(studentId, chineseName);
  },
  getAllStudents() {
    return stmts.getAllStudents.all();
  },

  // Registrations
  createRegistration(data) {
    const result = stmts.insertReg.run({
      student_id: data.studentId || null,
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      intake_year: data.intakeYear || null,
      ticket_type: data.ticketType,
      attendees: data.attendees || 1,
      status: 'pending',
      amount_paid: 0
    });
    return { id: result.lastInsertRowid, ...data, status: 'pending' };
  },
  getRegistration(id) {
    return stmts.getReg.get(id);
  },
  getRegistrationByStudent(studentId) {
    return stmts.getRegByStudent.get(studentId);
  },
  updateStatus(id, status) {
    return stmts.updateRegStatus.run(status, id);
  },
  updateAmount(id, amount) {
    return stmts.updateRegAmount.run(amount, id);
  },
  getAllRegistrations() {
    return stmts.getAllRegs.all();
  },
  getPendingRegistrations() {
    return stmts.getPendingRegs.all();
  },
  getCompletedRegistrations() {
    return stmts.getCompletedRegs.all();
  },
  getRegistrationsByStatus(status) {
    return stmts.getRegsByStatus.all(status);
  },

  // Seats
  createSeats(registrationId, studentId, count, tableNumber = null) {
    const seats = [];
    for (let i = 1; i <= count; i++) {
      const r = stmts.insertSeat.run({
        registration_id: registrationId,
        student_id: studentId,
        seat_number: i,
        table_number: tableNumber
      });
      seats.push({ id: r.lastInsertRowid, seat_number: i, table_number: tableNumber });
    }
    return seats;
  },
  getSeatsByRegistration(registrationId) {
    return stmts.getSeatsByReg.all(registrationId);
  },
  getSeatsByStudent(studentId) {
    return stmts.getSeatsByStudent.all(studentId);
  },
  assignSeatsToTable(registrationId, tableNumber) {
    return stmts.updateSeatTable.run(tableNumber, registrationId);
  },
  getSeatsByTable(tableNumber) {
    return stmts.getSeatsByTable.all(tableNumber);
  },
  getAvailableSeatsInTable(tableNumber) {
    return stmts.getAvailableSeatsInTable.get(tableNumber);
  },
  getTableSeatsCount() {
    return stmts.getTableSeatsCount.all();
  },

  // Tables
  getAllTables() {
    return stmts.getAllTables.all();
  },
  getTable(tableNumber) {
    return stmts.getTable.get(tableNumber);
  },
  getTableWithSeats(tableNumber) {
    return stmts.getTableWithSeats.get(tableNumber);
  },
  getAllTablesWithSeats() {
    return stmts.getAllTablesWithSeats.all();
  },

  // Donations
  addDonation(registrationId, amount) {
    const r = stmts.insertDonation.run(registrationId, amount);
    return { id: r.lastInsertRowid, amount };
  },
  getDonationsByRegistration(registrationId) {
    return stmts.getDonationsByReg.all(registrationId);
  },

  // Merchandise
  addMerchandise(registrationId, itemType, size, quantity, unitPrice) {
    const r = stmts.insertMerch.run(registrationId, itemType, size, quantity, unitPrice);
    return { id: r.lastInsertRowid, itemType, size, quantity, unitPrice };
  },
  getMerchandiseByRegistration(registrationId) {
    return stmts.getMerchByReg.all(registrationId);
  },

  // Stats
  getStats() {
    const regStats = stmts.getStats.get();
    const seatsStats = stmts.getSeatsStats.get();
    return { ...regStats, ...seatsStats };
  }
};

module.exports = { db, queries };
