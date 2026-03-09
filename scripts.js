/* ══════════════════════════════════════════════════════
   RAGHVENDRA SAHU — PORTFOLIO  •  script.js
   ══════════════════════════════════════════════════════
   ⚙️  CONFIGURATION — update these before deploying
══════════════════════════════════════════════════════ */

const CONFIG = {
  // ─── GitHub ─────────────────────────────────────────
  githubUsername: "raigenlabs",         // ✅ updated to raigenlabs

  // ─── LeetCode ───────────────────────────────────────
  leetcodeUsername: "raghvendrasahu",  // ✅ your LeetCode handle

  // ─── GitHub Contribution Graph config (from Config.tsx) ───
  ghContrib: {
    apiUrl: "https://github-contributions-api.deno.dev",
    blockSize: 11,
    blockMargin: 3,
    fontSize: 11,
    maxLevel: 4,
    months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    weekdays: ["", "M", "", "W", "", "F", ""],
    // Dark theme palette — identical to Config.tsx theme.dark
    colors: [
      "rgb(22,27,34)",    // level 0 — no contributions
      "rgb(14,68,41)",    // level 1
      "rgb(0,109,50)",    // level 2
      "rgb(38,166,65)",   // level 3
      "rgb(57,211,83)",   // level 4
    ],
  },

  // ─── Spotify ────────────────────────────────────────
  // spotifyApiUrl:  "/api/spotify",
  // spotifyEnabled: false,

  // ─── Visitor Counter ────────────────────────────────

};

/* ══════════════════════════════════════════════════════
   CLOCK
══════════════════════════════════════════════════════ */
function startClock() {
  const el = document.getElementById("hero-clock");
  if (!el) return;

  const tick = () => {
    const now = new Date();

    const h = String(now.getHours()).padStart(2, "0");
    const m = String(now.getMinutes()).padStart(2, "0");
    const s = String(now.getSeconds()).padStart(2, "0");
    const ms = String(now.getMilliseconds()).padStart(3, "0");

    el.textContent = `${h}:${m}:${s}.${ms}`;
  };

  tick();
  setInterval(tick, 10); // update every 10ms
}


/* ══════════════════════════════════════════════════════
   SCROLL REVEAL
══════════════════════════════════════════════════════ */
function initReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
  );
  document.querySelectorAll(".reveal").forEach(el => observer.observe(el));
}

/* ══════════════════════════════════════════════════════
   NAV SCROLL
══════════════════════════════════════════════════════ */
function initNav() {
  const nav = document.getElementById("nav");
  if (!nav) return;
  window.addEventListener("scroll", () => {
    nav.classList.toggle("scrolled", window.scrollY > 50);
  }, { passive: true });
}

/* ══════════════════════════════════════════════════════
   PROJECT TOGGLE (main / fun)
══════════════════════════════════════════════════════ */
function initProjectToggle() {
  const btns = document.querySelectorAll(".toggle-btn");
  const cards = document.querySelectorAll(".project-card");

  btns.forEach(btn => {
    btn.addEventListener("click", () => {
      btns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const filter = btn.dataset.filter;
      cards.forEach(card => {
        card.classList.toggle("hidden", card.dataset.type !== filter);
      });
    });
  });

  const showAllBtn = document.getElementById("show-all-btn");
  if (showAllBtn) {
    showAllBtn.addEventListener("click", () => {
      cards.forEach(c => c.classList.remove("hidden"));
      btns.forEach(b => b.classList.remove("active"));
    });
  }

  // ← ADD THIS: activate "main" filter on page load
  const defaultBtn = document.querySelector('.toggle-btn[data-filter="main"]');
  if (defaultBtn) defaultBtn.click();
}

/* ══════════════════════════════════════════════════════
   GITHUB STARS
══════════════════════════════════════════════════════ */
async function loadGithubStars() {
  const el = document.getElementById("gh-stars-count");
  if (!el) return;
  try {
    const res = await fetch(
      `https://api.github.com/users/${CONFIG.githubUsername}/repos?sort=stars&per_page=100`
    );
    if (!res.ok) throw new Error();
    const repos = await res.json();
    if (repos && repos.length > 0) {
      const totalStars = repos.reduce((sum, r) => sum + r.stargazers_count, 0);
      el.textContent = totalStars;
    }
  } catch {
    el.textContent = "—";
  }
}

/* ══════════════════════════════════════════════════════
   GITHUB CONTRIBUTION GRAPH
   ─────────────────────────────────────────────────────
   Ported 1-to-1 from Github.tsx + Config.tsx.
   
   What it does:
   1. Fetches  https://github-contributions-api.deno.dev/{username}.json
   2. Maps contributionLevel string → number 0–4  (LEVEL_MAP, same as Github.tsx)
   3. Builds a full 365-day rolling window        (buildFullYearData, same logic)
   4. Draws on <canvas>: month labels, weekday labels, rounded colour blocks
   5. Attaches hover tooltip showing count + date
   6. Shows loading spinner and error fallback state (same messages as Config.tsx)
══════════════════════════════════════════════════════ */

// Mirrors contributionLevelMap in Github.tsx exactly
const LEVEL_MAP = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
};

/**
 * Mirrors buildFullYearData() from Github.tsx exactly.
 * Sorts valid contributions, then fills every calendar day
 * from (today − 1 year) to today, inserting {count:0, level:0} for missing days.
 */
function buildFullYearData(validContribs) {
  const sorted = [...validContribs].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  const today = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(today.getFullYear() - 1);

  const fullYear = [];
  const cursor = new Date(oneYearAgo);

  while (cursor <= today) {
    const dateStr = cursor.toISOString().split("T")[0];
    const existing = sorted.find(c => c.date === dateStr);
    fullYear.push(existing || { date: dateStr, count: 0, level: 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  return fullYear;
}

/**
 * Draws the contribution calendar onto the canvas.
 * Layout:  LEFT_LABEL_W px of weekday labels | week columns
 *          TOP_LABEL_H  px of month labels   | block rows
 */
function drawContributionCalendar(canvas, days) {
  const cfg = CONFIG.ghContrib;
  const BS = cfg.blockSize;
  const BM = cfg.blockMargin;
  const STEP = BS + BM;
  const ROWS = 7;

  const LEFT_LABEL_W = 22;
  const TOP_LABEL_H = 18;

  // Pad the start so the first day aligns to the correct weekday row
  const firstDOW = new Date(days[0].date).getDay(); // 0 = Sunday
  const padded = [...Array(firstDOW).fill(null), ...days];
  const COLS = Math.ceil(padded.length / ROWS);

  const W = LEFT_LABEL_W + COLS * STEP - BM;
  const H = TOP_LABEL_H + ROWS * STEP - BM;

  const DPR = window.devicePixelRatio || 1;
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  canvas.style.width = W + "px";
  canvas.style.height = H + "px";
  canvas.style.display = "block";

  const ctx = canvas.getContext("2d");
  ctx.scale(DPR, DPR);
  ctx.clearRect(0, 0, W, H);

  // ── Month labels (top row) ────────────────────────────
  ctx.font = `${cfg.fontSize}px 'JetBrains Mono', monospace`;
  ctx.fillStyle = "rgba(240,237,232,0.3)";
  ctx.textBaseline = "top";

  let lastMonth = -1;
  for (let col = 0; col < COLS; col++) {
    const realIdx = col * ROWS - firstDOW;
    if (realIdx < 0 || realIdx >= days.length) continue;
    const month = new Date(days[realIdx].date).getMonth();
    if (month !== lastMonth) {
      ctx.fillText(cfg.months[month], LEFT_LABEL_W + col * STEP, 2);
      lastMonth = month;
    }
  }

  // ── Weekday labels (Mon, Wed, Fri on left) ────────────
  ctx.textBaseline = "middle";
  cfg.weekdays.forEach((label, row) => {
    if (!label) return;
    ctx.fillText(label, 0, TOP_LABEL_H + row * STEP + BS / 2);
  });

  // ── Contribution blocks ───────────────────────────────
  padded.forEach((day, i) => {
    const col = Math.floor(i / ROWS);
    const row = i % ROWS;
    const x = LEFT_LABEL_W + col * STEP;
    const y = TOP_LABEL_H + row * STEP;
    ctx.fillStyle = day ? cfg.colors[day.level] : cfg.colors[0];
    ctx.beginPath();
    ctx.roundRect(x, y, BS, BS, 2);
    ctx.fill();
  });

  // Store layout data for tooltip
  canvas._days = days;
  canvas._firstDOW = firstDOW;
  canvas._layout = { LEFT_LABEL_W, TOP_LABEL_H, STEP, BS, ROWS };
}

/** Hover tooltip — shows "N contributions on Day, Month Date" */
function attachContribTooltip(canvas) {
  // Remove old tooltip if re-rendered
  const old = document.getElementById("gh-contrib-tip");
  if (old) old.remove();

  const tip = document.createElement("div");
  tip.id = "gh-contrib-tip";
  tip.style.cssText = `
    position:fixed; z-index:300; pointer-events:none;
    background:rgba(13,13,13,0.96);
    border:1px solid rgba(255,255,255,0.13);
    color:#f0ede8;
    font-family:'JetBrains Mono',monospace;
    font-size:11px; padding:5px 11px; border-radius:6px;
    white-space:nowrap; opacity:0; transition:opacity 0.12s;
    box-shadow: 0 4px 16px rgba(0,0,0,0.4);
  `;
  document.body.appendChild(tip);

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  canvas.addEventListener("mousemove", (e) => {
    if (!canvas._days || !canvas._layout) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = parseFloat(canvas.style.width) / rect.width;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleX;

    const { LEFT_LABEL_W, TOP_LABEL_H, STEP, BS, ROWS } = canvas._layout;
    const col = Math.floor((mx - LEFT_LABEL_W) / STEP);
    const row = Math.floor((my - TOP_LABEL_H) / STEP);

    if (col < 0 || row < 0 || row >= ROWS) { tip.style.opacity = "0"; return; }

    // Confirm cursor is inside a block (not in gap)
    const bx = LEFT_LABEL_W + col * STEP;
    const by = TOP_LABEL_H + row * STEP;
    if (mx < bx || mx > bx + BS || my < by || my > by + BS) {
      tip.style.opacity = "0"; return;
    }

    const paddedIdx = col * ROWS + row;
    const realIdx = paddedIdx - canvas._firstDOW;
    if (realIdx < 0 || realIdx >= canvas._days.length) { tip.style.opacity = "0"; return; }

    const day = canvas._days[realIdx];
    const d = new Date(day.date + "T12:00:00");
    tip.textContent = day.count === 0
      ? `No contributions on ${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`
      : `${day.count} contribution${day.count !== 1 ? "s" : ""} on ${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;

    tip.style.left = (e.clientX + 12) + "px";
    tip.style.top = (e.clientY - 30) + "px";
    tip.style.opacity = "1";
  });

  canvas.addEventListener("mouseleave", () => { tip.style.opacity = "0"; });
}

async function loadGithubContributions() {
  const wrapper = document.getElementById("gh-contribution-wrapper");
  const loadingEl = document.getElementById("gh-loading");
  const canvas = document.getElementById("gh-canvas");
  const totalLabel = document.getElementById("gh-total-label");
  const cfg = CONFIG.ghContrib;

  if (!canvas || !wrapper) return;

  // Loading state (matches loadingState from Config.tsx)
  if (loadingEl) {
    loadingEl.style.display = "flex";
    loadingEl.innerHTML = `
      <div style="text-align:center;padding:12px 0;">
        <div class="gh-spinner"></div>
        <p style="font-family:var(--font-mono);font-size:0.68rem;
                  color:var(--fg-muted);margin-top:10px;letter-spacing:0.04em;">
          Fetching your GitHub activity data…
        </p>
      </div>
    `;
  }

  try {
    const res = await fetch(`${cfg.apiUrl}/${CONFIG.githubUsername}.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // API returns { contributions: Array<Array<{date, contributionCount, contributionLevel}>> }
    if (!data?.contributions || !Array.isArray(data.contributions)) {
      throw new Error("Unexpected API response shape");
    }

    // Flatten nested week arrays — same as data.contributions.flat() in Github.tsx
    const flat = data.contributions.flat();

    // Validate + map — mirrors the filter+map in Github.tsx
    const valid = flat
      .filter(item =>
        item &&
        typeof item === "object" &&
        "date" in item &&
        "contributionCount" in item
      )
      .map(item => ({
        date: item.date,
        count: item.contributionCount || 0,
        level: LEVEL_MAP[item.contributionLevel] ?? 0,
      }));

    if (valid.length === 0) throw new Error("No valid contribution data returned");

    const total = valid.reduce((sum, c) => sum + c.count, 0);
    const fullYear = buildFullYearData(valid);  // exact same logic as Github.tsx

    // Render
    if (loadingEl) loadingEl.style.display = "none";
    drawContributionCalendar(canvas, fullYear);
    attachContribTooltip(canvas);

    if (totalLabel) {
      totalLabel.textContent = `${total.toLocaleString()} contributions in the last year`;
    }

  } catch (err) {
    console.warn("GitHub contributions error:", err);

    // Error state — mirrors errorState messages from Config.tsx
    if (loadingEl) {
      loadingEl.style.display = "flex";
      loadingEl.innerHTML = `
        <div style="text-align:center;padding:24px 0;width:100%;">
          <div style="
            width:48px;height:48px;border-radius:50%;
            background:var(--bg-3);border:1px solid var(--border);
            display:flex;align-items:center;justify-content:center;margin:0 auto 12px;
          ">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"
                 style="color:var(--fg-muted)">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61
                c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0
                0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1
                5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42
                3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
            </svg>
          </div>
          <p style="font-family:var(--font-mono);font-size:0.75rem;
                    color:var(--fg-dim);margin-bottom:4px;font-weight:600;">
            Unable to load GitHub contributions
          </p>
          <p style="font-family:var(--font-mono);font-size:0.68rem;
                    color:var(--fg-muted);margin-bottom:14px;">
            Check out my profile directly for the latest activity
          </p>
          <a href="https://github.com/${CONFIG.githubUsername}" target="_blank"
             style="display:inline-flex;align-items:center;gap:6px;
                    font-family:var(--font-mono);font-size:0.7rem;
                    padding:6px 14px;border:1px solid var(--border-hi);
                    border-radius:20px;color:var(--fg-dim);text-decoration:none;">
            View on GitHub ↗
          </a>
        </div>
      `;
    }
  }
}

/* ══════════════════════════════════════════════════════
   LEETCODE STATS
   ─────────────────────────────────────────────────────
   Uses alfa-leetcode-api.onrender.com (active + maintained).
   The old leetcode-stats-api.herokuapp.com is dead since 2023.
   
   Endpoints used:
     GET /{username}/solved  → { solvedProblem, easySolved, mediumSolved, hardSolved }
     GET /{username}         → { ranking, submissionCalendar, ... }
   
   ⚠️  Render free tier cold-starts. First request after inactivity
       can take up to 60 seconds. Subsequent calls are instant.
══════════════════════════════════════════════════════ */
async function loadLeetcodeStats() {
  const totalEl = document.getElementById("lc-total");
  const easyEl = document.getElementById("lc-easy");
  const mediumEl = document.getElementById("lc-medium");
  const hardEl = document.getElementById("lc-hard");
  const rankEl = document.getElementById("lc-rank");
  const canvas = document.getElementById("lc-canvas");
  const BASE = "https://alfa-leetcode-api.onrender.com";
  const user = CONFIG.leetcodeUsername;

  try {
    // Fire both requests in parallel
    const [solvedRes, profileRes] = await Promise.all([
      fetch(`${BASE}/${user}/solved`),
      fetch(`${BASE}/${user}`),
    ]);

    if (!solvedRes.ok) throw new Error(`solved ${solvedRes.status}`);
    if (!profileRes.ok) throw new Error(`profile ${profileRes.status}`);

    const solved = await solvedRes.json();
    const profile = await profileRes.json();

    if (totalEl) totalEl.textContent = solved.solvedProblem ?? "—";
    if (easyEl) easyEl.textContent = solved.easySolved ?? "—";
    if (mediumEl) mediumEl.textContent = solved.mediumSolved ?? "—";
    if (hardEl) hardEl.textContent = solved.hardSolved ?? "—";
    if (rankEl) rankEl.textContent = profile.ranking
      ? `#${Number(profile.ranking).toLocaleString()}`
      : "—";

    // Submission sparkline
    if (canvas && profile.submissionCalendar) {
      let cal = profile.submissionCalendar;
      if (typeof cal === "string") { try { cal = JSON.parse(cal); } catch { cal = {}; } }
      drawLcSparkline(canvas, cal);
    }

  } catch (err) {
    [totalEl, easyEl, mediumEl, hardEl, rankEl].forEach(el => {
      if (el) el.textContent = "—";
    });
    console.warn("LeetCode API error:", err.message,
      "\n→ Verify CONFIG.leetcodeUsername is correct.",
      "\n→ alfa-leetcode-api may be cold-starting — wait 30s and refresh.");
  }
}

function drawLcSparkline(canvas, calendarObj) {
  const ctx = canvas.getContext("2d");
  const WEEKS = 52;
  const now = Date.now() / 1000;

  const vals = [];
  for (let i = WEEKS - 1; i >= 0; i--) {
    const weekStart = Math.floor(now - i * 7 * 86400);
    let total = 0;
    for (let d = 0; d < 7; d++) total += calendarObj[String(weekStart - d * 86400)] || 0;
    vals.push(total);
  }

  const DPR = window.devicePixelRatio || 1;
  const W = canvas.parentElement?.offsetWidth || 300;
  const H = 56;
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  canvas.style.width = W + "px";
  canvas.style.height = H + "px";
  ctx.scale(DPR, DPR);
  ctx.clearRect(0, 0, W, H);

  const max = Math.max(...vals, 1);
  const barW = (W - (WEEKS - 1) * 2) / WEEKS;

  const hasData = vals.some(v => v > 0);
  if (!hasData) return;

  canvas.style.display = "block";

  vals.forEach((v, i) => {
    const barH = Math.max(2, (v / max) * (H - 4));
    const alpha = 0.18 + (v / max) * 0.82;
    ctx.fillStyle = `rgba(255,59,59,${alpha.toFixed(2)})`;
    ctx.beginPath();
    ctx.roundRect(i * (barW + 2), H - barH, barW, barH, 2);
    ctx.fill();
  });
}

/* ══════════════════════════════════════════════════════
   GITHUB ACTIVITY LOGS
══════════════════════════════════════════════════════ */
const EVENT_LABELS = {
  PushEvent: (e) => ({ icon: "⬆", text: `pushed to <a href="https://github.com/${e.repo.name}" target="_blank"><strong>${e.repo.name}</strong></a>` }),
  CreateEvent: (e) => ({ icon: "✦", text: `created ${e.payload.ref_type} <strong>${e.payload.ref || e.repo.name}</strong>` }),
  PullRequestEvent: (e) => ({ icon: "⇄", text: `${e.payload.action} pull request in <a href="https://github.com/${e.repo.name}" target="_blank"><strong>${e.repo.name}</strong></a>` }),
  IssuesEvent: (e) => ({ icon: "◎", text: `${e.payload.action} issue in <strong>${e.repo.name}</strong>` }),
  WatchEvent: (e) => ({ icon: "★", text: `starred <a href="https://github.com/${e.repo.name}" target="_blank"><strong>${e.repo.name}</strong></a>` }),
  ForkEvent: (e) => ({ icon: "⑂", text: `forked <strong>${e.repo.name}</strong>` }),
  IssueCommentEvent: (e) => ({ icon: "◷", text: `commented on issue in <strong>${e.repo.name}</strong>` }),
};

function timeAgo(dateString) {
  const diff = Math.floor((Date.now() - new Date(dateString)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

async function loadGithubActivity() {
  const timeline = document.getElementById("github-timeline");
  if (!timeline) return;

  try {
    const res = await fetch(
      `https://api.github.com/users/${CONFIG.githubUsername}/events?per_page=20`
    );
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    const events = await res.json();

    if (!Array.isArray(events) || events.length === 0) {
      timeline.innerHTML = `<div class="timeline-loading">no public activity found</div>`;
      return;
    }

    const supported = events.filter(e => EVENT_LABELS[e.type]);
    timeline.innerHTML = "";

    supported.slice(0, 10).forEach((event, idx) => {
      const label = EVENT_LABELS[event.type](event);
      const item = document.createElement("div");
      item.className = "timeline-item reveal";
      item.style.transitionDelay = `${idx * 50}ms`;
      item.innerHTML = `
        <div class="timeline-dot">${label.icon}</div>
        <div class="timeline-content">
          <p class="timeline-action">${label.text}</p>
          <span class="timeline-time">${timeAgo(event.created_at)}</span>
        </div>
      `;
      timeline.appendChild(item);
    });

    timeline.querySelectorAll(".timeline-item.reveal").forEach(el => {
      const obs = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting) { e.target.classList.add("visible"); obs.unobserve(e.target); }
        });
      }, { threshold: 0.08 });
      obs.observe(el);
    });

  } catch (err) {
    timeline.innerHTML = `
      <div class="timeline-loading">
        couldn't load activity —
        <a href="https://github.com/${CONFIG.githubUsername}" target="_blank"
           style="color:var(--accent)">view on github ↗</a>
      </div>
    `;
    console.warn("GitHub activity error:", err);
  }
}

/* ══════════════════════════════════════════════════════
   SPOTIFY — LAST PLAYED
══════════════════════════════════════════════════════ */
const audio = document.getElementById('music-player');
const playIcon = document.getElementById('play-icon');
const pauseIcon = document.getElementById('pause-icon');
const statusLabel = document.getElementById('spotify-status');
const bars = document.getElementById('spotify-bars');

function toggleMusic() {
  if (audio.paused) {
    audio.play();
    playIcon.style.display = 'none';
    pauseIcon.style.display = 'block';
    statusLabel.textContent = 'Last Played';
    bars.style.visibility = 'visible';
  } else {
    audio.pause();
    playIcon.style.display = 'block';
    pauseIcon.style.display = 'none';
    statusLabel.textContent = 'paused';
    bars.style.visibility = 'hidden';
  }
}

// Reset on song end
audio.addEventListener('ended', () => {
  playIcon.style.display = 'block';
  pauseIcon.style.display = 'none';
  statusLabel.textContent = 'last played';
  bars.style.visibility = 'hidden';
});
/* ══════════════════════════════════════════════════════
   VISITOR COUNTER
══════════════════════════════════════════════════════ */
(async () => {
  const API_KEY = 'pt_0d67976367815a819780051401d757';
  const PRESS_URL = 'https://api.lyket.dev/v1/clap-buttons/visits/my-website/press';

  try {
    const res = await fetch(PRESS_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      }
    });
    const { data } = await res.json();
    document.getElementById('visitor-num').textContent =
      data.attributes.total_claps.toLocaleString();
  } catch (e) {
    document.getElementById('visitor-num').textContent = '—';
  }
})();
/* ══════════════════════════════════════════════════════
   PROFILE PICTURE — GitHub avatar
══════════════════════════════════════════════════════ */
function syncProfilePics() {
  const url = `https://avatars.githubusercontent.com/${CONFIG.githubUsername}`;
  document.querySelectorAll("#hero-pfp, #about-pfp").forEach(img => img.src = url);
}

/* ══════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", () => {
  startClock();
  initNav();
  initReveal();
  initProjectToggle();
  syncProfilePics();

  loadGithubStars();
  loadGithubContributions();
  loadGithubActivity();

  setTimeout(loadLeetcodeStats, 200);
  setTimeout(loadSpotify, 400);
  setTimeout(loadVisitorCount, 600);
});