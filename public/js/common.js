// Auth check
function requireAuth(callback) {
  var token = localStorage.getItem('ps_token');
  if (!token) {
    window.location.href = '/login';
    return;
  }
  var username = localStorage.getItem('ps_username');
  var tbU = document.getElementById('tbU');
  var sbU = document.getElementById('sbU');
  if (tbU) tbU.textContent = username;
  if (sbU) sbU.textContent = username;
  updateTime();
  setInterval(updateTime, 1000);
  if (callback) callback();
}

// API fetch
async function apiFetch(url, options) {
  var token = localStorage.getItem('ps_token');
  options = options || {};
  options.headers = options.headers || {};
  options.headers['Content-Type'] = 'application/json';
  options.headers['Authorization'] = 'Bearer ' + token;
  try {
    var res = await fetch(url, options);
    if (res.status === 401) {
      localStorage.removeItem('ps_token');
      localStorage.removeItem('ps_username');
      window.location.href = '/login';
      return null;
    }
    return await res.json();
  } catch (e) {
    console.error(e);
    return null;
  }
}

// Logout
function doLogout() {
  localStorage.removeItem('ps_token');
  localStorage.removeItem('ps_username');
  window.location.href = '/login';
}

// Sidebar
function toggleSB() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sb-overlay').classList.toggle('on');
}
function closeSB() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sb-overlay').classList.remove('on');
}
function toggleAC(el) {
  var s = el.nextElementSibling;
  if (!s) return;
  s.classList.toggle('on');
}

// Dropdown
function toggleDrop(e) {
  e.stopPropagation();
  document.getElementById('tbDrop').classList.toggle('open');
}
function closeDrop() {
  var d = document.getElementById('tbDrop');
  if (d) d.classList.remove('open');
}
document.addEventListener('click', function() { closeDrop(); });

// Modal
function openM(id) { document.getElementById(id).classList.add('on'); }
function closeM(id) { document.getElementById(id).classList.remove('on'); }
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('modal-ov')) e.target.classList.remove('on');
});

// Time
function pad(n) { return n < 10 ? '0' + n : '' + n; }
function updateTime() {
  var n = new Date();
  var s = n.getFullYear() + '-' + pad(n.getMonth()+1) + '-' + pad(n.getDate()) + ' ' + pad(n.getHours()) + ':' + pad(n.getMinutes()) + ':' + pad(n.getSeconds());
  var el = document.getElementById('sbTime');
  if (el) el.textContent = s;
}