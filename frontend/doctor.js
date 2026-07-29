const token = localStorage.getItem('token');
const role  = localStorage.getItem('role');
const name  = localStorage.getItem('userName');
const spec  = localStorage.getItem('specialization');

if (!token || role !== 'doctor') window.location.href = 'doctor-portal.html';

document.getElementById('doctorName').textContent = name || 'Doctor';
document.getElementById('doctorSpec').textContent = spec || '';

let isOnline = false;
let activeRoom = null;
let activeConsultationId = null;
let pollInterval = null;

async function toggleStatus() {
  const btn = document.getElementById('statusBtn');
  btn.disabled = true;
  try {
    const res = await fetch('/api/doctor/status', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    isOnline = data.is_online;
    updateStatusBtn();
    if (isOnline) startPolling(); else stopPolling();
  } finally {
    btn.disabled = false;
  }
}

function updateStatusBtn() {
  const btn = document.getElementById('statusBtn');
  if (isOnline) {
    btn.textContent = '🟢 Online';
    btn.className = 'status-btn online';
  } else {
    btn.textContent = '🔴 Go Online';
    btn.className = 'status-btn offline';
    document.getElementById('requestsContainer').innerHTML = `
      <div class="empty-state"><span>🟡</span><p>No pending requests. Go online to receive patient requests.</p></div>`;
    document.getElementById('requestCount').textContent = '0';
  }
}

function startPolling() {
  fetchRequests();
  pollInterval = setInterval(fetchRequests, 5000);
}

function stopPolling() {
  clearInterval(pollInterval);
  pollInterval = null;
}

async function fetchRequests() {
  try {
    const res = await fetch('/api/consult/pending', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const requests = await res.json();
    renderRequests(requests);
  } catch(e) {}
}

function renderRequests(requests) {
  const container = document.getElementById('requestsContainer');
  document.getElementById('requestCount').textContent = requests.length;

  if (!requests.length) {
    container.innerHTML = `<div class="empty-state"><span>✅</span><p>No pending requests right now.</p></div>`;
    return;
  }

  container.innerHTML = requests.map(r => `
    <div class="request-card" id="req-${r.id}">
      <div class="request-info">
        <h3>👤 ${r.patient_name}</h3>
        <p>📋 ${r.symptoms}</p>
        <span class="severity-badge severity-${r.severity}">${r.severity}</span>
      </div>
      <div class="request-actions">
        <button class="btn-accept" onclick="acceptRequest(${r.id}, '${r.room_id}', '${r.patient_name}', \`${r.symptoms}\`)">Accept</button>
        <button class="btn-decline" onclick="declineRequest(${r.id})">Decline</button>
      </div>
    </div>
  `).join('');
}

async function acceptRequest(id, roomId, patientName, symptoms) {
  const res = await fetch(`/api/consult/${id}/accept`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (res.ok) {
    localStorage.setItem('consultRoom', roomId);
    localStorage.setItem('consultId', id);
    localStorage.setItem('consultSymptoms', symptoms);
    window.location.href = 'consultation.html';
  }
}

async function declineRequest(id) {
  await fetch(`/api/consult/${id}/decline`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  document.getElementById(`req-${id}`)?.remove();
}

function joinConsultation() {
  if (activeRoom) {
    localStorage.setItem('consultRoom', activeRoom);
    localStorage.setItem('consultId', activeConsultationId);
    window.location.href = 'consultation.html';
  }
}

function logout() {
  // Set doctor offline before logout
  fetch('/api/doctor/status', { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` } })
    .finally(() => {
      localStorage.clear();
      window.location.href = 'landing.html';
    });
}
