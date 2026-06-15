// =============================================
// BugBuster Pro - Technician Page Logic
// =============================================

let currentTech = null;
let assignments = [];
let pestTypes = [];

document.addEventListener('DOMContentLoaded', () => {
  loadTechFromStorage();
  setupTechEvents();
});

function setupTechEvents() {
  document.getElementById('btn-tech-login').addEventListener('click', doTechLogin);
  document.getElementById('btn-tech-logout').addEventListener('click', doTechLogout);
  document.getElementById('btn-submit-report').addEventListener('click', doSubmitReport);

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('active'); });
  });

  document.getElementById('tech-password').addEventListener('keydown', e => {
    if (e.key === 'Enter') doTechLogin();
  });
}

function loadTechFromStorage() {
  const saved = localStorage.getItem('bugbuster_technician');
  if (saved) {
    currentTech = JSON.parse(saved);
    showDashboard();
    fetchAssignments();
    fetchPestTypes();
  }
}

// ---- AUTH ----
async function doTechLogin() {
  const email = document.getElementById('tech-email').value.trim();
  const password = document.getElementById('tech-password').value;
  if (!email || !password) return showToast('error', 'Email dan password wajib diisi');

  try {
    const res = await fetch('/api/auth/technician/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok) {
      currentTech = data.technician;
      localStorage.setItem('bugbuster_technician', JSON.stringify(data.technician));
      showDashboard();
      fetchAssignments();
      fetchPestTypes();
      showToast('success', `Selamat datang, ${data.technician.name}!`);
    } else {
      showToast('error', data.error || 'Login gagal');
    }
  } catch (e) { showToast('error', 'Koneksi gagal'); }
}

function doTechLogout() {
  currentTech = null;
  assignments = [];
  localStorage.removeItem('bugbuster_technician');
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('dashboard').style.display = 'none';
  showToast('success', 'Logout berhasil');
}

function showDashboard() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('dashboard').style.display = 'block';
  document.getElementById('tech-welcome').textContent = `Halo, ${currentTech.name}`;
}

// ---- FETCH DATA ----
async function fetchAssignments() {
  if (!currentTech) return;
  try {
    const res = await fetch(`/api/assignments?technicianId=${currentTech.id}`);
    const data = await res.json();
    assignments = data.assignments || [];
    renderAllTabs();
  } catch (e) { console.error(e); }
}

async function fetchPestTypes() {
  try {
    const res = await fetch('/api/pest-types');
    const data = await res.json();
    pestTypes = data.pestTypes || [];
    renderPestSelect();
  } catch (e) { console.error(e); }
}

function renderPestSelect() {
  const sel = document.getElementById('report-pest');
  sel.innerHTML = `<option value="">-- Pilih Jenis Hama --</option>` +
    pestTypes.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
}

// ---- RENDER TABS ----
function renderAllTabs() {
  const assigned = assignments.filter(a => a.booking.status === 'ASSIGNED');
  const inprogress = assignments.filter(a => a.booking.status === 'IN_PROGRESS');
  const completed = assignments.filter(a => ['COMPLETED', 'NEED_FOLLOW_UP'].includes(a.booking.status));

  renderTaskList('list-assigned', assigned, 'assigned');
  renderTaskList('list-inprogress', inprogress, 'inprogress');
  renderTaskList('list-completed', completed, 'completed');
}

function renderTaskList(elId, items, type) {
  const el = document.getElementById(elId);
  if (items.length === 0) {
    const icons = { assigned: '📋', inprogress: '⚙️', completed: '✅' };
    const msgs = { assigned: 'Tidak ada tugas yang ditugaskan', inprogress: 'Tidak ada tugas sedang dikerjakan', completed: 'Belum ada tugas selesai' };
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">${icons[type]}</div><p>${msgs[type]}</p></div>`;
    return;
  }

  el.innerHTML = items.map(a => {
    const b = a.booking;
    const statusColor = {
      ASSIGNED: '#a855f7', IN_PROGRESS: '#f97316', COMPLETED: '#22c55e', NEED_FOLLOW_UP: '#ef4444'
    }[b.status] || '#64748b';

    const actionBtn = type === 'assigned'
      ? `<button class="btn btn-primary btn-sm" onclick="openReport('${b.id}','${b.bookingNumber}','${b.pestType.id}','${b.address}')">📝 Mulai Service</button>`
      : type === 'inprogress'
      ? `<button class="btn btn-sm" style="background:#059669; color:white;" onclick="openReport('${b.id}','${b.bookingNumber}','${b.pestType.id}','${b.address}')">✅ Selesaikan</button>`
      : '';

    return `
      <div class="booking-item" style="border-left-color:${statusColor};">
        <div class="booking-item-header">
          <div style="display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap;">
            <strong>${b.bookingNumber}</strong>
            <span class="badge badge-${b.status.toLowerCase().replace(/ /g,'_')}">${b.status.replace(/_/g,' ')}</span>
            <span style="font-size:0.82rem; color:#64748b;">🦟 ${b.pestType.name}</span>
          </div>
          ${actionBtn ? `<div>${actionBtn}</div>` : ''}
        </div>
        <div class="booking-item-info">
          <div>👤 <span>Customer</span><br><strong>${b.customer.name}</strong></div>
          <div>📞 <span>Telepon</span><br><strong>${b.customer.phone}</strong></div>
          <div>📅 <span>Tanggal</span><br><strong>${new Date(b.serviceDate).toLocaleDateString('id-ID')}</strong></div>
          <div>⏰ <span>Waktu</span><br><strong>${b.serviceTime}</strong></div>
          <div style="grid-column:span 2;">📍 <span>Alamat</span><br><strong>${b.address}</strong></div>
        </div>
        ${b.notes ? `<p style="font-size:0.82rem; color:#64748b; margin-top:0.5rem; padding:0.5rem 0.75rem; background:#f8fafc; border-radius:0.5rem;">📝 ${b.notes}</p>` : ''}
        ${b.report ? `<div style="margin-top:0.75rem; padding:0.5rem 0.75rem; background:#f0fdf4; border-radius:0.5rem; font-size:0.82rem; color:#065f46;"><strong>📋 Laporan:</strong> ${b.report.actionTaken}</div>` : ''}
        ${b.feedback ? `<div style="margin-top:0.5rem; font-size:0.82rem; color:#0b8a4f; font-weight:700;">⭐ ${'★'.repeat(b.feedback.rating)} Rating dari Customer</div>` : ''}
      </div>
    `;
  }).join('');
}

// ---- REPORT ----
function openReport(bookingId, bookingNumber, pestTypeId, address) {
  document.getElementById('report-booking-id').value = bookingId;
  document.getElementById('report-booking-label').textContent = `Laporan untuk booking: ${bookingNumber}`;
  document.getElementById('report-pest').value = pestTypeId || '';
  document.getElementById('report-area').value = address || '';
  document.getElementById('report-action').value = '';
  document.getElementById('report-materials').value = '';
  document.getElementById('report-notes').value = '';
  document.getElementById('report-status').value = 'COMPLETED';
  document.getElementById('followup-date-group').style.display = 'none';
  openModal('modal-report');
}

function toggleFollowUp() {
  const status = document.getElementById('report-status').value;
  document.getElementById('followup-date-group').style.display = status === 'NEED_FOLLOW_UP' ? 'block' : 'none';
}

async function doSubmitReport() {
  const bookingId = document.getElementById('report-booking-id').value;
  const pestTypeId = document.getElementById('report-pest').value;
  const serviceStatus = document.getElementById('report-status').value;
  const actionTaken = document.getElementById('report-action').value.trim();
  const materialsUsed = document.getElementById('report-materials').value.trim();
  const treatedArea = document.getElementById('report-area').value.trim();
  const followUpDate = document.getElementById('report-followup').value;
  const technicianNotes = document.getElementById('report-notes').value.trim();

  if (!actionTaken || !treatedArea || !technicianNotes) {
    return showToast('error', 'Tindakan, area, dan catatan teknisi wajib diisi');
  }

  try {
    const res = await fetch('/api/reports', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingId, technicianId: currentTech.id, pestTypeId,
        actionTaken, materialsUsed, treatedArea, serviceStatus,
        followUpDate: followUpDate || null, technicianNotes,
        arrivalTime: new Date().toISOString(),
        completionTime: new Date().toISOString()
      })
    });
    const data = await res.json();
    if (res.ok) {
      showToast('success', 'Laporan berhasil dikirim!');
      closeModal('modal-report');
      fetchAssignments();
    } else {
      showToast('error', data.error || 'Gagal mengirim laporan');
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
