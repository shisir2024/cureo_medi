// ── State ──────────────────────────────────────────────────────────────────
let bookmarks = JSON.parse(localStorage.getItem("Cureo_bookmarks") || "[]");
let recentSearches = JSON.parse(localStorage.getItem("Cureo_recent") || "[]");
let flashcards = JSON.parse(localStorage.getItem("Cureo_flashcards") || "[]");
let currentTopic = null;
let quizAnswered = {};

// ── Mode Toggle ────────────────────────────────────────────────────────────
document.getElementById("mode-assistant").addEventListener("click", () => {
  document.getElementById("mode-assistant").classList.add("active");
  document.getElementById("mode-learn").classList.remove("active");
  document.querySelector(".layout").classList.remove("hidden");
  document.getElementById("learn-mode").classList.add("hidden");
  document.getElementById("pdf-btn").style.display = "";
  document.getElementById("lang-btn").style.display = "";
});

document.getElementById("mode-learn").addEventListener("click", () => {
  document.getElementById("mode-learn").classList.add("active");
  document.getElementById("mode-assistant").classList.remove("active");
  document.querySelector(".layout").classList.add("hidden");
  document.getElementById("learn-mode").classList.remove("hidden");
  document.getElementById("pdf-btn").style.display = "none";
  document.getElementById("lang-btn").style.display = "none";
  renderBookmarks();
  renderRecent();
  renderFlashcards();
});

// ── Search ─────────────────────────────────────────────────────────────────
document.getElementById("learn-search-btn").addEventListener("click", doSearch);
document.getElementById("learn-input").addEventListener("keydown", e => {
  if (e.key === "Enter") doSearch();
});

document.querySelectorAll(".subject-chip").forEach(chip => {
  chip.addEventListener("click", () => {
    document.querySelectorAll(".subject-chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    document.getElementById("learn-input").value = chip.dataset.subject;
    doSearch();
  });
});

document.querySelectorAll(".popular-chip").forEach(chip => {
  chip.addEventListener("click", () => {
    document.getElementById("learn-input").value = chip.dataset.topic;
    doSearch();
  });
});

async function doSearch() {
  const topic = document.getElementById("learn-input").value.trim();
  if (!topic) return;

  showLearnLoading();
  const btn = document.getElementById("learn-search-btn");
  btn.disabled = true;
  quizAnswered = {};

  try {
    const [learnRes, quizRes] = await Promise.all([
      fetch("/api/learn", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic }) }),
      fetch("/api/quiz",  { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic }) })
    ]);
    const learnData = await learnRes.json();
    const quizData  = await quizRes.json();

    currentTopic = learnData.topic || topic;
    addToRecent(currentTopic);
    renderLearnResult(learnData, quizData);
  } catch (err) {
    showLearnError(err.message);
  } finally {
    btn.disabled = false;
  }
}

// ── Render Result ──────────────────────────────────────────────────────────
function renderLearnResult(data, quizData) {
  document.getElementById("learn-empty").classList.add("hidden");
  const container = document.getElementById("learn-result");
  container.classList.remove("hidden");

  const isBookmarked = bookmarks.includes(data.topic);

  container.innerHTML = `
    <div class="result-header">
      <div>
        <div class="result-topic">${data.topic || "—"}</div>
        <div class="result-meta">
          <span class="result-subject-badge">📚 ${data.subject || "General"}</span>
          <span class="result-difficulty diff-${data.difficulty || "Basic"}">${data.difficulty || "Basic"}</span>
        </div>
      </div>
      <div class="result-actions">
        <button class="action-btn ${isBookmarked ? "bookmarked" : ""}" id="bookmark-btn">
          ${isBookmarked ? "🔖 Bookmarked" : "🔖 Bookmark"}
        </button>
      </div>
    </div>

    <div class="result-card">
      <div class="result-card-title">📋 Summary</div>
      <p class="result-summary">${data.summary || ""}</p>
    </div>

    <div class="result-card">
      <div class="result-card-title">📖 Explanation</div>
      <p class="result-explanation">${data.explanation || ""}</p>
    </div>

    ${data.keyPoints?.length ? `
    <div class="result-card">
      <div class="result-card-title">🔑 Key Points</div>
      <div class="key-points">
        ${data.keyPoints.map((pt, i) => `
          <div class="key-point">
            <span class="key-point-num">${i + 1}</span>
            <span>${pt}</span>
            <button class="key-point-save" data-point="${encodeURIComponent(pt)}">+ Flashcard</button>
          </div>`).join("")}
      </div>
    </div>` : ""}

    ${data.mnemonic ? `
    <div class="mnemonic-box">
      <span class="mnemonic-icon">🧠</span>
      <div><strong>Mnemonic:</strong> ${data.mnemonic}</div>
    </div>` : ""}

    ${data.clinicalRelevance ? `
    <div class="result-card">
      <div class="result-card-title">🏥 Clinical Relevance</div>
      <p class="result-explanation">${data.clinicalRelevance}</p>
    </div>` : ""}

    ${data.neetTip ? `
    <div class="neet-tip-box">
      <span class="neet-tip-icon">🎯</span>
      <div><strong>NEET Tip:</strong> ${data.neetTip}</div>
    </div>` : ""}

    ${data.relatedTopics?.length ? `
    <div class="result-card">
      <div class="result-card-title">🔗 Related Topics</div>
      <div class="related-chips">
        ${data.relatedTopics.map(t => `<button class="related-chip" data-topic="${t}">${t}</button>`).join("")}
      </div>
    </div>` : ""}

    <div class="result-card quiz-section">
      <div class="quiz-header">
        <div class="quiz-title">🧪 Practice Quiz</div>
        <div class="quiz-score-badge" id="quiz-score">0 / ${quizData.questions?.length || 5} correct</div>
      </div>
      ${renderQuiz(quizData)}
    </div>
  `;

  // Bookmark button
  document.getElementById("bookmark-btn").addEventListener("click", () => toggleBookmark(data.topic));

  // Flashcard save buttons
  container.querySelectorAll(".key-point-save").forEach(btn => {
    btn.addEventListener("click", () => {
      const point = decodeURIComponent(btn.dataset.point);
      saveFlashcard(point, data.topic);
      btn.textContent = "✓ Saved";
      btn.style.color = "var(--primary)";
      btn.disabled = true;
    });
  });

  // Related topic chips
  container.querySelectorAll(".related-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.getElementById("learn-input").value = chip.dataset.topic;
      doSearch();
    });
  });

  // Quiz option clicks
  container.querySelectorAll(".quiz-option").forEach(opt => {
    opt.addEventListener("click", () => handleQuizAnswer(opt));
  });
}

// ── Quiz ───────────────────────────────────────────────────────────────────
function renderQuiz(quizData) {
  if (!quizData.questions?.length) return `<p class="sidebar-empty">No quiz available</p>`;
  return quizData.questions.map(q => `
    <div class="quiz-question" id="quiz-q-${q.id}">
      <div class="quiz-q-num">Question ${q.id}</div>
      <div class="quiz-q-text">${q.question}</div>
      <div class="quiz-options">
        ${Object.entries(q.options).map(([letter, text]) => `
          <div class="quiz-option" data-qid="${q.id}" data-letter="${letter}" data-correct="${q.correct}" data-explanation="${encodeURIComponent(q.explanation || "")}">
            <span class="option-letter">${letter}</span>
            <span>${text}</span>
          </div>`).join("")}
      </div>
      <div class="quiz-explanation" id="quiz-exp-${q.id}"></div>
    </div>`).join("");
}

let quizScore = 0;
let quizTotal = 0;

function handleQuizAnswer(opt) {
  const qid = opt.dataset.qid;
  if (quizAnswered[qid]) return;
  quizAnswered[qid] = true;

  const correct = opt.dataset.correct;
  const chosen = opt.dataset.letter;
  const explanation = decodeURIComponent(opt.dataset.explanation);

  const allOpts = document.querySelectorAll(`.quiz-option[data-qid="${qid}"]`);
  allOpts.forEach(o => {
    o.classList.add("answered");
    if (o.dataset.letter === correct) o.classList.add("show-correct");
  });

  if (chosen === correct) {
    opt.classList.add("correct");
    quizScore++;
  } else {
    opt.classList.add("wrong");
  }

  quizTotal++;
  document.getElementById("quiz-score").textContent = `${quizScore} / ${quizTotal} correct`;

  const expEl = document.getElementById(`quiz-exp-${qid}`);
  if (expEl) { expEl.textContent = `💡 ${explanation}`; expEl.classList.add("show"); }
}

// ── Loading / Error ────────────────────────────────────────────────────────
function showLearnLoading() {
  document.getElementById("learn-empty").classList.add("hidden");
  const container = document.getElementById("learn-result");
  container.classList.remove("hidden");
  quizScore = 0; quizTotal = 0;
  container.innerHTML = `
    <div class="learn-loading-card">
      <div class="learn-spinner"></div>
      <p>Fetching explanation and generating quiz…</p>
    </div>`;
}

function showLearnError(msg) {
  const container = document.getElementById("learn-result");
  container.innerHTML = `<div class="learn-loading-card"><p style="color:var(--danger)">❌ Error: ${msg}</p></div>`;
}

// ── Bookmarks ──────────────────────────────────────────────────────────────
function toggleBookmark(topic) {
  const idx = bookmarks.indexOf(topic);
  if (idx === -1) {
    bookmarks.unshift(topic);
    const btn = document.getElementById("bookmark-btn");
    if (btn) { btn.textContent = "🔖 Bookmarked"; btn.classList.add("bookmarked"); }
  } else {
    bookmarks.splice(idx, 1);
    const btn = document.getElementById("bookmark-btn");
    if (btn) { btn.textContent = "🔖 Bookmark"; btn.classList.remove("bookmarked"); }
  }
  localStorage.setItem("Cureo_bookmarks", JSON.stringify(bookmarks));
  renderBookmarks();
}

function renderBookmarks() {
  const el = document.getElementById("bookmarks-list");
  if (!bookmarks.length) { el.innerHTML = `<p class="sidebar-empty">No bookmarks yet</p>`; return; }
  el.innerHTML = bookmarks.map(t => `
    <div class="bookmark-item">
      <span onclick="searchTopic('${t}')">${t}</span>
      <button class="remove-btn" onclick="removeBookmark('${t}')">✕</button>
    </div>`).join("");
}

function removeBookmark(topic) {
  bookmarks = bookmarks.filter(b => b !== topic);
  localStorage.setItem("Cureo_bookmarks", JSON.stringify(bookmarks));
  renderBookmarks();
}

// ── Recent ─────────────────────────────────────────────────────────────────
function addToRecent(topic) {
  recentSearches = [topic, ...recentSearches.filter(r => r !== topic)].slice(0, 8);
  localStorage.setItem("Cureo_recent", JSON.stringify(recentSearches));
  renderRecent();
}

function renderRecent() {
  const el = document.getElementById("recent-list");
  if (!recentSearches.length) { el.innerHTML = `<p class="sidebar-empty">No recent searches</p>`; return; }
  el.innerHTML = recentSearches.map(t => `
    <div class="recent-item">
      <span onclick="searchTopic('${t}')">${t}</span>
      <button class="remove-btn" onclick="removeRecent('${t}')">✕</button>
    </div>`).join("");
}

function removeRecent(topic) {
  recentSearches = recentSearches.filter(r => r !== topic);
  localStorage.setItem("Cureo_recent", JSON.stringify(recentSearches));
  renderRecent();
}

// ── Flashcards ─────────────────────────────────────────────────────────────
function saveFlashcard(point, topic) {
  flashcards.unshift({ point, topic });
  localStorage.setItem("Cureo_flashcards", JSON.stringify(flashcards));
  renderFlashcards();
}

function renderFlashcards() {
  const el = document.getElementById("flashcards-list");
  document.getElementById("flashcard-count").textContent = flashcards.length;
  if (!flashcards.length) { el.innerHTML = `<p class="sidebar-empty">Save key points as flashcards</p>`; return; }
  el.innerHTML = flashcards.slice(0, 10).map((fc, i) => `
    <div class="flashcard-item">
      <span>${fc.point}</span>
      <button class="remove-btn" onclick="removeFlashcard(${i})">✕</button>
    </div>`).join("");
}

function removeFlashcard(idx) {
  flashcards.splice(idx, 1);
  localStorage.setItem("Cureo_flashcards", JSON.stringify(flashcards));
  renderFlashcards();
}

// ── Helper ─────────────────────────────────────────────────────────────────
function searchTopic(topic) {
  document.getElementById("learn-input").value = topic;
  doSearch();
}
