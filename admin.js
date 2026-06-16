// =============================================
// BugBuster Pro - Admin Page Logic (admin.js)
// =============================================

let currentAdmin = null;
let technicians = [];
let stats = null;
let allBookings = [];
let serviceReports = [];
let chartStatusInstance = null;
let chartPestInstance = null;

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
  await Promise.all([fetchBookings(), fetchTechnicians(), fetchDashboardStats(), fetchReports()]);
}

async function fetchBookings() {
  try {
    const res = await fetch('/api/bookings');
    const data = await res.json();
    allBookings = data.bookings || [];
    renderBookingsList(allBookings);
    
    // Calculate and render stats based on current bookings loaded
    renderCalculatedStats(allBookings);
    updateCharts(allBookings);
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
    // Fallback if client-side renderCalculatedStats hasn't run yet
    if (allBookings.length === 0) {
      renderStats(stats);
      renderStatsTab(stats);
    }
  } catch (e) { console.error(e); }
}

async function fetchReports() {
  try {
    const res = await fetch('/api/reports');
    const data = await res.json();
    serviceReports = data.reports || [];
    renderReportsList(serviceReports);
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
  document.getElementById('avg-rating').textContent = rating > 0 ? rating.toFixed(1) : '-';
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

// ---- CLIENT-SIDE STATS & CHART UPDATES ----
function renderCalculatedStats(filteredBookings) {
  const todayStr = new Date().toISOString().split('T')[0];
  const todayBookings = filteredBookings.filter(b => b.serviceDate === todayStr).length;
  const pendingBookings = filteredBookings.filter(b => b.status === 'PENDING').length;
  const confirmedBookings = filteredBookings.filter(b => b.status === 'CONFIRMED').length;
  const completedServices = filteredBookings.filter(b => b.status === 'COMPLETED').length;
  const needFollowUp = filteredBookings.filter(b => b.status === 'NEED_FOLLOW_UP').length;
  const activeTechnicians = technicians.filter(t => t.isActive).length;

  const statsObj = {
    todayBookings,
    pendingBookings,
    confirmedBookings,
    completedServices,
    needFollowUp,
    activeTechnicians
  };

  renderStats(statsObj);

  const ratings = filteredBookings.filter(b => b.feedback && b.feedback.rating).map(b => b.feedback.rating);
  const totalFeedback = ratings.length;
  const averageRating = totalFeedback > 0 ? ratings.reduce((sum, r) => sum + r, 0) / totalFeedback : 0;

  renderStatsTab({
    pendingBookings,
    confirmedBookings,
    completedServices,
    needFollowUp,
    customerSatisfaction: { averageRating, totalFeedback }
  });
}

function updateCharts(filteredBookings) {
  // 1. Status Distribution
  const statusCounts = { PENDING: 0, CONFIRMED: 0, ASSIGNED: 0, IN_PROGRESS: 0, COMPLETED: 0, NEED_FOLLOW_UP: 0 };
  filteredBookings.forEach(b => {
    if (statusCounts[b.status] !== undefined) {
      statusCounts[b.status]++;
    }
  });

  const statusLabels = Object.keys(statusCounts);
  const statusData = Object.values(statusCounts);
  const statusColors = ['#f59e0b', '#3b82f6', '#a855f7', '#f97316', '#10b981', '#ef4444'];

  const ctxStatus = document.getElementById('chart-status').getContext('2d');
  if (chartStatusInstance) {
    chartStatusInstance.destroy();
  }
  chartStatusInstance = new Chart(ctxStatus, {
    type: 'doughnut',
    data: {
      labels: statusLabels.map(s => s.replace(/_/g, ' ')),
      datasets: [{
        data: statusData,
        backgroundColor: statusColors,
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });

  // 2. Pest Type Distribution
  const pestCounts = {};
  filteredBookings.forEach(b => {
    const pestName = b.pestType.name || 'Unknown';
    pestCounts[pestName] = (pestCounts[pestName] || 0) + 1;
  });

  const pestLabels = Object.keys(pestCounts);
  const pestData = Object.values(pestCounts);
  const pestColors = ['#0b8a4f', '#06b6d4', '#eab308', '#ec4899', '#3b82f6', '#f97316', '#8b5cf6'];

  const ctxPest = document.getElementById('chart-pest').getContext('2d');
  if (chartPestInstance) {
    chartPestInstance.destroy();
  }
  chartPestInstance = new Chart(ctxPest, {
    type: 'bar',
    data: {
      labels: pestLabels,
      datasets: [{
        label: 'Jumlah Booking',
        data: pestData,
        backgroundColor: pestColors.slice(0, pestLabels.length),
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

function applyStatsFilter() {
  const startDateVal = document.getElementById('stats-start-date').value;
  const endDateVal = document.getElementById('stats-end-date').value;

  let filtered = allBookings;

  if (startDateVal) {
    filtered = filtered.filter(b => b.serviceDate >= startDateVal);
  }
  if (endDateVal) {
    filtered = filtered.filter(b => b.serviceDate <= endDateVal);
  }

  renderCalculatedStats(filtered);
  updateCharts(filtered);
}

function resetStatsFilter() {
  document.getElementById('stats-start-date').value = '';
  document.getElementById('stats-end-date').value = '';
  renderCalculatedStats(allBookings);
  updateCharts(allBookings);
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

// ---- RENDER REPORTS ----
function renderReportsList(reports) {
  const container = document.getElementById('reports-list-container');
  if (reports.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><p>Belum ada laporan.</p></div>`;
    return;
  }

  container.innerHTML = reports.map(r => {
    const statusClass = r.service_status === 'COMPLETED' ? 'badge-completed' : 'badge-need_follow_up';
    const statusText = r.service_status === 'COMPLETED' ? 'Completed' : 'Need Follow Up';
    const formattedDate = new Date(r.created_at).toLocaleDateString('id-ID', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    return `
      <div class="booking-item" id="report-card-${r.id}" style="border-left-color: ${r.service_status === 'COMPLETED' ? '#10b981' : '#ef4444'};">
        <div class="booking-item-header">
          <div style="display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap;">
            <strong style="font-size:1.1rem;">${r.booking_number}</strong>
            <span class="badge ${statusClass}">${statusText}</span>
          </div>
          <span style="font-size:0.8rem; color:#64748b;">${formattedDate}</span>
        </div>
        <div class="booking-item-info" style="margin-bottom:1rem;">
          <div>👤 <span>Customer</span><br><strong>${r.customer_name}</strong></div>
          <div>👷 <span>Teknisi</span><br><strong>${r.tech_name}</strong></div>
          <div>📍 <span>Area Ditangani</span><br><strong>${r.treated_area}</strong></div>
          <div>🧪 <span>Bahan Digunakan</span><br><strong>${r.materials_used || '-'}</strong></div>
        </div>
        <div style="margin-top:0.75rem; padding:0.75rem; background:#f8fafc; border-radius:0.5rem; font-size:0.875rem;">
          <div style="margin-bottom:0.5rem;"><strong>📋 Tindakan:</strong><br>${r.action_taken}</div>
          <div><strong>📝 Catatan Teknisi:</strong><br>${r.technician_notes}</div>
          ${r.follow_up_date ? `<div style="margin-top:0.5rem; color:#dc2626;"><strong>📅 Tanggal Follow Up:</strong> ${new Date(r.follow_up_date).toLocaleDateString('id-ID')}</div>` : ''}
        </div>
        <div class="booking-item-actions no-print" style="margin-top:0.75rem;">
          <button class="btn btn-outline btn-sm" onclick="printIndividualReport('${r.id}')">🖨️ Cetak Laporan Ini</button>
        </div>
      </div>
    `;
  }).join('');
}

function filterReports() {
  const query = document.getElementById('report-search-input').value.toLowerCase();
  const startDate = document.getElementById('report-start-date').value;
  const endDate = document.getElementById('report-end-date').value;

  const filtered = serviceReports.filter(r => {
    const matchSearch = r.booking_number.toLowerCase().includes(query) ||
                        r.customer_name.toLowerCase().includes(query) ||
                        r.tech_name.toLowerCase().includes(query) ||
                        r.treated_area.toLowerCase().includes(query);

    const reportDate = r.created_at.split('T')[0];
    const matchStart = startDate ? reportDate >= startDate : true;
    const matchEnd = endDate ? reportDate <= endDate : true;

    return matchSearch && matchStart && matchEnd;
  });

  renderReportsList(filtered);
}

// ---- PRINT/EXPORT UTILS ----
function printStatsDashboard() {
  document.getElementById('print-date-display').textContent = new Date().toLocaleDateString('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
  window.print();
}

function printReportsList() {
  window.print();
}

function printIndividualReport(reportId) {
  const element = document.getElementById(`report-card-${reportId}`);
  if (!element) return;
  
  const printWindow = window.open('', '_blank');
  const htmlContent = `
    <html>
      <head>
        <title>Laporan Hasil Kerja - BugBuster Pro</title>
        <link rel="stylesheet" href="/style.css" />
        <style>
          body { font-family: sans-serif; padding: 2rem; background: white; }
          .booking-item { border: 1px solid #cbd5e1; border-radius: 0.75rem; padding: 1.5rem; margin-top: 1rem; }
          .badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 99px; font-size: 0.75rem; font-weight: bold; text-transform: uppercase; }
          .badge-completed { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
          .badge-need_follow_up { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
          .booking-item-info { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem; }
          .booking-item-info span { color: #64748b; font-size: 0.8rem; }
          .booking-item-info strong { color: #0f172a; font-size: 0.95rem; }
        </style>
      </head>
      <body>
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid #0b8a4f; padding-bottom: 1rem;">
          <div>
            <h1 style="color: #0b8a4f; margin: 0; font-size: 1.75rem;">BugBuster Pro</h1>
            <p style="margin: 0.25rem 0 0; font-size: 0.8rem; color: #64748b; text-transform: uppercase;">Service Report Document</p>
          </div>
          <div style="text-align: right; font-size: 0.8rem; color: #64748b;">
            Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', {day: '2-digit', month: 'long', year: 'numeric'})}
          </div>
        </div>
        ${element.outerHTML}
        <script>
          const actionBtn = document.querySelector('.booking-item-actions');
          if (actionBtn) actionBtn.style.display = 'none';
          window.print();
          window.onafterprint = function() { window.close(); };
        <\/script>
      </body>
    </html>
  `;
  printWindow.document.write(htmlContent);
  printWindow.document.close();
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
