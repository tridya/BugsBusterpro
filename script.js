// =============================================
// BugBuster Pro - Customer Page Logic (script.js)
// =============================================

// Data layanan (tampilan UI)
const PEST_SERVICES = [
  { name: 'Termites', dbMatch: 'Termites', icon: '🐜', desc: 'Proteksi struktur bangunan kayu Anda dari serangan rayap kayu kering & tanah secara menyeluruh.', badge: null, checklist: ['Deteksi radar termografis hama & pemetaan sarang.','Injeksi cairan pengaman kayu bertekanan tinggi.','Instalasi umpan rayap (baiting stations) keliling luar.','Garansi perlindungan struktur kayu 3 tahun.','Inspeksi berkala setiap 6 bulan.'] },
  { name: 'Weevil', dbMatch: 'Cockroaches', icon: '🪲', desc: 'Pembasmian hama gudang makanan, kumbang tepung, dan biji-bijian penyerang logistik.', badge: '10% OFF', checklist: ['Inspeksi pantry makanan & identifikasi bahan tercemar.','Pemasangan perangkap feromon penarik serangga dewasa.','Penyemprotan residual ramah lingkungan area lemari.','Rekomendasi sanitasi wadah kedap udara.','Penyegelan celah retakan sudut penyimpanan makanan.'] },
  { name: 'Mosquito', dbMatch: 'Mosquitoes', icon: '🦟', desc: 'Mencegah perkembangbiakan jentik nyamuk penyebar penyakit DBD, Chikungunya & Malaria.', badge: null, checklist: ['Thermal fogging luar ruangan area vegetasi rimbun.','Penebaran larvasida pada air tergenang (abatisasi).','Cold fogging/misting ultra-low volume area dalam rumah.','Edukasi gerakan 3M pembasmi sarang nyamuk.','Treatment berkala bulanan pelindung pekarangan.'] },
  { name: 'Rodent', dbMatch: 'Rodents', icon: '🐀', desc: 'Pengendalian populasi tikus got & atap penular bakteri leptospirosis dan perusak kabel.', badge: null, checklist: ['Penyusuran titik masuk (runways) & liang sarang tikus.','Pemasangan bait station tahan cuaca di luar ruangan.','Pemasangan perangkap lem & jepret area dalam plafon.','Penutupan celah lubang pondasi dengan kawat baja.','Kunjungan monitor berkala setiap 5 hari.'] },
  { name: 'Bedbug', dbMatch: 'Bed Bugs', icon: '🛏️', desc: 'Pembasmian tuntas kutu kasur penggigit manusia penyebab gatal dan iritasi kulit.', badge: null, checklist: ['Inspeksi lipatan kasur, sela ranjang, & stopkontak.','Metode steam pemanas suhu tinggi pembunuh telur kutu.','Penyemprotan cairan knockdown di sela-sela kayu.','Saran pembungkusan pelindung kasur (encasement).','Treatment kedua wajib setelah 14 hari.'] },
  { name: 'Aphid', dbMatch: 'Ants', icon: '🌱', desc: 'Penanganan hama kutu daun tanaman perusak taman estetika halaman rumah.', badge: null, checklist: ['Pemeriksaan intensitas tanaman terserang hama.','Penyemprotan sabun insektisida organik non-kimia.','Aplikasi minyak hortikultura pelapis batang daun.','Instruksi penyiraman & pemupukan sehat pendukung.','Tips konservasi predator alami (ladybug).'] }
];

// State
let currentCustomer = null;
let pestTypes = [];
let selectedFeedbackRating = 5;

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
  loadCustomerFromStorage();
  fetchPestTypes();
  renderServices();
  setupEventListeners();

  // Sembunyikan splash setelah 1.3 detik
  setTimeout(() => {
    const splash = document.getElementById('splash');
    if (splash) splash.style.display = 'none';
  }, 1400);
});

function setupEventListeners() {
  document.getElementById('btn-auth').addEventListener('click', () => {
    if (currentCustomer) openProfileMenu();
    else openModal('modal-auth');
  });
  document.getElementById('btn-track').addEventListener('click', trackBooking);
  document.getElementById('btn-do-login').addEventListener('click', doLogin);
  document.getElementById('btn-do-register').addEventListener('click', doRegister);
  document.getElementById('btn-submit-booking').addEventListener('click', submitBooking);
  document.getElementById('btn-submit-feedback').addEventListener('click', submitFeedback);
  document.getElementById('btn-login-prompt').addEventListener('click', () => openModal('modal-auth'));
  document.getElementById('btn-book-from-service').addEventListener('click', () => {
    closeModal('modal-service');
    document.getElementById('booking-section').scrollIntoView({ behavior: 'smooth' });
  });
  document.getElementById('nav-mybookings').addEventListener('click', () => {
    document.getElementById('dashboard-section').scrollIntoView({ behavior: 'smooth' });
  });

  // Star rating
  document.querySelectorAll('.star').forEach(star => {
    star.addEventListener('click', () => {
      const val = parseInt(star.dataset.val);
      selectedFeedbackRating = val;
      document.getElementById('feedback-rating').value = val;
      document.querySelectorAll('.star').forEach((s, i) => {
        s.classList.toggle('active', i < val);
      });
    });
  });

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('active');
    });
  });
}

// ---- SERVICES RENDER ----
function renderServices() {
  const grid = document.getElementById('services-grid');
  grid.innerHTML = PEST_SERVICES.map((s, i) => `
    <div class="service-card" onclick="openServiceDetail(${i})">
      ${s.badge ? `<span class="service-promo">${s.badge}</span>` : ''}
      <div class="service-icon">${s.icon}</div>
      <h4>${s.name} Care</h4>
      <p>${s.desc}</p>
      <ul class="service-checklist">
        ${s.checklist.slice(0, 3).map(item => `<li>${item}</li>`).join('')}
      </ul>
    </div>
  `).join('');
}

function openServiceDetail(idx) {
  const s = PEST_SERVICES[idx];
  document.getElementById('service-modal-title').textContent = `${s.icon} ${s.name} Care`;
  document.getElementById('service-modal-body').innerHTML = `
    <p style="color:#64748b; font-size:0.875rem; margin-bottom:1rem;">${s.desc}</p>
    <ul class="service-checklist" style="border-top:1px solid #e2e8f0; padding-top:1rem;">
      ${s.checklist.map(item => `<li>${item}</li>`).join('')}
    </ul>
  `;
  document.getElementById('btn-book-from-service').dataset.pest = s.dbMatch;
  openModal('modal-service');
}

// ---- PEST TYPES ----
async function fetchPestTypes() {
  try {
    const res = await fetch('/api/pest-types');
    const data = await res.json();
    pestTypes = data.pestTypes || [];
    renderBookingPestSelect();
  } catch (e) { console.error(e); }
}

function renderBookingPestSelect() {
  const sel = document.getElementById('booking-pest');
  sel.innerHTML = `<option value="">-- Pilih Jenis Hama --</option>` +
    pestTypes.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
}

// ---- AUTH ----
function loadCustomerFromStorage() {
  const saved = localStorage.getItem('bugbuster_customer');
  if (saved) {
    currentCustomer = JSON.parse(saved);
    onLoginSuccess();
  }
}

function onLoginSuccess() {
  document.getElementById('btn-auth').textContent = `👤 ${currentCustomer.name}`;
  document.getElementById('nav-mybookings').style.display = 'block';
  document.getElementById('booking-login-prompt').style.display = 'none';
  document.getElementById('booking-form').style.display = 'block';
  document.getElementById('booking-address').value = currentCustomer.address || '';
  document.getElementById('dashboard-title').textContent = `My Bookings — ${currentCustomer.name}`;
  document.getElementById('dashboard-section').style.display = 'block';
  fetchMyBookings();
}

async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) return showToast('error', 'Email dan password wajib diisi');

  try {
    const res = await fetch('/api/auth/customer/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok) {
      currentCustomer = data.customer;
      localStorage.setItem('bugbuster_customer', JSON.stringify(data.customer));
      closeModal('modal-auth');
      onLoginSuccess();
      showToast('success', `Selamat datang, ${data.customer.name}!`);
    } else {
      showToast('error', data.error || 'Login gagal');
    }
  } catch (e) { showToast('error', 'Koneksi gagal'); }
}

async function doRegister() {
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const phone = document.getElementById('reg-phone').value.trim();
  const address = document.getElementById('reg-address').value.trim();
  const password = document.getElementById('reg-password').value;
  if (!name || !email || !phone || !address || !password) return showToast('error', 'Semua field wajib diisi');

  try {
    const res = await fetch('/api/auth/customer/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, address, password })
    });
    const data = await res.json();
    if (res.ok) {
      showToast('success', 'Registrasi berhasil! Silakan login.');
      showLogin();
      document.getElementById('login-email').value = email;
    } else {
      showToast('error', data.error || 'Registrasi gagal');
    }
  } catch (e) { showToast('error', 'Koneksi gagal'); }
}

function openProfileMenu() {
  const confirmed = confirm(`Logout dari akun ${currentCustomer.name}?`);
  if (confirmed) {
    currentCustomer = null;
    localStorage.removeItem('bugbuster_customer');
    document.getElementById('btn-auth').textContent = 'Sign In';
    document.getElementById('nav-mybookings').style.display = 'none';
    document.getElementById('booking-login-prompt').style.display = 'block';
    document.getElementById('booking-form').style.display = 'none';
    document.getElementById('dashboard-section').style.display = 'none';
    showToast('success', 'Logout berhasil');
  }
}

function showRegister() {
  document.getElementById('auth-login-form').style.display = 'none';
  document.getElementById('auth-register-form').style.display = 'block';
  document.getElementById('auth-modal-title').textContent = 'Daftar Akun';
}
function showLogin() {
  document.getElementById('auth-login-form').style.display = 'block';
  document.getElementById('auth-register-form').style.display = 'none';
  document.getElementById('auth-modal-title').textContent = 'Sign In';
}

// ---- BOOKING ----
async function submitBooking() {
  if (!currentCustomer) return showToast('error', 'Silakan login terlebih dahulu');
  const pestTypeId = document.getElementById('booking-pest').value;
  const serviceDate = document.getElementById('booking-date').value;
  const serviceTime = document.getElementById('booking-time').value;
  const address = document.getElementById('booking-address').value.trim();
  const notes = document.getElementById('booking-notes').value.trim();

  if (!pestTypeId || !serviceDate || !serviceTime || !address) {
    return showToast('error', 'Semua field wajib diisi');
  }

  try {
    const res = await fetch('/api/bookings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId: currentCustomer.id, pestTypeId, serviceDate, serviceTime, address, notes })
    });
    const data = await res.json();
    if (res.ok) {
      showToast('success', `Booking berhasil! Nomor: ${data.booking.booking_number}`);
      document.getElementById('booking-pest').value = '';
      document.getElementById('booking-date').value = '';
      document.getElementById('booking-notes').value = '';
      fetchMyBookings();
      document.getElementById('dashboard-section').scrollIntoView({ behavior: 'smooth' });
    } else {
      showToast('error', data.error || 'Gagal membuat booking');
    }
  } catch (e) { showToast('error', 'Koneksi gagal'); }
}

// ---- MY BOOKINGS ----
async function fetchMyBookings() {
  if (!currentCustomer) return;
  try {
    const res = await fetch(`/api/bookings?customerId=${currentCustomer.id}`);
    const data = await res.json();
    renderBookings(data.bookings || []);
  } catch (e) { console.error(e); }
}

function renderBookings(bookings) {
  const el = document.getElementById('dashboard-bookings');
  if (bookings.length === 0) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><p>Belum ada booking.</p></div>`;
    return;
  }
  el.innerHTML = bookings.map(b => `
    <div class="booking-item">
      <div class="booking-item-header">
        <div>
          <strong style="font-size:1rem;">${b.bookingNumber}</strong>
          <span class="badge badge-${b.status.toLowerCase().replace(/ /g,'_')}" style="margin-left:0.5rem;">${b.status.replace(/_/g,' ')}</span>
        </div>
        <span style="font-size:0.8rem; color:#64748b;">${new Date(b.serviceDate).toLocaleDateString('id-ID', {day:'2-digit',month:'long',year:'numeric'})}</span>
      </div>
      <div class="booking-item-info">
        <div><span>🦟 Jenis Hama</span><br><strong>${b.pestType.name}</strong></div>
        <div><span>⏰ Waktu</span><br><strong>${b.serviceTime}</strong></div>
        <div><span>📍 Alamat</span><br><strong>${b.address}</strong></div>
        <div><span>👷 Teknisi</span><br><strong>${b.assignment ? b.assignment.technician.name : 'Belum ditugaskan'}</strong></div>
      </div>
      <div class="booking-item-actions">
        ${b.status === 'COMPLETED' && !b.feedback ? `<button class="btn btn-primary btn-sm" onclick="openFeedback('${b.id}','${b.bookingNumber}')">⭐ Beri Feedback</button>` : ''}
        ${b.feedback ? `<span style="font-size:0.8rem; color:#0b8a4f; font-weight:700;">⭐ ${'★'.repeat(b.feedback.rating)} Feedback diberikan</span>` : ''}
      </div>
    </div>
  `).join('');
}

// ---- TRACK BOOKING ----
async function trackBooking() {
  const num = document.getElementById('track-input').value.trim();
  if (!num) return showToast('error', 'Masukkan nomor booking');

  try {
    const res = await fetch('/api/bookings');
    const data = await res.json();
    const booking = (data.bookings || []).find(b => b.bookingNumber === num);
    const resultEl = document.getElementById('track-result');

    if (booking) {
      resultEl.style.display = 'block';
      resultEl.innerHTML = `
        <div class="track-result-row">
          <strong>${booking.bookingNumber}</strong>
          <span class="badge badge-${booking.status.toLowerCase().replace(/ /g,'_')}">${booking.status.replace(/_/g,' ')}</span>
        </div>
        <p>📅 Tanggal: <span>${new Date(booking.serviceDate).toLocaleDateString('id-ID')}</span></p>
        <p>⏰ Waktu: <span>${booking.serviceTime}</span></p>
        <p>🦟 Hama: <span>${booking.pestType.name}</span></p>
        <p>📍 Alamat: <span>${booking.address}</span></p>
        ${booking.assignment ? `<p>👷 Teknisi: <span>${booking.assignment.technician.name}</span></p>` : ''}
      `;
    } else {
      showToast('error', 'Booking tidak ditemukan');
      document.getElementById('track-result').style.display = 'none';
    }
  } catch (e) { showToast('error', 'Koneksi gagal'); }
}

// ---- FEEDBACK ----
function openFeedback(bookingId, bookingNumber) {
  document.getElementById('feedback-booking-id').value = bookingId;
  document.getElementById('feedback-booking-label').textContent = `Booking: ${bookingNumber}`;
  selectedFeedbackRating = 5;
  document.querySelectorAll('.star').forEach(s => s.classList.add('active'));
  document.getElementById('feedback-rating').value = 5;
  document.getElementById('feedback-text').value = '';
  openModal('modal-feedback');
}

async function submitFeedback() {
  const bookingId = document.getElementById('feedback-booking-id').value;
  const rating = parseInt(document.getElementById('feedback-rating').value);
  const feedbackText = document.getElementById('feedback-text').value.trim();
  if (!currentCustomer) return showToast('error', 'Login terlebih dahulu');

  try {
    const res = await fetch('/api/feedback', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId, customerId: currentCustomer.id, rating, feedback: feedbackText })
    });
    const data = await res.json();
    if (res.ok) {
      showToast('success', 'Terima kasih atas feedback Anda!');
      closeModal('modal-feedback');
      fetchMyBookings();
    } else {
      showToast('error', data.error || 'Gagal mengirim feedback');
    }
  } catch (e) { showToast('error', 'Koneksi gagal'); }
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
