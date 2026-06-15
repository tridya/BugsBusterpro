// =============================================
// BugBuster Pro - Admin Page Logic (admin.js)
// =============================================

let currentAdmin = null;
let technicians = [];
let stats = null;

document.addEventListener('DOMContentLoaded', () => {
  loadAdminFromStorage();
  setupAdminEvents();
});

function setupAdminEvents() {
  document.getElementById('btn-admin-login').addEventListener('click', doAdminLogin);
  document.getElementById('btn-admin-logout').addEventListener('click', doAdminLogout);
  document.getElementById('btn-do-assign').addEventListener('click', doAssignTechnician);

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('active'); });
  });

  // Enter key on login
  document.getElementById('admin-password').addEventListener('keydown', e => {
    if (e.key === 'Enter') doAdminLogin();
  });
}

function loadAdminFromStorage() {
  const saved = localStorage.getItem('bugbuster_admin');
  if (saved) {
    currentAdmin = JSON.parse(saved);
    showDashboard();
    fetchAllData();
  }
}

// ---- AUTH ----
async function doAdminLogin() {
  const email = document.getElementById('admin-email').value.trim();
  const password = document.getElementById('admin-password').value;
  if (!email || !password) return showToast('error', 'Email dan password wajib diisi');

  try {
    const res = await fetch('/api/auth/admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok) {
      currentAdmin = data.admin;
      localStorage.setItem('bugbuster_admin', JSON.stringify(data.admin));
      showDashboard();
      fetchAllData();
      showToast('success', `Selamat datang, ${data.admin.name}!`);
    } else {
      showToast('error', data.error || 'Login gagal');
    }
  } catch (e) { showToast('error', 'Koneksi gagal'); }
}

function doAdminLogout() {
  currentAdmin = null;
  localStorage.removeItem('bugbuster_admin');
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('dashboard').style.display = 'none';
  showToast('success', 'Logout berhasil');
}

function showDashboard() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('dashboard').style.display = 'block';
  document.getElementById('admin-welcome').textContent = `Halo, ${currentAdmin.name}`;
}

// ---- FETCH DATA ----
async function fetchAllData() {
  await Promise.all([fetchBookings(), fetchTechnicians(), fetchDashboardStats()]);
}

async function fetchBookings() {
  try {
    const res = await fetch('/api/bookings');
    const data = await res.json();
    renderBookingsList(data.bookings || []);
  } catch (e) { console.error(e); }
}

async function fetchTechnicians() {
  try {
    const res = await fetch('/api/technicians');
    const data = await res.json();
    technicians = data.technicians || [];
    renderTechniciansList(technicians);
    renderAssignSelect(technicians);
  } catch (e) { console.error(e); }
}

async function fetchDashboardStats() {
  try {
    const res = await fetch('/api/dashboard');
    const data = await res.json();
    stats = data.stats;
    renderStats(stats);
    renderStatsTab(stats);
  } catch (e) { console.error(e); }
}

// ---- RENDER STATS ----
function renderStats(s) {
  document.getElementById('stats-container').innerHTML = `
    <div class="stat-card stat-card-blue"><div><div class="stat-card-num">${s.todayBookings}</div><div class="stat-card-label">Today's Bookings</div></div><div class="stat-card-icon">📅</div></div>
    <div class="stat-card stat-card-yellow"><div><div class="stat-card-num">${s.pendingBookings}</div><div class="stat-card-label">Pending</div></div><div class="stat-card-icon">⏳</div></div>
    <div class="stat-card stat-card-green"><div><div class="stat-card-num">${s.confirmedBookings}</div><div class="stat-card-label">Confirmed</div></div><div class="stat-card-icon">✅</div></div>
    <div class="stat-card stat-card-emerald"><div><div class="stat-card-num">${s.completedServices}</div><div class="stat-card-label">Completed</div></div><div class="stat-card-icon">🏆</div></div>
    <div class="stat-card stat-card-red"><div><div class="stat-card-num">${s.needFollowUp}</div><div class="stat-card-label">Follow Up</div></div><div class="stat-card-icon">🔔</div></div>
    <div class="stat-card stat-card-purple"><div><div class="stat-card-num">${s.activeTechnicians}</div><div class="stat-card-label">Active Technicians</div></div><div class="stat-card-icon">👷</div></div>
  `;
}

function renderStatsTab(s) {
  const rating = s.customerSatisfaction.averageRating;
  document.getElementById('avg-rating').textContent = rating.toFixed(1);
  document.getElementById('total-feedback').textContent = `Based on ${s.customerSatisfaction.totalFeedback} reviews`;
  const starsEl = document.getElementById('rating-stars');
  starsEl.innerHTML = [1,2,3,4,5].map(i =>
    `<span style="color:${i <= Math.round(rating) ? '#eab308' : '#d1d5db'}">★</span>`
  ).join('');
  document.getElementById('status-overview').innerHTML = `
    <div style="display:flex; flex-direction:column; gap:0.75rem;">
      ${[
        ['PENDING', '#fef3c7', '#92400e', s.pendingBookings],
        ['CONFIRMED', '#dbeafe', '#1e40af', s.confirmedBookings],
        ['COMPLETED', '#d1fae5', '#065f46', s.completedServices],
        ['NEED FOLLOW UP', '#fee2e2', '#991b1b', s.needFollowUp],
      ].map(([label, bg, color, count]) => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:0.5rem 0.75rem; background:${bg}; border-radius:0.5rem;">
          <span style="font-size:0.8rem; font-weight:700; color:${color};">${label}</span>
          <span style="font-weight:800; color:${color};">${count}</span>
        </div>
      `).join('')}
    </div>
  `;
}

// ---- RENDER BOOKINGS ----
function renderBookingsList(bookings) {
  const el = document.getElementById('bookings-list');
  if (bookings.length === 0) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><p>Belum ada booking.</p></div>`;
    return;
  }
  el.innerHTML = bookings.map(b => `
    <div class="booking-item">
      <div class="booking-item-header">
        <div style="display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap;">
          <strong>${b.bookingNumber}</strong>
          <span class="badge badge-${b.status.toLowerCase().replace(/ /g,'_')}">${b.status.replace(/_/g,' ')}</span>
          <span class="badge" style="background:#fef3c7; color:#92400e; border:1px solid #fde68a;">${b.priority}</span>
        </div>
        <span style="font-size:0.8rem; color:#64748b;">${new Date(b.serviceDate).toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'})}</span>
      </div>
      <div class="booking-item-info">
        <div>👤 <span>Customer</span><br><strong>${b.customer.name}</strong></div>
        <div>📞 <span>Telepon</span><br><strong>${b.customer.phone}</strong></div>
        <div>🦟 <span>Jenis Hama</span><br><strong>${b.pestType.name}</strong></div>
        <div>⏰ <span>Waktu</span><br><strong>${b.serviceTime}</strong></div>
        <div>📍 <span>Alamat</span><br><strong>${b.address}</strong></div>
        <div>👷 <span>Teknisi</span><br><strong>${b.assignment ? b.assignment.technician.name : 'Belum ditugaskan'}</strong></div>
      </div>
      ${b.notes ? `<p style="font-size:0.82rem; color:#64748b; margin-top:0.5rem; padding:0.5rem 0.75rem; background:#f8fafc; border-radius:0.5rem;">📝 ${b.notes}</p>` : ''}
      <div class="booking-item-actions" style="margin-top:0.75rem;">
        ${b.status === 'PENDING' ? `
          <button class="btn btn-primary btn-sm" onclick="updateStatus('${b.id}', 'CONFIRMED')">✅ Konfirmasi</button>
        ` : ''}
        ${(b.status === 'PENDING' || b.status === 'CONFIRMED') && !b.assignment ? `
          <button class="btn btn-outline btn-sm" onclick="openAssign('${b.id}', '${b.bookingNumber}')">👷 Assign Teknisi</button>
        ` : ''}
      </div>
    </div>
  `).join('');
}

// ---- RENDER TECHNICIANS ----
function renderTechniciansList(techs) {
  const el = document.getElementById('technicians-list');
  if (techs.length === 0) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">👷</div><p>Belum ada teknisi.</p></div>`;
    return;
  }
  el.innerHTML = `<div class="tech-grid">${techs.map(t => `
    <div class="tech-card">
      <div class="tech-card-header">
        <div class="tech-name">${t.name}</div>
        <span class="badge" style="background:${t.isActive ? '#d1fae5' : '#f1f5f9'}; color:${t.isActive ? '#065f46' : '#475569'}; border:1px solid ${t.isActive ? '#a7f3d0' : '#e2e8f0'}">
          ${t.isActive ? '● Active' : '○ Inactive'}
        </span>
      </div>
      <div class="tech-email">✉️ ${t.email}</div>
      <div class="tech-phone">📞 ${t.phone}</div>
      <div class="tech-counts">
        <div class="tech-count-item blue">
          <div class="tech-count-num" style="color:#3b82f6;">${t._count.assignments}</div>
          <div class="tech-count-label">Assignments</div>
        </div>
        <div class="tech-count-item green">
          <div class="tech-count-num" style="color:#0b8a4f;">${t._count.reports}</div>
          <div class="tech-count-label">Reports</div>
        </div>
      </div>
    </div>
  `).join('')}</div>`;
}

// ---- ASSIGN ----
function openAssign(bookingId, bookingNumber) {
  document.getElementById('assign-booking-id').value = bookingId;
  document.getElementById('assign-booking-label').textContent = `Assign teknisi untuk booking: ${bookingNumber}`;
  document.getElementById('assign-tech-select').value = '';
  openModal('modal-assign');
}

function renderAssignSelect(techs) {
  const sel = document.getElementById('assign-tech-select');
  sel.innerHTML = `<option value="">-- Pilih Teknisi --</option>` +
    techs.filter(t => t.isActive).map(t => `<option value="${t.id}">${t.name} (${t.phone})</option>`).join('');
}

async function doAssignTechnician() {
  const bookingId = document.getElementById('assign-booking-id').value;
  const technicianId = document.getElementById('assign-tech-select').value;
  if (!technicianId) return showToast('error', 'Pilih teknisi terlebih dahulu');

  try {
    const res = await fetch('/api/assignments', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId, technicianId, assignedBy: currentAdmin?.id })
    });
    const data = await res.json();
    if (res.ok) {
      showToast('success', 'Teknisi berhasil di-assign!');
      closeModal('modal-assign');
      fetchAllData();
    } else {
      showToast('error', data.error || 'Gagal assign teknisi');
    }
  } catch (e) { showToast('error', 'Koneksi gagal'); }
}

// ---- UPDATE STATUS ----
async function updateStatus(bookingId, status) {
  try {
    const res = await fetch(`/api/bookings/${bookingId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      showToast('success', 'Status booking diperbarui!');
      fetchBookings();
      fetchDashboardStats();
    } else {
      showToast('error', 'Gagal memperbarui status');
    }
  } catch (e) { showToast('error', 'Koneksi gagal'); }
}

// ---- TABS ----
function switchTab(tabId, btn) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  btn.classList.add('active');
}

// ---- UTILS ----
function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

function showToast(type, message) {
  const toast = document.getElementById('toast');
  toast.className = `alert alert-${type === 'success' ? 'success' : 'error'} show`;
  toast.innerHTML = `${type === 'success' ? '✅' : '❌'} ${message}`;
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => { toast.classList.remove('show'); }, 4000);
}
