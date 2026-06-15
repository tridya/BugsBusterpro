const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static(__dirname)); // Serve HTML files

// ============================================================
// DATABASE SETUP
// ============================================================
const db = new Database('database.db');

// Aktifkan foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Buat semua tabel jika belum ada
db.exec(`
  CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    password TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS admins (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS technicians (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT NOT NULL,
    password TEXT NOT NULL,
    specialties TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS pest_types (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS service_bookings (
    id TEXT PRIMARY KEY,
    booking_number TEXT UNIQUE NOT NULL,
    customer_id TEXT NOT NULL,
    pest_type_id TEXT NOT NULL,
    service_date TEXT NOT NULL,
    service_time TEXT NOT NULL,
    address TEXT NOT NULL,
    notes TEXT,
    status TEXT DEFAULT 'PENDING',
    priority TEXT DEFAULT 'NORMAL',
    admin_notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (pest_type_id) REFERENCES pest_types(id)
  );

  CREATE TABLE IF NOT EXISTS service_assignments (
    id TEXT PRIMARY KEY,
    booking_id TEXT UNIQUE NOT NULL,
    technician_id TEXT NOT NULL,
    assigned_by TEXT,
    assigned_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (booking_id) REFERENCES service_bookings(id),
    FOREIGN KEY (technician_id) REFERENCES technicians(id)
  );

  CREATE TABLE IF NOT EXISTS service_reports (
    id TEXT PRIMARY KEY,
    booking_id TEXT UNIQUE NOT NULL,
    technician_id TEXT NOT NULL,
    pest_type_id TEXT,
    arrival_time TEXT,
    completion_time TEXT,
    action_taken TEXT NOT NULL,
    materials_used TEXT,
    treated_area TEXT NOT NULL,
    photo_evidence TEXT,
    service_status TEXT NOT NULL,
    follow_up_date TEXT,
    technician_notes TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (booking_id) REFERENCES service_bookings(id),
    FOREIGN KEY (technician_id) REFERENCES technicians(id)
  );

  CREATE TABLE IF NOT EXISTS feedbacks (
    id TEXT PRIMARY KEY,
    booking_id TEXT UNIQUE NOT NULL,
    customer_id TEXT NOT NULL,
    rating INTEGER NOT NULL,
    feedback TEXT,
    complaint TEXT,
    suggestions TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (booking_id) REFERENCES service_bookings(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  );
`);

// ============================================================
// SEED DATA (dijalankan hanya jika data belum ada)
// ============================================================
function seedData() {
  const adminCount = db.prepare('SELECT COUNT(*) as count FROM admins').get();
  if (adminCount.count > 0) return; // Sudah ada data, skip

  console.log('🌱 Seeding initial data...');

  const adminPassword = bcrypt.hashSync('admin123', 10);
  db.prepare(`INSERT INTO admins (id, name, email, password) VALUES (?, ?, ?, ?)`)
    .run('admin-001', 'Super Admin', 'admin@bugbuster.com', adminPassword);

  const techPassword = bcrypt.hashSync('tech123', 10);
  db.prepare(`INSERT INTO technicians (id, name, email, phone, password, specialties) VALUES (?, ?, ?, ?, ?, ?)`)
    .run('tech-001', 'Budi Santoso', 'budi@bugbuster.com', '081234567890', techPassword, 'Termites,Rodents');
  db.prepare(`INSERT INTO technicians (id, name, email, phone, password, specialties) VALUES (?, ?, ?, ?, ?, ?)`)
    .run('tech-002', 'Siti Rahayu', 'siti@bugbuster.com', '081234567891', techPassword, 'Mosquitoes,Cockroaches');
  db.prepare(`INSERT INTO technicians (id, name, email, phone, password, specialties) VALUES (?, ?, ?, ?, ?, ?)`)
    .run('tech-003', 'Andi Wijaya', 'andi@bugbuster.com', '081234567892', techPassword, 'Bed Bugs,Ants');

  const pestTypes = [
    ['pest-001', 'Termites', 'Rayap kayu dan tanah'],
    ['pest-002', 'Cockroaches', 'Kecoa dan serangga dapur'],
    ['pest-003', 'Mosquitoes', 'Nyamuk dan vektor penyakit'],
    ['pest-004', 'Rodents', 'Tikus got dan atap'],
    ['pest-005', 'Bed Bugs', 'Kutu kasur dan tempat tidur'],
    ['pest-006', 'Ants', 'Semut dan kutu daun'],
  ];
  const insertPest = db.prepare(`INSERT INTO pest_types (id, name, description) VALUES (?, ?, ?)`);
  pestTypes.forEach(p => insertPest.run(...p));

  console.log('✅ Seed data berhasil!');
  console.log('');
  console.log('🔐 Akun Default:');
  console.log('   Admin    : admin@bugbuster.com / admin123');
  console.log('   Teknisi  : budi@bugbuster.com / tech123');
  console.log('             siti@bugbuster.com / tech123');
  console.log('             andi@bugbuster.com / tech123');
}

seedData();

// ============================================================
// HELPER
// ============================================================
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// ============================================================
// ROUTES - SERVE HTML PAGES
// ============================================================
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/technician', (req, res) => res.sendFile(path.join(__dirname, 'technician.html')));

// ============================================================
// API - AUTH
// ============================================================

// Register customer
app.post('/api/auth/customer/register', (req, res) => {
  const { name, email, phone, address, password } = req.body;
  if (!name || !email || !phone || !address || !password) {
    return res.status(400).json({ error: 'Semua field harus diisi' });
  }
  try {
    const existing = db.prepare('SELECT id FROM customers WHERE email = ?').get(email);
    if (existing) return res.status(400).json({ error: 'Email sudah terdaftar' });

    const hashed = bcrypt.hashSync(password, 10);
    const id = generateId();
    db.prepare(`INSERT INTO customers (id, name, email, phone, address, password) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(id, name, email, phone, address, hashed);
    res.json({ message: 'Registrasi berhasil' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal registrasi' });
  }
});

// Login customer
app.post('/api/auth/customer/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email dan password wajib diisi' });

  const customer = db.prepare('SELECT * FROM customers WHERE email = ?').get(email);
  if (!customer || !bcrypt.compareSync(password, customer.password)) {
    return res.status(401).json({ error: 'Email atau password salah' });
  }
  const { password: _, ...safeCustomer } = customer;
  res.json({ customer: safeCustomer });
});

// Login admin
app.post('/api/auth/admin/login', (req, res) => {
  const { email, password } = req.body;
  const admin = db.prepare('SELECT * FROM admins WHERE email = ?').get(email);
  if (!admin || !bcrypt.compareSync(password, admin.password)) {
    return res.status(401).json({ error: 'Email atau password salah' });
  }
  const { password: _, ...safeAdmin } = admin;
  res.json({ admin: safeAdmin });
});

// Login technician
app.post('/api/auth/technician/login', (req, res) => {
  const { email, password } = req.body;
  const tech = db.prepare('SELECT * FROM technicians WHERE email = ?').get(email);
  if (!tech || !bcrypt.compareSync(password, tech.password)) {
    return res.status(401).json({ error: 'Email atau password salah' });
  }
  const { password: _, ...safeTech } = tech;
  res.json({ technician: safeTech });
});

// ============================================================
// API - PEST TYPES
// ============================================================
app.get('/api/pest-types', (req, res) => {
  const pestTypes = db.prepare('SELECT * FROM pest_types ORDER BY name').all();
  res.json({ pestTypes });
});

// ============================================================
// API - BOOKINGS
// ============================================================
app.get('/api/bookings', (req, res) => {
  const { customerId, status } = req.query;
  let query = `
    SELECT b.*,
      c.id as c_id, c.name as c_name, c.email as c_email, c.phone as c_phone, c.address as c_address,
      p.id as p_id, p.name as p_name,
      a.id as a_id, a.technician_id,
      t.name as t_name, t.email as t_email, t.phone as t_phone,
      f.rating as f_rating, f.feedback as f_feedback
    FROM service_bookings b
    LEFT JOIN customers c ON b.customer_id = c.id
    LEFT JOIN pest_types p ON b.pest_type_id = p.id
    LEFT JOIN service_assignments a ON b.id = a.booking_id
    LEFT JOIN technicians t ON a.technician_id = t.id
    LEFT JOIN feedbacks f ON b.id = f.booking_id
    WHERE 1=1
  `;
  const params = [];
  if (customerId) { query += ' AND b.customer_id = ?'; params.push(customerId); }
  if (status) { query += ' AND b.status = ?'; params.push(status); }
  query += ' ORDER BY b.created_at DESC';

  const rows = db.prepare(query).all(...params);
  const bookings = rows.map(row => ({
    id: row.id,
    bookingNumber: row.booking_number,
    serviceDate: row.service_date,
    serviceTime: row.service_time,
    status: row.status,
    priority: row.priority,
    address: row.address,
    notes: row.notes,
    adminNotes: row.admin_notes,
    createdAt: row.created_at,
    customer: { id: row.c_id, name: row.c_name, email: row.c_email, phone: row.c_phone, address: row.c_address },
    pestType: { id: row.p_id, name: row.p_name },
    assignment: row.a_id ? { id: row.a_id, technician: { id: row.technician_id, name: row.t_name, email: row.t_email, phone: row.t_phone } } : null,
    feedback: row.f_rating ? { rating: row.f_rating, feedback: row.f_feedback } : null
  }));
  res.json({ bookings });
});

app.post('/api/bookings', (req, res) => {
  const { customerId, pestTypeId, serviceDate, serviceTime, address, notes, priority } = req.body;
  if (!customerId || !pestTypeId || !serviceDate || !serviceTime || !address) {
    return res.status(400).json({ error: 'Semua field wajib diisi' });
  }

  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (new Date(serviceDate) < today) {
    return res.status(400).json({ error: 'Tanggal layanan tidak boleh di masa lalu' });
  }

  const customer = db.prepare('SELECT id FROM customers WHERE id = ?').get(customerId);
  if (!customer) return res.status(404).json({ error: 'Customer tidak ditemukan' });

  const pestType = db.prepare('SELECT id FROM pest_types WHERE id = ?').get(pestTypeId);
  if (!pestType) return res.status(404).json({ error: 'Jenis hama tidak ditemukan' });

  const id = generateId();
  const bookingNumber = `BB-${Date.now()}`;
  db.prepare(`INSERT INTO service_bookings (id, booking_number, customer_id, pest_type_id, service_date, service_time, address, notes, priority, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`)
    .run(id, bookingNumber, customerId, pestTypeId, serviceDate, serviceTime, address, notes || null, priority || 'NORMAL');

  const booking = db.prepare(`SELECT b.*, p.name as pest_name FROM service_bookings b JOIN pest_types p ON b.pest_type_id = p.id WHERE b.id = ?`).get(id);
  res.status(201).json({ message: 'Booking berhasil dibuat', booking: { ...booking, bookingNumber: booking.booking_number } });
});

app.patch('/api/bookings/:id', (req, res) => {
  const { id } = req.params;
  const { status, adminNotes } = req.body;
  const booking = db.prepare('SELECT id FROM service_bookings WHERE id = ?').get(id);
  if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });

  if (status) db.prepare('UPDATE service_bookings SET status = ? WHERE id = ?').run(status, id);
  if (adminNotes !== undefined) db.prepare('UPDATE service_bookings SET admin_notes = ? WHERE id = ?').run(adminNotes, id);

  res.json({ message: 'Booking diperbarui' });
});

// ============================================================
// API - ASSIGNMENTS
// ============================================================
app.get('/api/assignments', (req, res) => {
  const { technicianId } = req.query;
  let query = `
    SELECT a.*,
      b.id as b_id, b.booking_number, b.service_date, b.service_time, b.status, b.address, b.notes,
      c.id as c_id, c.name as c_name, c.email as c_email, c.phone as c_phone, c.address as c_address,
      p.id as p_id, p.name as p_name,
      r.id as r_id, r.action_taken,
      f.rating as f_rating, f.feedback as f_feedback
    FROM service_assignments a
    JOIN service_bookings b ON a.booking_id = b.id
    JOIN customers c ON b.customer_id = c.id
    JOIN pest_types p ON b.pest_type_id = p.id
    LEFT JOIN service_reports r ON b.id = r.booking_id
    LEFT JOIN feedbacks f ON b.id = f.booking_id
    WHERE 1=1
  `;
  const params = [];
  if (technicianId) { query += ' AND a.technician_id = ?'; params.push(technicianId); }
  query += ' ORDER BY b.service_date ASC';

  const rows = db.prepare(query).all(...params);
  const assignments = rows.map(row => ({
    id: row.id,
    booking: {
      id: row.b_id,
      bookingNumber: row.booking_number,
      serviceDate: row.service_date,
      serviceTime: row.service_time,
      status: row.status,
      address: row.address,
      notes: row.notes,
      customer: { id: row.c_id, name: row.c_name, email: row.c_email, phone: row.c_phone, address: row.c_address },
      pestType: { id: row.p_id, name: row.p_name },
      report: row.r_id ? { id: row.r_id, actionTaken: row.action_taken } : null,
      feedback: row.f_rating ? { rating: row.f_rating, feedback: row.f_feedback } : null
    }
  }));
  res.json({ assignments });
});

app.post('/api/assignments', (req, res) => {
  const { bookingId, technicianId, assignedBy } = req.body;
  if (!bookingId || !technicianId) return res.status(400).json({ error: 'bookingId dan technicianId wajib diisi' });

  const existing = db.prepare('SELECT id FROM service_assignments WHERE booking_id = ?').get(bookingId);
  if (existing) return res.status(400).json({ error: 'Booking sudah memiliki teknisi' });

  const id = generateId();
  db.prepare('INSERT INTO service_assignments (id, booking_id, technician_id, assigned_by) VALUES (?, ?, ?, ?)')
    .run(id, bookingId, technicianId, assignedBy || null);
  db.prepare("UPDATE service_bookings SET status = 'ASSIGNED' WHERE id = ?").run(bookingId);

  res.json({ message: 'Teknisi berhasil di-assign' });
});

// ============================================================
// API - REPORTS
// ============================================================
app.get('/api/reports', (req, res) => {
  const reports = db.prepare(`
    SELECT r.*, b.booking_number, c.name as customer_name, t.name as tech_name
    FROM service_reports r
    JOIN service_bookings b ON r.booking_id = b.id
    JOIN customers c ON b.customer_id = c.id
    JOIN technicians t ON r.technician_id = t.id
    ORDER BY r.created_at DESC
  `).all();
  res.json({ reports });
});

app.post('/api/reports', (req, res) => {
  const { bookingId, technicianId, actionTaken, materialsUsed, treatedArea, serviceStatus, followUpDate, technicianNotes, pestTypeId } = req.body;
  if (!bookingId || !technicianId || !actionTaken || !treatedArea || !technicianNotes) {
    return res.status(400).json({ error: 'Field wajib harus diisi' });
  }

  const existing = db.prepare('SELECT id FROM service_reports WHERE booking_id = ?').get(bookingId);
  if (existing) return res.status(400).json({ error: 'Laporan sudah ada untuk booking ini' });

  const id = generateId();
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO service_reports (id, booking_id, technician_id, pest_type_id, arrival_time, completion_time, action_taken, materials_used, treated_area, service_status, follow_up_date, technician_notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, bookingId, technicianId, pestTypeId || null, now, now, actionTaken, materialsUsed || null, treatedArea, serviceStatus, followUpDate || null, technicianNotes);

  db.prepare('UPDATE service_bookings SET status = ? WHERE id = ?').run(serviceStatus, bookingId);

  res.json({ message: 'Laporan berhasil disimpan' });
});

// ============================================================
// API - FEEDBACK
// ============================================================
app.get('/api/feedback', (req, res) => {
  const feedbacks = db.prepare('SELECT * FROM feedbacks ORDER BY created_at DESC').all();
  res.json({ feedbacks });
});

app.post('/api/feedback', (req, res) => {
  const { bookingId, customerId, rating, feedback, complaint, suggestions } = req.body;
  if (!bookingId || !customerId || !rating) {
    return res.status(400).json({ error: 'bookingId, customerId, dan rating wajib diisi' });
  }
  const existing = db.prepare('SELECT id FROM feedbacks WHERE booking_id = ?').get(bookingId);
  if (existing) return res.status(400).json({ error: 'Feedback sudah diberikan' });

  const id = generateId();
  db.prepare('INSERT INTO feedbacks (id, booking_id, customer_id, rating, feedback, complaint, suggestions) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, bookingId, customerId, rating, feedback || null, complaint || null, suggestions || null);
  res.json({ message: 'Terima kasih atas feedback Anda!' });
});

// ============================================================
// API - TECHNICIANS
// ============================================================
app.get('/api/technicians', (req, res) => {
  const techs = db.prepare('SELECT id, name, email, phone, specialties, is_active FROM technicians').all();
  const withCounts = techs.map(t => {
    const assignCount = db.prepare('SELECT COUNT(*) as count FROM service_assignments WHERE technician_id = ?').get(t.id);
    const reportCount = db.prepare('SELECT COUNT(*) as count FROM service_reports WHERE technician_id = ?').get(t.id);
    return { ...t, isActive: t.is_active === 1, _count: { assignments: assignCount.count, reports: reportCount.count } };
  });
  res.json({ technicians: withCounts });
});

// ============================================================
// API - DASHBOARD STATS
// ============================================================
app.get('/api/dashboard', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const todayBookings = db.prepare("SELECT COUNT(*) as c FROM service_bookings WHERE service_date >= ? AND service_date < ?").get(today, tomorrow).c;
  const confirmedBookings = db.prepare("SELECT COUNT(*) as c FROM service_bookings WHERE status = 'CONFIRMED'").get().c;
  const pendingBookings = db.prepare("SELECT COUNT(*) as c FROM service_bookings WHERE status = 'PENDING'").get().c;
  const completedServices = db.prepare("SELECT COUNT(*) as c FROM service_bookings WHERE status = 'COMPLETED'").get().c;
  const needFollowUp = db.prepare("SELECT COUNT(*) as c FROM service_bookings WHERE status = 'NEED_FOLLOW_UP'").get().c;
  const activeTechnicians = db.prepare("SELECT COUNT(*) as c FROM technicians WHERE is_active = 1").get().c;

  const feedbacks = db.prepare('SELECT rating FROM feedbacks').all();
  const totalFeedback = feedbacks.length;
  const averageRating = totalFeedback > 0 ? Math.round((feedbacks.reduce((s, f) => s + f.rating, 0) / totalFeedback) * 10) / 10 : 0;

  res.json({
    stats: { todayBookings, confirmedBookings, pendingBookings, completedServices, needFollowUp, activeTechnicians, customerSatisfaction: { averageRating, totalFeedback } }
  });
});

// ============================================================
// START SERVER
// ============================================================
app.listen(PORT, () => {
  console.log('');
  console.log('🐛 BugBuster Pro - Pest Control Management System');
  console.log('==================================================');
  console.log(`🌐 Buka di browser: http://localhost:${PORT}`);
  console.log(`👨‍💼 Admin Portal  : http://localhost:${PORT}/admin`);
  console.log(`🔧 Tech Portal   : http://localhost:${PORT}/technician`);
  console.log('');
});
