const token    = localStorage.getItem('token');
const role     = localStorage.getItem('role');
const userName = localStorage.getItem('userName');
const roomId   = localStorage.getItem('consultRoom');
const consultId= localStorage.getItem('consultId');
const symptoms = localStorage.getItem('consultSymptoms');

if (!token || !roomId) window.location.href = role === 'doctor' ? 'doctor.html' : 'index.html';

// Display name with Dr. prefix for doctors
const displayName = role === 'doctor' ? 'Dr. ' + userName : userName;

// Set local video label to own name
document.getElementById('localLabel').textContent = displayName + ' (You)';

// Show symptom summary for doctor
if (role === 'doctor' && symptoms) {
  document.getElementById('symptomSummary').style.display = 'block';
  document.getElementById('symptomText').textContent = symptoms;
}

// --- WebSocket Chat ---
const wsProtocol = location.protocol === 'https:' ? 'wss' : 'ws';
const ws = new WebSocket(`${wsProtocol}://${location.host}/api/consult/ws/${roomId}`);

ws.onopen = () => {
  setStatus('connected', '🟢 Connected');
  // Patient announces immediately; doctor announces after peerConnection is ready (in setupPeerConnection)
  if (role === 'patient') {
    ws.send(JSON.stringify({ type: 'join', role, name: displayName }));
  }
};

ws.onmessage = (e) => {
  const data = JSON.parse(e.data);
  if (data.type === 'join') {
    // Other person joined — update their video label and header
    document.getElementById('remoteLabel').textContent = data.name;
    document.getElementById('room-with').textContent = '· with ' + data.name;
    appendMsg(data.name + ' joined the room', 'system');
    // Doctor creates offer once patient has joined and peerConnection is ready
    if (role === 'doctor' && peerConnection) {
      peerConnection.createOffer()
        .then(offer => peerConnection.setLocalDescription(offer))
        .then(() => ws.send(JSON.stringify({ type: 'offer', offer: peerConnection.localDescription, name: displayName, role })));
    }
  } else if (data.type === 'system') {
    appendMsg(data.content, 'system');
  } else if (data.type === 'offer' || data.type === 'answer' || data.type === 'ice') {
    handleRTCSignal(data);
  } else {
    appendMsg(data.content, 'other', data.name);
  }
};

ws.onclose = () => setStatus('disconnected', '🔴 Disconnected');

function sendMessage() {
  const input = document.getElementById('msgInput');
  const content = input.value.trim();
  if (!content || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ role, name: displayName, content }));
  appendMsg(content, 'me', displayName);
  input.value = '';
}

function appendMsg(content, type, name = '') {
  const container = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = `msg ${type}`;
  if (name && type !== 'system') {
    div.innerHTML = `<div class="msg-name">${name}</div>${content}`;
  } else {
    div.textContent = content;
  }
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function setStatus(cls, text) {
  const el = document.getElementById('connStatus');
  el.className = `conn-status ${cls}`;
  el.textContent = text;
}

// --- WebRTC Video ---
let localStream, peerConnection;
const iceServers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ]
};

async function startVideo() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    document.getElementById('localVideo').srcObject = localStream;
    setupPeerConnection();
  } catch(e) {
    console.warn('Camera/mic not available:', e.message);
    appendMsg('Camera/mic not available. Chat only mode.', 'system');
  }
}

function setupPeerConnection() {
  peerConnection = new RTCPeerConnection(iceServers);
  localStream.getTracks().forEach(t => peerConnection.addTrack(t, localStream));

  peerConnection.ontrack = (e) => {
    document.getElementById('remoteVideo').srcObject = e.streams[0];
  };

  peerConnection.onicecandidate = (e) => {
    if (e.candidate && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ice', candidate: e.candidate, name: displayName, role }));
    }
  };

  // If doctor joined AFTER patient (patient already sent join), doctor triggers offer now
  if (role === 'doctor') {
    setTimeout(() => {
      ws.send(JSON.stringify({ type: 'join', role, name: displayName }));
    }, 500);
  }
}

let iceCandidateQueue = [];

async function handleRTCSignal(data) {
  if (!peerConnection) return;
  if (data.type === 'offer' && role !== data.role) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
    // Flush queued ICE candidates
    for (const c of iceCandidateQueue) await peerConnection.addIceCandidate(c);
    iceCandidateQueue = [];
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    ws.send(JSON.stringify({ type: 'answer', answer, name: displayName, role }));
  } else if (data.type === 'answer' && role !== data.role) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    // Flush queued ICE candidates
    for (const c of iceCandidateQueue) await peerConnection.addIceCandidate(c);
    iceCandidateQueue = [];
  } else if (data.type === 'ice' && role !== data.role) {
    const candidate = new RTCIceCandidate(data.candidate);
    if (peerConnection.remoteDescription) {
      await peerConnection.addIceCandidate(candidate);
    } else {
      iceCandidateQueue.push(candidate);
    }
  }
}

function toggleMic() {
  if (!localStream) return;
  const track = localStream.getAudioTracks()[0];
  if (!track) return;
  track.enabled = !track.enabled;
  const btn = document.getElementById('micBtn');
  btn.textContent = track.enabled ? '🎤 Mute' : '🔇 Unmute';
  btn.classList.toggle('muted', !track.enabled);
}

function toggleCam() {
  if (!localStream) return;
  const track = localStream.getVideoTracks()[0];
  if (!track) return;
  track.enabled = !track.enabled;
  const btn = document.getElementById('camBtn');
  btn.textContent = track.enabled ? '📷 Hide Cam' : '📷 Show Cam';
  btn.classList.toggle('muted', !track.enabled);
}

async function endConsultation() {
  if (consultId) {
    await fetch(`/api/consult/${consultId}/end`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` } });
  }
  localStream?.getTracks().forEach(t => t.stop());
  ws.close();
  localStorage.removeItem('consultRoom');
  localStorage.removeItem('consultId');
  localStorage.removeItem('consultSymptoms');
  window.location.href = role === 'doctor' ? 'doctor.html' : 'index.html';
}

startVideo();
