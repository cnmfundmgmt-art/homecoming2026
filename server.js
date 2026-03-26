const express = require('express');
const session = require('express-session');
const path = require('path');
const { queries } = require('./database');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
  secret: 'homecoming-2026-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Load alumni data
const alumniData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'alumni.json'), 'utf8'));

// ========== API ROUTES ==========

// Get alumni list
app.get('/api/alumni', (req, res) => {
  const { search, year } = req.query;
  let results = alumniData;

  if (search) {
    const searchLower = search.toLowerCase();
    results = results.filter(alumni => 
      alumni.name.toLowerCase().includes(searchLower) ||
      alumni.class.includes(searchLower)
    );
  }

  if (year) {
    results = results.filter(alumni => alumni.graduationYear === parseInt(year));
  }

  res.json(results);
});

// Submit registration
app.post('/api/register', (req, res) => {
  const { name, email, phone, intakeYear, attendees, mealPreference, ticketType, amountPaid } = req.body;

  // Validation
  if (!name || !email || !phone || !intakeYear || !ticketType) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: 'Invalid email format' });
  }

  // Validate phone format (basic)
  const phoneRegex = /^[\d\s\-\+]{8,}$/;
  if (!phoneRegex.test(phone)) {
    return res.status(400).json({ success: false, message: 'Invalid phone format' });
  }

  try {
    const registration = queries.createRegistration({
      name, email, phone, intakeYear, attendees: parseInt(attendees) || 1,
      mealPreference: mealPreference || 'no_preference',
      ticketType, amountPaid: parseFloat(amountPaid) || 0
    });

    res.json({ success: true, message: 'Registration successful!', data: registration });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
  }
});

// Get all registrations (admin only)
app.get('/api/registrations', (req, res) => {
  if (!req.session.isAdmin) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const { search } = req.query;
  
  try {
    const registrations = search 
      ? queries.searchRegistrations(search)
      : queries.getAllRegistrations();
    res.json(registrations);
  } catch (error) {
    console.error('Error fetching registrations:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch registrations' });
  }
});

// Get statistics (admin only)
app.get('/api/stats', (req, res) => {
  if (!req.session.isAdmin) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const stats = queries.getStats();
    const totalDonations = queries.getTotalDonations();
    res.json({
      ...stats,
      totalDonations,
      fundraisingGoal: 500000
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch statistics' });
  }
});

// Admin login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;

  if (username === 'admin' && password === 'homecoming2026') {
    req.session.isAdmin = true;
    res.json({ success: true, message: 'Login successful' });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

// Admin logout
app.post('/api/admin/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true, message: 'Logged out successfully' });
});

// Check admin auth status
app.get('/api/admin/status', (req, res) => {
  res.json({ isAdmin: req.session.isAdmin || false });
});

// Export registrations to CSV (admin only)
app.get('/api/admin/export', (req, res) => {
  if (!req.session.isAdmin) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const registrations = queries.getAllRegistrations();
    
    // CSV header
    const headers = ['ID', 'Name', 'Email', 'Phone', 'Intake Year', 'Attendees', 'Meal Preference', 'Ticket Type', 'Amount Paid', 'Date'];
    
    // CSV rows
    const rows = registrations.map(r => [
      r.id,
      `"${r.name}"`,
      r.email,
      r.phone,
      r.intake_year,
      r.attendees,
      r.meal_preference,
      r.ticket_type,
      r.amount_paid,
      r.created_at
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=registrations.csv');
    res.send(csv);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ success: false, message: 'Export failed' });
  }
});

// ========== PAGE ROUTES ==========

// Main SPA
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Admin panel
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║     🏠 Homecoming 2026 - 回家吃饭                        ║
║     20th Anniversary Alumni Reunion                      ║
║                                                          ║
║     Server running at: http://localhost:${PORT}            ║
║     Admin panel at:    http://localhost:${PORT}/admin      ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
  `);
});
