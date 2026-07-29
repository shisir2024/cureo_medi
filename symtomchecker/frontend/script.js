// ── State ──────────────────────────────────────────────────────────────────
const messagesEl  = document.getElementById("messages");
const form        = document.getElementById("chat-form");
const input       = document.getElementById("user-input");
const sendBtn     = document.getElementById("send-btn");
const agentStatus = document.getElementById("agent-status");

let conversation = [], turnCount = 0, allSymptoms = [], selectedLang = "en", sessionData = [];

const LANG_PLACEHOLDERS = { en:"Describe your symptoms...", hi:"अपने लक्षण बताएं...", es:"Describe tus síntomas...", fr:"Décrivez vos symptômes...", ar:"صف أعراضك...", zh:"描述您的症状..." };
const LANG_INSTRUCTIONS = { en:"", hi:" Please respond in Hindi.", es:" Please respond in Spanish.", fr:" Please respond in French.", ar:" Please respond in Arabic.", zh:" Please respond in Chinese." };

// ── Symptom → Body Part keyword map ───────────────────────────────────────
const SYMPTOM_BODY_MAP = {
  head: ["head","headache","migraine","dizziness","dizzy","scalp","skull","forehead","temple","eye","ear","nose","mouth","jaw","face","sinus","vision","hearing"],
  neck: ["neck","throat","stiff neck","cervical","swallow","lymph node"],
  chest: ["chest","heart","lung","breath","breathing","cough","palpitation","rib","sternum","breast","cardiac","respiratory","shortness of breath"],
  abdomen: ["stomach","abdomen","abdominal","belly","nausea","vomit","diarrhea","constipation","bowel","intestine","liver","kidney","spleen","gastric","bloat","cramp","indigestion"],
  pelvis: ["pelvis","pelvic","lower back","hip","groin","bladder","urinary","urine","menstrual","period","reproductive"],
  "left-arm": ["left arm","left elbow","left forearm","left bicep"],
  "right-arm": ["right arm","right elbow","right forearm","right bicep"],
  "left-shoulder": ["left shoulder"],
  "right-shoulder": ["right shoulder"],
  "left-hand": ["left hand","left wrist","left finger"],
  "right-hand": ["right hand","right wrist","right finger"],
  "left-leg": ["left leg","left knee","left thigh","left calf","left shin"],
  "right-leg": ["right leg","right knee","right thigh","right calf","right shin"],
  "left-foot": ["left foot","left ankle","left toe"],
  "right-foot": ["right foot","right ankle","right toe"],
};

function getBodyPartsFromSymptoms(symptoms) {
  const parts = new Set();
  if (!symptoms?.length) return parts;
  symptoms.forEach(symptom => {
    const s = symptom.toLowerCase();
    Object.entries(SYMPTOM_BODY_MAP).forEach(([part, keywords]) => {
      if (keywords.some(k => s.includes(k))) parts.add(part);
    });
  });
  return parts;
}

// ── Tabs ───────────────────────────────────────────────────────────────────
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add("active");
  });
});

// ── Body Map (click) ───────────────────────────────────────────────────────
const selectedParts = new Set();

document.querySelectorAll(".body-part").forEach(part => {
  part.addEventListener("click", () => {
    const partName = part.dataset.part;
    if (selectedParts.has(partName)) { selectedParts.delete(partName); part.classList.remove("selected"); }
    else { selectedParts.add(partName); part.classList.add("selected"); }
    updateSelectedParts();
    updateInputFromBodyMap();
  });
});

function updateSelectedParts() {
  const container = document.getElementById("selected-parts");
  container.innerHTML = "";
  selectedParts.forEach(partName => {
    const part = document.querySelector(`[data-part="${partName}"]`);
    const tag = document.createElement("div");
    tag.className = "part-tag";
    tag.innerHTML = `${part.dataset.symptom} <span>✕</span>`;
    tag.addEventListener("click", () => { selectedParts.delete(partName); part.classList.remove("selected"); updateSelectedParts(); updateInputFromBodyMap(); });
    container.appendChild(tag);
  });
}

function updateInputFromBodyMap() {
  if (!selectedParts.size) { input.value = ""; return; }
  const symptoms = [...selectedParts].map(p => document.querySelector(`[data-part="${p}"]`).dataset.symptom);
  input.value = "I have " + symptoms.join(", ");
}

// ── Body Map Auto-Glow from AI response ───────────────────────────────────
function glowBodyParts(symptoms, heatmapData) {
  // Clear all heat classes
  document.querySelectorAll(".body-part").forEach(p => {
    [...p.classList].forEach(c => { if (/heat-\d+|ai-glow/.test(c)) p.classList.remove(c); });
  });

  // Apply heatmap intensity if available
  if (heatmapData?.length) {
    heatmapData.forEach(({ part, intensity }) => {
      const el = document.querySelector(`[data-part="${part}"]`);
      if (el) {
        const level = Math.min(10, Math.max(1, Math.round(intensity)));
        el.classList.add(`heat-${level}`, "ai-glow");
      }
    });
    return;
  }

  // Fallback: keyword-based glow
  const parts = getBodyPartsFromSymptoms(symptoms);
  parts.forEach(partName => {
    const el = document.querySelector(`[data-part="${partName}"]`);
    if (el) el.classList.add("heat-5", "ai-glow");
  });

  // Switch to body map tab to show glow
  document.querySelector('[data-tab="bodymap"]').click();
}

// ── Agent Status Bar ───────────────────────────────────────────────────────
const steps = ["triage","symptom","diagnosis","treatment","referral","heatmap","health","web","vitals","radar","compare","report"];

function showAgentStatus() {
  agentStatus.classList.remove("hidden");
  steps.forEach(s => { const el = document.getElementById(`step-${s}`); if(el) el.classList.remove("active","done"); });
}

function activateStep(stepName) {
  const idx = steps.indexOf(stepName);
  steps.forEach((s, i) => {
    const el = document.getElementById(`step-${s}`);
    if (!el) return;
    el.classList.remove("active","done");
    if (i < idx) el.classList.add("done");
    if (i === idx) el.classList.add("active");
  });
}

function completeAllSteps() {
  steps.forEach(s => { const el = document.getElementById(`step-${s}`); if(el){ el.classList.remove("active"); el.classList.add("done"); } });
  setTimeout(() => agentStatus.classList.add("hidden"), 2500);
}

async function animateAgentSteps() {
  showAgentStatus();
  for (let i = 0; i < steps.length; i++) {
    await new Promise(r => setTimeout(r, i * 500));
    activateStep(steps[i]);
  }
}

// ── Timeline ───────────────────────────────────────────────────────────────
function updateTimeline(symptoms) {
  const container = document.getElementById("timeline-container");
  if (!symptoms?.length) return;
  turnCount++;
  const newSymptoms = symptoms.filter(s => !allSymptoms.includes(s));
  allSymptoms = [...new Set([...allSymptoms, ...symptoms])];
  if (container.querySelector(".empty-state")) container.innerHTML = "";
  const entry = document.createElement("div");
  entry.className = "timeline-entry";
  entry.innerHTML = `
    <div class="timeline-dot timeline-line"></div>
    <div class="timeline-body">
      <div class="timeline-turn">Turn ${turnCount}</div>
      <div class="timeline-symptoms">
        ${symptoms.map(s => `<span class="symptom-chip ${newSymptoms.includes(s)?"new":""}">${s}</span>`).join("")}
      </div>
    </div>`;
  container.appendChild(entry);
}

// ── Confidence Bars ────────────────────────────────────────────────────────
const LIKELIHOOD_WIDTH = { High:"85%", Medium:"55%", Low:"25%" };

function updateConfidence(conditions) {
  const container = document.getElementById("confidence-container");
  if (!conditions?.length) return;
  container.innerHTML = "";
  conditions.forEach(c => {
    const div = document.createElement("div");
    div.className = "condition-bar";
    div.innerHTML = `
      <div class="condition-name"><span>${c.name}</span><span class="likelihood-label likelihood-${c.likelihood}">${c.likelihood}</span></div>
      <div class="bar-track"><div class="bar-fill bar-${c.likelihood}" style="width:0%"></div></div>`;
    container.appendChild(div);
    setTimeout(() => div.querySelector(".bar-fill").style.width = LIKELIHOOD_WIDTH[c.likelihood]||"30%", 100);
  });
}

// ── Health Score Gauge ─────────────────────────────────────────────────────
function updateHealthScore(scoreData) {
  const container = document.getElementById("score-container");
  if (!scoreData?.healthScore) return;
  const score = scoreData.healthScore;
  const label = scoreData.scoreLabel || "Fair";
  const reason = scoreData.scoreReason || "";
  const color = score >= 75 ? "#059669" : score >= 50 ? "#d97706" : score >= 25 ? "#dc2626" : "#7f1d1d";
  const deg = Math.round((score / 100) * 180);

  container.innerHTML = `
    <div class="gauge-wrap">
      <div class="gauge-bg"></div>
      <div class="gauge-fill" style="background: conic-gradient(${color} 0deg ${deg}deg, var(--border) ${deg}deg 180deg, transparent 180deg)"></div>
      <div class="gauge-center">
        <div class="gauge-score" style="color:${color}">${score}</div>
        <div class="gauge-label">${label}</div>
      </div>
    </div>
    <p class="score-reason">${reason}</p>`;

  setTimeout(() => document.querySelector('[data-tab="score"]').click(), 800);
}

// ── Radar Chart ────────────────────────────────────────────────────────────
function updateRadar(radarData) {
  const container = document.getElementById("radar-container");
  if (!radarData || !Object.keys(radarData).length) return;

  const dims = ["severity","duration","symptomCount","emergencyRisk","ageRisk"];
  const labels = ["Severity","Duration","Symptoms","Emergency","Age Risk"];
  const cx = 100, cy = 100, r = 70;
  const angleStep = (2 * Math.PI) / dims.length;

  function point(i, val) {
    const angle = i * angleStep - Math.PI / 2;
    const dist = (val / 10) * r;
    return { x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle) };
  }

  // Grid circles
  let gridSvg = "";
  [2,4,6,8,10].forEach(v => {
    const pts = dims.map((_, i) => { const p = point(i, v); return `${p.x},${p.y}`; }).join(" ");
    gridSvg += `<polygon points="${pts}" fill="none" stroke="var(--border)" stroke-width="0.5"/>`;
  });

  // Axes
  let axesSvg = dims.map((_, i) => { const p = point(i, 10); return `<line x1="${cx}" y1="${cy}" x2="${p.x}" y2="${p.y}" class="radar-axis"/>`; }).join("");

  // Data shape
  const dataPoints = dims.map((d, i) => { const p = point(i, radarData[d]||0); return `${p.x},${p.y}`; }).join(" ");

  // Labels
  let labelsSvg = dims.map((d, i) => { const p = point(i, 12); return `<text x="${p.x}" y="${p.y}" class="radar-label">${labels[i]}</text>`; }).join("");

  // Dots
  let dotsSvg = dims.map((d, i) => { const p = point(i, radarData[d]||0); return `<circle cx="${p.x}" cy="${p.y}" r="3" class="radar-dot"/>`; }).join("");

  container.innerHTML = `
    <svg class="radar-svg" viewBox="0 0 200 200">
      ${gridSvg}${axesSvg}
      <polygon points="${dataPoints}" class="radar-shape"/>
      ${dotsSvg}${labelsSvg}
    </svg>`;
  setTimeout(() => document.querySelector('[data-tab="radar"]').click(), 1000);
}

// ── Vitals Dashboard ───────────────────────────────────────────────────────
const VITAL_ICONS = { temperature:"🌡️", heartRate:"💓", bloodPressure:"🩺", oxygenSaturation:"🫁", painLevel:"😣" };
const VITAL_NAMES = { temperature:"Temp", heartRate:"Heart Rate", bloodPressure:"Blood Pressure", oxygenSaturation:"O₂ Sat", painLevel:"Pain" };

function updateVitals(vitalsData) {
  const container = document.getElementById("vitals-container");
  if (!vitalsData || !Object.keys(vitalsData).length) return;
  const hasData = Object.values(vitalsData).some(v => v && v.value && v.value !== "null");
  if (!hasData) return;
  container.innerHTML = "";
  Object.entries(vitalsData).forEach(([key, v]) => {
    if (!v || !v.value || v.value === "null") return;
    const card = document.createElement("div");
    card.className = "vital-card";
    card.innerHTML = `
      <div class="vital-icon">${VITAL_ICONS[key]||"📊"}</div>
      <div class="vital-name">${VITAL_NAMES[key]||key}</div>
      <div class="vital-value">${v.value||"—"}</div>
      <span class="vital-status status-${v.status||"Unknown"}">${v.status||"Unknown"}</span>`;
    container.appendChild(card);
  });
  setTimeout(() => document.querySelector('[data-tab="vitals"]').click(), 600);
}

// ── Condition Comparison ───────────────────────────────────────────────────
function updateComparison(comparisons) {
  const container = document.getElementById("compare-container");
  if (!comparisons?.length) return;
  container.innerHTML = "";
  comparisons.forEach(c => {
    const card = document.createElement("div");
    card.className = "compare-card";
    const matchChips = (c.matchingSymptoms||[]).map(s => `<span class="match-chip chip-yes">✓ ${s}</span>`).join("");
    const noMatchChips = (c.nonMatchingSymptoms||[]).map(s => `<span class="match-chip chip-no">✗ ${s}</span>`).join("");
    card.innerHTML = `
      <div class="compare-card-header">
        <span class="compare-condition">${c.condition}</span>
        <span class="likelihood-label likelihood-${c.likelihood}">${c.likelihood}</span>
      </div>
      ${matchChips ? `<div class="compare-match"><div class="compare-match-title match-yes">✓ Matching</div>${matchChips}</div>` : ""}
      ${noMatchChips ? `<div class="compare-match"><div class="compare-match-title match-no">✗ Not Matching</div>${noMatchChips}</div>` : ""}
      ${c.keyFact ? `<div class="compare-fact">💡 ${c.keyFact}</div>` : ""}`;
    container.appendChild(card);
  });
  setTimeout(() => document.querySelector('[data-tab="compare"]').click(), 1200);
}

// ── Render Response ────────────────────────────────────────────────────────
function renderAssistantResponse(data) {
  let html = "";
  if (data.emergency) {
    html = `<span class="severity-badge severity-Emergency">🚨 EMERGENCY</span><p><strong>Please seek emergency care immediately.</strong></p><p>${data.summary}</p><p>${data.seeDoctor}</p>`;
  } else {
    html += `<span class="severity-badge severity-${data.severity}">${{Low:"🟢",Medium:"🟡",High:"🔴"}[data.severity]||""} ${data.severity}</span>`;
    html += `<p>${data.summary}</p>`;
    if (data.detectedSymptoms?.length) { html += `<div class="section-title">🩺 Detected Symptoms</div><ul>`; data.detectedSymptoms.forEach(s => html += `<li>${s}</li>`); html += `</ul>`; }
    if (data.possibleConditions?.length) { html += `<div class="section-title">🧬 Possible Categories</div><ul>`; data.possibleConditions.forEach(c => html += `<li><strong>${c.name}</strong> — ${c.likelihood}</li>`); html += `</ul>`; }
    if (data.homeCare?.length) { html += `<div class="section-title">💊 Self-Care</div><ul>`; data.homeCare.forEach(h => html += `<li>${h}</li>`); html += `</ul>`; }
    if (data.seeDoctor) html += `<div class="section-title">🏥 When to Seek Care</div><p>${data.seeDoctor}</p>`;
    if (data.warningSigns?.length) { html += `<div class="section-title">⚠️ Warning Signs</div><ul>`; data.warningSigns.forEach(w => html += `<li>${w}</li>`); html += `</ul>`; }
    if (data.followUpQuestions?.length) { html += `<div class="section-title">❓ Follow-up Questions</div><ul>`; data.followUpQuestions.forEach(q => html += `<li>${q}</li>`); html += `</ul>`; }
  }
  html += `<div class="disclaimer">${data.disclaimer}</div>`;

  const div = document.createElement("div");
  div.className = "message assistant";
  div.innerHTML = html;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  // Update all panels
  const viz = data.visualizations || {};
  updateTimeline(data.detectedSymptoms);
  updateConfidence(data.possibleConditions);
  glowBodyParts(data.detectedSymptoms, viz.heatmap);
  updateHealthScore(viz.healthScore);
  updateRadar(viz.radar);
  updateVitals(viz.vitals);
  updateComparison(viz.comparison);

  sessionData.push({ turn: turnCount, data });
}

// ── Chat Submit ────────────────────────────────────────────────────────────
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  const userDiv = document.createElement("div");
  userDiv.className = "message user";
  userDiv.textContent = text;
  messagesEl.appendChild(userDiv);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  conversation.push({ role: "user", content: text + (LANG_INSTRUCTIONS[selectedLang]||"") });
  input.value = "";
  selectedParts.clear();
  document.querySelectorAll(".body-part.selected").forEach(p => p.classList.remove("selected"));
  document.getElementById("selected-parts").innerHTML = "";
  sendBtn.disabled = true;

  const loading = document.createElement("div");
  loading.className = "message assistant loading";
  loading.textContent = "13 agents are analyzing…";
  messagesEl.appendChild(loading);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  animateAgentSteps();

  try {
    const res = await fetch("/api/chat", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ messages: conversation }) });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    loading.remove();
    completeAllSteps();
    conversation.push({ role:"assistant", content: JSON.stringify(data) });
    renderAssistantResponse(data);
  } catch (err) {
    loading.remove();
    agentStatus.classList.add("hidden");
    const errDiv = document.createElement("div");
    errDiv.className = "message assistant";
    errDiv.textContent = `Sorry, something went wrong: ${err.message}`;
    messagesEl.appendChild(errDiv);
  } finally {
    sendBtn.disabled = false;
    input.focus();
  }
});

// ── How It Works ──────────────────────────────────────────────────────────
document.getElementById("how-btn").addEventListener("click", () => document.getElementById("how-modal").classList.remove("hidden"));
document.getElementById("close-how").addEventListener("click", () => document.getElementById("how-modal").classList.add("hidden"));

// ── SOS ────────────────────────────────────────────────────────────────────
document.getElementById("sos-btn").addEventListener("click", () => document.getElementById("sos-modal").classList.remove("hidden"));
document.getElementById("close-sos").addEventListener("click", () => document.getElementById("sos-modal").classList.add("hidden"));
document.getElementById("find-hospitals-btn").addEventListener("click", () => {
  const list = document.getElementById("hospital-list");
  list.textContent = "📍 Locating...";
  navigator.geolocation?.getCurrentPosition(pos => {
    const { latitude: lat, longitude: lng } = pos.coords;
    list.innerHTML = `<p style="margin-bottom:0.5rem">📍 ${lat.toFixed(4)}, ${lng.toFixed(4)}</p><a href="https://www.google.com/maps/search/hospitals+near+me/@${lat},${lng},14z" target="_blank" style="color:var(--primary);font-weight:600;">🗺️ Open on Google Maps →</a>`;
  }, () => list.textContent = "Could not get location.");
});

// ── Language ───────────────────────────────────────────────────────────────
document.getElementById("lang-btn").addEventListener("click", () => document.getElementById("lang-modal").classList.remove("hidden"));
document.getElementById("close-lang").addEventListener("click", () => document.getElementById("lang-modal").classList.add("hidden"));
document.querySelectorAll(".lang-option").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".lang-option").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedLang = btn.dataset.lang;
    document.getElementById("lang-label").textContent = btn.dataset.lang.toUpperCase();
    input.placeholder = LANG_PLACEHOLDERS[selectedLang]||LANG_PLACEHOLDERS.en;
    document.getElementById("lang-modal").classList.add("hidden");
  });
});

// ── PDF ────────────────────────────────────────────────────────────────────
document.getElementById("pdf-btn").addEventListener("click", () => {
  if (!sessionData.length) { alert("No session data yet!"); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const PRI = [15,118,110], DARK = [15,118,110], MUTED = [100,100,100], BLACK = [30,30,30];
  let y = 20;

  function checkPage(needed = 10) { if (y + needed > 280) { doc.addPage(); y = 20; } }
  function heading(text, size=13, color=PRI) { checkPage(10); doc.setFontSize(size); doc.setTextColor(...color); doc.text(text, 20, y); y += size * 0.6 + 3; }
  function body(text, indent=20, color=BLACK) { checkPage(8); doc.setFontSize(9); doc.setTextColor(...color); const lines = doc.splitTextToSize(text, 170 - (indent-20)); doc.text(lines, indent, y); y += lines.length * 5 + 1; }
  function divider() { checkPage(6); doc.setDrawColor(220,220,220); doc.line(20, y, 190, y); y += 5; }
  function sectionTitle(emoji, text) { checkPage(10); doc.setFontSize(10); doc.setTextColor(...PRI); doc.text(`${emoji} ${text}`, 20, y); y += 7; }

  // ── Cover ──
  doc.setFillColor(15,118,110);
  doc.rect(0, 0, 210, 40, "F");
  doc.setFontSize(20); doc.setTextColor(255,255,255);
  doc.text("MediAssist AI — Full Health Report", 20, 18);
  doc.setFontSize(9); doc.setTextColor(200,240,235);
  doc.text(`Generated: ${new Date().toLocaleString()}   |   Turns: ${sessionData.length}`, 20, 28);
  doc.text("For educational purposes only — Not a medical diagnosis", 20, 35);
  y = 50;

  sessionData.forEach(({ turn, data }) => {
    const viz = data.visualizations || {};

    // Turn header
    checkPage(14);
    doc.setFillColor(240,253,250);
    doc.rect(18, y-4, 174, 10, "F");
    doc.setFontSize(11); doc.setTextColor(...DARK);
    const sev = data.emergency ? "🚨 EMERGENCY" : data.severity || "";
    doc.text(`Turn ${turn}  —  Severity: ${sev}`, 20, y+3); y += 12;

    // Summary
    if (data.summary) { sectionTitle("📋", "Summary"); body(data.summary); y += 2; }

    // Symptoms
    if (data.detectedSymptoms?.length) {
      sectionTitle("🩺", "Detected Symptoms");
      body(data.detectedSymptoms.join("  •  "), 24);
      y += 2;
    }

    // Affected Body Parts
    if (data.affectedBodyParts?.length) {
      sectionTitle("🫀", "Affected Body Parts");
      body(data.affectedBodyParts.join("  •  "), 24);
      y += 2;
    }

    // Diagnosis / Conditions
    if (data.possibleConditions?.length) {
      sectionTitle("🧬", "Possible Conditions (Diagnosis)");
      data.possibleConditions.forEach(c => {
        checkPage(6);
        doc.setFontSize(9); doc.setTextColor(...BLACK);
        doc.text(`  • ${c.name}`, 24, y);
        const lColor = c.likelihood==="High" ? [180,0,0] : c.likelihood==="Medium" ? [180,100,0] : [0,120,60];
        doc.setTextColor(...lColor);
        doc.text(`[${c.likelihood}]`, 160, y);
        y += 6;
      });
      y += 2;
    }

    // ❤️ Health Score
    if (viz.healthScore?.healthScore) {
      sectionTitle("❤️", "Health Score");
      const hs = viz.healthScore;
      body(`Score: ${hs.healthScore}/100  |  Label: ${hs.scoreLabel}`, 24);
      if (hs.scoreReason) body(`Reason: ${hs.scoreReason}`, 24, MUTED);
      y += 2;
    }

    // 📡 Radar
    if (viz.radar && Object.keys(viz.radar).length) {
      sectionTitle("📡", "Risk Radar");
      const r = viz.radar;
      const radarText = `Severity: ${r.severity}/10  |  Duration: ${r.duration}/10  |  Symptoms: ${r.symptomCount}/10  |  Emergency Risk: ${r.emergencyRisk}/10  |  Age Risk: ${r.ageRisk}/10`;
      body(radarText, 24);
      y += 2;
    }

    // 🌡️ Vitals
    if (viz.vitals && Object.values(viz.vitals).some(v => v.value && v.value !== "null")) {
      sectionTitle("🌡️", "Vitals");
      const VNAMES = { temperature:"Temperature", heartRate:"Heart Rate", bloodPressure:"Blood Pressure", oxygenSaturation:"O₂ Saturation", painLevel:"Pain Level" };
      Object.entries(viz.vitals).forEach(([k, v]) => {
        if (!v || !v.value || v.value === "null") return;
        checkPage(6);
        doc.setFontSize(9); doc.setTextColor(...BLACK);
        doc.text(`  • ${VNAMES[k]||k}: ${v.value}`, 24, y);
        const sColor = v.status==="High" || v.status==="Severe" ? [180,0,0] : v.status==="Normal" || v.status==="Mild" ? [0,120,60] : [100,100,100];
        doc.setTextColor(...sColor);
        doc.text(`[${v.status}]`, 160, y);
        y += 6;
      });
      y += 2;
    }

    // 🔬 Comparison
    if (viz.comparison?.length) {
      sectionTitle("🔬", "Condition Comparison");
      viz.comparison.forEach(c => {
        checkPage(10);
        doc.setFontSize(9); doc.setTextColor(...DARK); doc.setFont(undefined, "bold");
        doc.text(`  ${c.condition}`, 24, y); doc.setFont(undefined, "normal"); y += 5;
        if (c.matchingSymptoms?.length) body(`    ✓ Matching: ${c.matchingSymptoms.join(", ")}`, 24, [0,120,60]);
        if (c.nonMatchingSymptoms?.length) body(`    ✗ Not matching: ${c.nonMatchingSymptoms.join(", ")}`, 24, [180,0,0]);
        if (c.keyFact) body(`    💡 ${c.keyFact}`, 24, MUTED);
        y += 2;
      });
    }

    // 📊 Confidence
    if (data.possibleConditions?.length) {
      sectionTitle("📊", "Confidence Levels");
      data.possibleConditions.forEach(c => {
        checkPage(6);
        const pct = c.likelihood==="High" ? 85 : c.likelihood==="Medium" ? 55 : 25;
        doc.setFontSize(9); doc.setTextColor(...BLACK);
        doc.text(`  ${c.name}`, 24, y);
        doc.setDrawColor(220,220,220); doc.setFillColor(220,220,220);
        doc.rect(110, y-3, 60, 4, "F");
        const bColor = c.likelihood==="High" ? [220,38,38] : c.likelihood==="Medium" ? [217,119,6] : [5,150,105];
        doc.setFillColor(...bColor);
        doc.rect(110, y-3, 60*(pct/100), 4, "F");
        doc.setTextColor(...MUTED); doc.text(`${pct}%`, 173, y);
        y += 7;
      });
      y += 2;
    }

    // Self-Care
    if (data.homeCare?.length) {
      sectionTitle("💊", "Self-Care Recommendations");
      data.homeCare.forEach(h => body(`  • ${h}`, 24));
      y += 2;
    }

    // When to seek care
    if (data.seeDoctor) { sectionTitle("🏥", "When to Seek Care"); body(data.seeDoctor, 24); y += 2; }

    // Warning Signs
    if (data.warningSigns?.length) {
      sectionTitle("⚠️", "Warning Signs");
      data.warningSigns.forEach(w => body(`  • ${w}`, 24));
      y += 2;
    }

    divider();
  });

  // Footer
  checkPage(10);
  doc.setFontSize(8); doc.setTextColor(...MUTED);
  doc.text("This report is for educational purposes only and is not a medical diagnosis. Always consult a qualified healthcare professional.", 20, y);

  doc.save("mediassist-report.pdf");
});

// ── Close modals on backdrop ───────────────────────────────────────────────
document.querySelectorAll(".modal").forEach(modal => {
  modal.addEventListener("click", e => { if (e.target === modal) modal.classList.add("hidden"); });
});
