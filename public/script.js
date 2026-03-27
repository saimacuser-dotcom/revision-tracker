/* ─── CONFIG ─── */
// Deployed backend URL on Render
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
  document.getElementById("authTitle").textContent      = isLoginMode ? "Welcome back"                             : "Create account";
  document.getElementById("authSub").textContent        = isLoginMode ? "Sign in to continue your revision streak." : "Start tracking your DSA progress today.";
  document.getElementById("authBtn").textContent        = isLoginMode ? "Sign In"                                  : "Register";
  document.getElementById("authToggleText").textContent = isLoginMode ? "Don't have an account?"                   : "Already have an account?";
  document.getElementById("authToggleLink").textContent = isLoginMode ? " Register"                                : " Sign in";
  document.getElementById("nameField").style.display    = isLoginMode ? "none"                                     : "block";
}

/* ─── SUBMIT AUTH ─── */
async function submitAuth() {
  const email    = val("email").trim();
  const password = val("password").trim();
  if (!email || !password) { showToast("Fill in all fields", "error"); return; }

  const btn = document.getElementById("authBtn");
  btn.classList.add("loading");
  btn.textContent = isLoginMode ? "Signing in…" : "Registering…";

  try {
    const endpoint = isLoginMode ? "auth/login" : "auth/register";
    const body     = isLoginMode
      ? { email, password }
      : { email, password, name: val("displayName") };

    const res  = await fetch(`${BASE}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json();

    if (data.token) {
      token = data.token;
      localStorage.setItem("token", token);
      localStorage.setItem("userEmail", email);
      showApp();
      showToast("Signed in successfully ✓", "success");
    } else {
      showToast(data.msg || "Auth failed", "error");
    }
  } catch (e) {
    showToast("Could not connect to server", "error");
  }

  btn.classList.remove("loading");
  btn.textContent = isLoginMode ? "Sign In" : "Register";
}

/* ─── SHOW APP ─── */
function showApp() {
  document.getElementById("authPage").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");

  const stored = localStorage.getItem("userEmail") || "user";
  document.getElementById("userEmail").textContent  = stored;
  document.getElementById("userAvatar").textContent = stored.charAt(0).toUpperCase();

  getTodayProblems();
  getProblems();
}

/* ─── LOGOUT ─── */
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("userEmail");
  location.reload();
}

/* ─── ADD PANEL TOGGLE ─── */
function toggleAddPanel() {
  document.getElementById("addPanel").classList.toggle("open");
}

/* ─── ADD PROBLEM ─── */
async function addProblem() {
  const name       = val("name").trim();
  const link       = val("link").trim();
  const difficulty = val("difficulty");

  if (!name) { showToast("Problem name is required", "error"); return; }

  try {
    const res  = await fetch(`${BASE}/problem/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify({ name, link, difficulty })
    });
    const data = await res.json();

    if (res.ok) {
      showToast(`"${name}" added ✓`, "success");
      document.getElementById("name").value = "";
      document.getElementById("link").value = "";
      getTodayProblems();
      getProblems();
    } else {
      showToast(data.msg || "Failed to add", "error");
    }
  } catch (e) {
    showToast("Server error", "error");
  }
}

/* ─── GET TODAY'S PROBLEMS ─── */
async function getTodayProblems() {
  try {
    const res  = await fetch(`${BASE}/problem/today`, {
      headers: { "Authorization": "Bearer " + token }
    });
    const data = await res.json();
    renderTodayProblems(Array.isArray(data) ? data : []);
  } catch (e) {
    renderTodayProblems([]);
  }
}

/* ─── RENDER TODAY ─── */
function renderTodayProblems(problems) {
  const list = document.getElementById("todayList");
  list.innerHTML = "";
  document.getElementById("todayBadge").textContent = problems.length;

  if (problems.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🎉</div>
        <h4>All caught up!</h4>
        <p>No problems due today. Come back tomorrow.</p>
      </div>`;
    return;
  }

  problems.forEach((p, i) => {
    const li = document.createElement("li");
    li.className = "problem-item";
    li.style.animationDelay = `${i * 40}ms`;
    li.id = `today-${p._id}`;

    li.innerHTML = `
      <div class="problem-info">
        <div class="problem-name">${escHtml(p.name)}</div>
        <div class="problem-meta">
          <span class="diff-badge ${p.difficulty}">${p.difficulty}</span>
          ${p.link ? `<a class="problem-link" href="${escHtml(p.link)}" target="_blank">↗ Open</a>` : ""}
        </div>
      </div>
      <button class="btn-mark-done" onclick="markDone('${p._id}', this)">Mark Done ✓</button>
    `;
    list.appendChild(li);
  });
}

/* ─── OTHER FUNCTIONS ─── */
async function markDone(id, btn) { /* same as before */ }
async function getProblems() { /* same as before */ }
function renderProblems() { /* same as before */ }
function askDelete(id) { /* same as before */ }
function closeModal() { /* same as before */ }
async function confirmDelete() { /* same as before */ }
function toggleDone(el) { /* same as before */ }
function setFilter(f, btn) { /* same as before */ }
function showSkeletons() { /* same as before */ }
function showToast(msg, type = "") { /* same as before */ }
function val(id) { return document.getElementById(id).value; }
function escHtml(s) { return (s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

document.addEventListener("keydown", e => {
  if (e.key === "Enter" && !document.getElementById("authPage").classList.contains("hidden")) submitAuth();
  if (e.key === "Escape") closeModal();
});