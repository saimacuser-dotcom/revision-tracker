/* ─── CONFIG ─── */
const BASE = "https://revision-tracker-c4fr.onrender.com/api";

/* ─── STATE ─── */
let token           = localStorage.getItem("token");
let allProblems     = [];
let activeFilter    = "All";
let isLoginMode     = true;
let pendingDeleteId = null;

/* ─── BOOT ─── */
if (token) showApp();

/* ─── AUTH TOGGLE ─── */
function toggleAuth() {
  isLoginMode = !isLoginMode;
  document.getElementById("authTitle").textContent      = isLoginMode ? "Welcome back" : "Create account";
  document.getElementById("authSub").textContent        = isLoginMode ? "Sign in to continue your revision streak." : "Start tracking your DSA progress today.";
  document.getElementById("authBtn").textContent        = isLoginMode ? "Sign In" : "Register";
  document.getElementById("authToggleText").textContent = isLoginMode ? "Don't have an account?" : "Already have an account?";
  document.getElementById("authToggleLink").textContent = isLoginMode ? " Register" : " Sign in";
  document.getElementById("nameField").style.display    = isLoginMode ? "none" : "block";
}

/* ─── AUTH SUBMIT ─── */
async function submitAuth() {
  const email    = val("email").trim();
  const password = val("password").trim();

  if (!email || !password) {
    showToast("Fill in all fields", "error");
    return;
  }

  const btn = document.getElementById("authBtn");
  btn.classList.add("loading");

  try {
    const endpoint = isLoginMode ? "auth/login" : "auth/register";
    const body = isLoginMode
      ? { email, password }
      : { email, password, name: val("displayName") };

    const res  = await fetch(`${BASE}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const data = await res.json();

    if (res.ok && data.token) {
      token = data.token;
      localStorage.setItem("token", token);
      localStorage.setItem("userEmail", email);
      showApp();
      showToast("Signed in ✓", "success");
    } else {
      showToast(data.msg || "Auth failed", "error");
    }

  } catch {
    showToast("Server error", "error");
  }

  btn.classList.remove("loading");
}

/* ─── SHOW APP ─── */
function showApp() {
  document.getElementById("authPage").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");

  const stored = localStorage.getItem("userEmail") || "user";
  document.getElementById("userEmail").textContent  = stored;
  document.getElementById("userAvatar").textContent = stored.charAt(0).toUpperCase();

  getStreak();
  getTodayProblems();
  getProblems();
  loadHeatmap();
}

/* ─── LOGOUT ─── */
function logout() {
  localStorage.clear();
  location.reload();
}

/* ─── ADD PROBLEM ─── */
async function addProblem() {
  const name       = val("name").trim();
  const link       = val("link").trim();
  const difficulty = val("difficulty");

  if (!name) {
    showToast("Problem name required", "error");
    return;
  }

  try {
    const res = await fetch(`${BASE}/problem/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({ name, link, difficulty })
    });

    if (res.ok) {
      showToast("Added ✓", "success");
      document.getElementById("name").value = "";
      document.getElementById("link").value = "";
      getTodayProblems();
      getProblems();
    } else {
      showToast("Failed to add", "error");
    }

  } catch {
    showToast("Server error", "error");
  }
}

/* ─── GET STREAK ─── */
async function getStreak() {
  try {
    const res = await fetch(`${BASE}/user/streak`, {
      headers: { "Authorization": "Bearer " + token }
    });
    const data = await res.json();
    document.getElementById("streak").textContent = data.streak || 0;
  } catch {
    document.getElementById("streak").textContent = 0;
  }
}

/* ─── GET TODAY PROBLEMS ─── */
async function getTodayProblems() {
  try {
    const res = await fetch(`${BASE}/problem/today`, {
      headers: { "Authorization": "Bearer " + token }
    });
    const data = await res.json();
    renderTodayProblems(Array.isArray(data) ? data : []);
  } catch {
    renderTodayProblems([]);
  }
}

/* ─── RENDER TODAY ─── */
function renderTodayProblems(problems) {
  const list = document.getElementById("todayList");
  list.innerHTML = "";

  document.getElementById("todayBadge").textContent = problems.length;

  if (!problems.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🎉</div>
        <h4>All done!</h4>
        <p>No problems due today</p>
      </div>`;
    return;
  }

  problems.forEach(p => {
    const li = document.createElement("li");
    li.className = "problem-item";

    li.innerHTML = `
      <div class="problem-info">
        <div class="problem-name">${escHtml(p.name)}</div>
        <div class="problem-meta">
          <span class="diff-badge ${escHtml(p.difficulty || 'Easy')}">${escHtml(p.difficulty || 'Easy')}</span>
          <span class="due-tag today">Due today</span>
          ${p.link ? `<a class="problem-link" href="${escHtml(p.link)}" target="_blank" rel="noopener">↗ Link</a>` : ""}
        </div>
      </div>
      <button class="btn-mark-done" onclick="markDone('${p._id}', this)">Done ✓</button>
    `;

    list.appendChild(li);
  });
}

/* ─── MARK DONE ─── */
async function markDone(id, btn) {
  btn.disabled = true;
  btn.textContent = "Saving...";

  try {
    const res = await fetch(`${BASE}/problem/complete/${id}`, {
      method: "POST",
      headers: { "Authorization": "Bearer " + token }
    });

    const data = await res.json();

    if (res.ok) {
      btn.textContent = "Done ✓";

      if (data.streak !== undefined) {
        document.getElementById("streak").textContent = data.streak;
      }

      if (data.allDoneToday) {
        showToast(`🔥 Streak: ${data.streak}`, "success");
      } else {
        showToast("Marked ✓", "success");
      }

      getTodayProblems();
      loadHeatmap();

    } else {
      btn.disabled = false;
      btn.textContent = "Done ✓";
      showToast(data.msg || "Error", "error");
    }

  } catch {
    btn.disabled = false;
    btn.textContent = "Done ✓";
    showToast("Server error", "error");
  }
}

/* ─── GET ALL PROBLEMS ─── */
async function getProblems() {
  try {
    const res = await fetch(`${BASE}/problem/all`, {
      headers: { "Authorization": "Bearer " + token }
    });
    const data = await res.json();
    allProblems = Array.isArray(data) ? data : [];
  } catch {
    allProblems = [];
  }
  renderProblems();
  updateStats();
}

/* ─── UPDATE STATS ─── */
function updateStats() {
  const total  = allProblems.length;
  const easy   = allProblems.filter(p => p.difficulty === "Easy").length;
  const hard   = allProblems.filter(p => p.difficulty === "Hard").length;

  document.getElementById("totalCount").textContent = total;
  document.getElementById("easyCount").textContent  = easy;
  document.getElementById("hardCount").textContent  = hard;
  document.getElementById("countBadge").textContent = total;
}

/* ─── SET FILTER ─── */
function setFilter(filter, btn) {
  activeFilter = filter;

  document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");

  renderProblems();
}

/* ─── RENDER ALL PROBLEMS ─── */
function renderProblems() {
  const list = document.getElementById("list");
  list.innerHTML = "";

  const filtered = activeFilter === "All"
    ? allProblems
    : allProblems.filter(p => p.difficulty === activeFilter);

  if (!filtered.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <h4>No problems here</h4>
        <p>${activeFilter === "All" ? "Add your first problem above!" : `No ${activeFilter} problems yet.`}</p>
      </div>`;
    return;
  }

  filtered.forEach(p => {
    const li = document.createElement("li");
    li.className = "problem-item";

    li.innerHTML = `
      <div class="problem-info">
        <div class="problem-name">${escHtml(p.name)}</div>
        <div class="problem-meta">
          <span class="diff-badge ${escHtml(p.difficulty || 'Easy')}">${escHtml(p.difficulty || 'Easy')}</span>
          ${p.link ? `<a class="problem-link" href="${escHtml(p.link)}" target="_blank" rel="noopener">↗ Link</a>` : ""}
        </div>
      </div>
      <div class="problem-actions">
        <button class="action-btn" title="Delete" onclick="askDelete('${p._id}')">🗑</button>
      </div>
    `;

    list.appendChild(li);
  });
}

/* ─── TOGGLE ADD PANEL ─── */
function toggleAddPanel() {
  const panel = document.getElementById("addPanel");
  panel.classList.toggle("open");
}

/* ─── DELETE FLOW ─── */
function askDelete(id) {
  pendingDeleteId = id;
  document.getElementById("deleteModal").classList.remove("hidden");
}

function closeModal() {
  pendingDeleteId = null;
  document.getElementById("deleteModal").classList.add("hidden");
}

async function confirmDelete() {
  if (!pendingDeleteId) return;

  try {
    await fetch(`${BASE}/problem/${pendingDeleteId}`, {
      method: "DELETE",
      headers: { "Authorization": "Bearer " + token }
    });

    closeModal();
    getProblems();
    showToast("Deleted", "success");

  } catch {
    showToast("Error deleting", "error");
  }
}

/* ─── CLOSE MODAL ON OVERLAY CLICK ─── */
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("deleteModal").addEventListener("click", function(e) {
    if (e.target === this) closeModal();
  });
});

/* ─── HEATMAP ─── */
async function loadHeatmap() {
  try {
    const res = await fetch(`${BASE}/auth/heatmap`, {
      headers: { "Authorization": "Bearer " + token }
    });
    const data = await res.json();
    renderHeatmap(data);
  } catch {
    console.log("Heatmap error");
  }
}

function renderHeatmap(activity) {
  const container = document.getElementById("heatmap");
  container.innerHTML = "";

  const map = {};
  activity.forEach(a => { map[a.date] = a.count; });

  const today = new Date();

  for (let i = 89; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);

    const key   = d.toISOString().split("T")[0];
    const count = map[key] || 0;

    const cell = document.createElement("div");
    cell.classList.add("cell");

    if      (count === 0)          { /* default empty */ }
    else if (count <= 2)           cell.classList.add("low");
    else if (count <= 4)           cell.classList.add("medium");
    else if (count <= 6)           cell.classList.add("high");
    else                           cell.classList.add("max");

    cell.title = `${key}: ${count} solved`;
    container.appendChild(cell);
  }
}

/* ─── TOAST ─── */
let toastTimer = null;

function showToast(msg, type = "success") {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.className   = `show ${type}`;

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.className = "";
  }, 3000);
}

/* ─── UTIL ─── */
function val(id) {
  return document.getElementById(id).value;
}

function escHtml(s) {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}