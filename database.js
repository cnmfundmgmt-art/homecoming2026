const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'homecoming.db');
const db = new Database(dbPath);

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    intake_year TEXT NOT NULL,
    attendees INTEGER NOT NULL DEFAULT 1,
    meal_preference TEXT DEFAULT 'no_preference',
    ticket_type TEXT NOT NULL,
    amount_paid REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS donations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    amount REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ref_code TEXT UNIQUE NOT NULL,
    registration_data TEXT NOT NULL,
    amount REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL
  );
`);

// Prepared statements for performance
const statements = {
  insertRegistration: db.prepare(`
    INSERT INTO registrations (name, email, phone, intake_year, attendees, meal_preference, ticket_type, amount_paid)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `),

  getAllRegistrations: db.prepare(`
    SELECT * FROM registrations ORDER BY created_at DESC
  `),

  getRegistrationById: db.prepare(`
    SELECT * FROM registrations WHERE id = ?
  `),

  getStats: db.prepare(`
    SELECT 
      COUNT(*) as total_registrations,
      COALESCE(SUM(attendees), 0) as total_attendees,
      COALESCE(SUM(amount_paid), 0) as total_revenue,
      COUNT(DISTINCT intake_year) as intake_count
    FROM registrations
  `),

  searchRegistrations: db.prepare(`
    SELECT * FROM registrations 
    WHERE name LIKE ? OR email LIKE ? OR phone LIKE ?
    ORDER BY created_at DESC
  `),

  insertDonation: db.prepare(`
    INSERT INTO donations (name, amount) VALUES (?, ?)
  `),

  getTotalDonations: db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM donations
  `),

  insertPayment: db.prepare(`
    INSERT INTO payments (ref_code, registration_data, amount, status, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `),

  getPaymentByRef: db.prepare(`
    SELECT * FROM payments WHERE ref_code = ?
  `),

  updatePaymentStatus: db.prepare(`
    UPDATE payments SET status = ? WHERE ref_code = ?
  `),

  getExpiredPayments: db.prepare(`
    SELECT * FROM payments WHERE status = 'pending' AND expires_at < datetime('now')
  `)
};

// Helper functions
const queries = {
  // Create a new registration
  createRegistration(data) {
    const { name, email, phone, intakeYear, attendees, mealPreference, ticketType, amountPaid } = data;
    const result = statements.insertRegistration.run(
      name, email, phone, intakeYear, attendees, mealPreference, ticketType, amountPaid
    );
    return { id: result.lastInsertRowid, ...data };
  },

  // Get all registrations
  getAllRegistrations() {
    return statements.getAllRegistrations.all();
  },

  // Get registration by ID
  getRegistrationById(id) {
    return statements.getRegistrationById.get(id);
  },

  // Get registration statistics
  getStats() {
    return statements.getStats.get();
  },

  // Search registrations
  searchRegistrations(term) {
    const searchTerm = `%${term}%`;
    return statements.searchRegistrations.all(searchTerm, searchTerm, searchTerm);
  },

  // Record a donation
  recordDonation(name, amount) {
    const result = statements.insertDonation.run(name, amount);
    return { id: result.lastInsertRowid, name, amount };
  },

  // Get total donations
  getTotalDonations() {
    return statements.getTotalDonations.get().total;
  },

  // Create a payment record
  createPayment(refCode, registrationData, amount) {
    const expiresAt = new Date(Date.now() + 100 * 1000).toISOString(); // 100 seconds
    const result = statements.insertPayment.run(
      refCode, JSON.stringify(registrationData), amount, 'pending', expiresAt
    );
    return { id: result.lastInsertRowid, ref_code: refCode, amount, status: 'pending', expires_at: expiresAt };
  },

  // Get payment by ref code
  getPaymentByRef(refCode) {
    return statements.getPaymentByRef.get(refCode);
  },

  // Update payment status
  updatePaymentStatus(refCode, status) {
    return statements.updatePaymentStatus.run(status, refCode);
  }
};

module.exports = { db, queries };
