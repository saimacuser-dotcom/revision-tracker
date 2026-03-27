/* ─── CONFIG ─── */
const BASE = "https://revision-tracker-backend.onrender.com/api";
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

  /* ─── MARK DONE ─── */
  async function markDone(id, btn) {
    btn.disabled    = true;
    btn.textContent = "Saving…";

    try {
      const res  = await fetch(`${BASE}/problem/complete/${id}`, {
        method: "POST",
        headers: { "Authorization": "Bearer " + token }
      });
      const data = await res.json();

      if (res.ok) {
        const item = document.getElementById(`today-${id}`);
        if (item) { item.style.transition = "opacity 0.4s"; item.style.opacity = "0.35"; }
        btn.textContent = "Done ✓";
        document.getElementById("streak").textContent = data.streak;
        showToast(`🔥 Streak: ${data.streak} day${data.streak !== 1 ? "s" : ""}`, "success");
      } else {
        btn.disabled = false; btn.textContent = "Mark Done ✓";
        showToast(data.msg || "Error", "error");
      }
    } catch (e) {
      btn.disabled = false; btn.textContent = "Mark Done ✓";
      showToast("Server error", "error");
    }
  }

  /* ─── GET ALL PROBLEMS ─── */
  async function getProblems() {
    showSkeletons();
    try {
      const res  = await fetch(`${BASE}/problem/all`, {
        headers: { "Authorization": "Bearer " + token }
      });
      const data = await res.json();
      allProblems = Array.isArray(data) ? data : [];
    } catch (e) {
      allProblems = [];
    }
    renderProblems();
  }

  /* ─── RENDER ALL ─── */
  function renderProblems() {
    const list = document.getElementById("list");
    list.innerHTML = "";

    const filtered = activeFilter === "All"
      ? allProblems
      : allProblems.filter(p => p.difficulty === activeFilter);

    document.getElementById("totalCount").textContent = allProblems.length;
    document.getElementById("easyCount").textContent  = allProblems.filter(p => p.difficulty === "Easy").length;
    document.getElementById("hardCount").textContent  = allProblems.filter(p => p.difficulty === "Hard").length;
    document.getElementById("countBadge").textContent = filtered.length;

    if (filtered.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📭</div>
          <h4>${activeFilter === "All" ? "No problems yet" : "No " + activeFilter + " problems"}</h4>
          <p>${activeFilter === "All" ? "Add your first problem using the panel above." : "Try a different filter."}</p>
        </div>`;
      return;
    }

    const todayMs = new Date().setHours(0, 0, 0, 0);

    filtered.forEach((p, i) => {
      const li = document.createElement("li");
      li.className = "problem-item";
      li.style.animationDelay = `${i * 40}ms`;

      // Next upcoming revision date
      const upcoming = (p.revisionDates || [])
        .map(d => new Date(d).setHours(0, 0, 0, 0))
        .filter(d => d >= todayMs)
        .sort((a, b) => a - b);

      let dueTag = "";
      if (upcoming.length > 0) {
        const diff  = Math.round((upcoming[0] - todayMs) / 86400000);
        const label = diff === 0 ? "Due today" : diff === 1 ? "Due tomorrow" : `Due in ${diff}d`;
        const cls   = diff === 0 ? "due-tag today" : "due-tag";
        dueTag = `<span class="${cls}">${label}</span>`;
      }

      li.innerHTML = `
        <div class="problem-check" onclick="toggleDone(this)"></div>
        <div class="problem-info">
          <div class="problem-name">${escHtml(p.name)}</div>
          <div class="problem-meta">
            <span class="diff-badge ${p.difficulty}">${p.difficulty}</span>
            ${dueTag}
            ${p.link ? `<a class="problem-link" href="${escHtml(p.link)}" target="_blank">↗ Open problem</a>`
                     : `<span style="font-size:11px;color:var(--muted)">No link</span>`}
          </div>
        </div>
        <div class="problem-actions">
          <button class="action-btn" onclick="askDelete('${p._id}')" title="Delete">✕</button>
        </div>
      `;
      list.appendChild(li);
    });
  }

  /* ─── TOGGLE DONE (UI only) ─── */
  function toggleDone(el) {
    const item   = el.closest(".problem-item");
    const isDone = item.classList.toggle("done");
    el.textContent = isDone ? "✓" : "";
  }

  /* ─── FILTER ─── */
  function setFilter(f, btn) {
    activeFilter = f;
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    renderProblems();
  }

  /* ─── DELETE ─── */
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
    closeModal();
    try {
      const res = await fetch(`${BASE}/problem/${pendingDeleteId}`, {
        method: "DELETE",
        headers: { "Authorization": "Bearer " + token }
      });
      if (res.ok) {
        allProblems = allProblems.filter(p => p._id !== pendingDeleteId);
        renderProblems();
        showToast("Problem removed", "success");
      } else {
        showToast("Could not delete", "error");
      }
    } catch (e) {
      showToast("Server error", "error");
    }
  }

  /* ─── SKELETONS ─── */
  function showSkeletons() {
    document.getElementById("list").innerHTML =
      [1,2,3].map(() => `<div class="skeleton"></div>`).join("");
  }

  /* ─── TOAST ─── */
  function showToast(msg, type = "") {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.className = "show" + (type ? " " + type : "");
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.className = ""; }, 2800);
  }

  /* ─── HELPERS ─── */
  function val(id) { return document.getElementById(id).value; }

  function escHtml(s) {
    return (s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  document.addEventListener("keydown", e => {
    if (e.key === "Enter" && !document.getElementById("authPage").classList.contains("hidden")) submitAuth();
    if (e.key === "Escape") closeModal();
  });
