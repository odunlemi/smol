/* Relative URL — works on any origin (local dev or Vercel) */
const API = "";
const COUNTDOWN = 5;
const CIRC = 144.5; // 2π × 23

const urlInput = document.getElementById("urlInput");
const slugInput = document.getElementById("slugInput");
const shortenBtn = document.getElementById("shortenBtn");
const statusEl = document.getElementById("status");
const overlay = document.getElementById("overlay");
const warningDest = document.getElementById("warningDest");
const countdownEl = document.getElementById("countdownNumber");
const circle = document.getElementById("countdownCircle");
const cancelBtn = document.getElementById("cancelBtn");
const goBtn = document.getElementById("goBtn");

let countdownTimer = null;
let redirectUrl = null;

/* ── Status helpers ── */

function showStatus(type, html) {
  statusEl.className = `status ${type}`;
  statusEl.innerHTML = html;
}

function clearStatus() {
  statusEl.className = "status";
  statusEl.innerHTML = "";
}

/* ── Shorten ── */

shortenBtn.addEventListener("click", shorten);
urlInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") shorten();
});

async function shorten() {
  clearStatus();
  const url = urlInput.value.trim();
  const slug = slugInput.value.trim();

  if (!url) {
    showStatus("error", "Please enter a URL.");
    return;
  }

  shortenBtn.disabled = true;
  shortenBtn.textContent = "Shortening…";

  try {
    const body = { url };
    if (slug) body.custom_slug = slug;

    const res = await fetch(`${API}/api/links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      showStatus("error", data.error || "Something went wrong.");
      return;
    }

    const short = data.short_url;
    const expires = new Date(data.expires_at).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    showStatus(
      "success",
      `
      <div class="result-row">
        <a class="result-link" href="#" data-href="${escapeAttr(data.original_url)}"
           onclick="triggerWarning(event, this)">${escapeHtml(short)}</a>
        <button class="btn-copy" onclick="copyLink('${escapeAttr(short)}', this)">Copy</button>
      </div>
      <div class="result-meta">expires ${expires}</div>
    `,
    );

    urlInput.value = "";
    slugInput.value = "";
  } catch {
    showStatus("error", "Network error. Please try again.");
  } finally {
    shortenBtn.disabled = false;
    shortenBtn.textContent = "Shorten";
  }
}

/* ── Copy ── */

function copyLink(url, btn) {
  navigator.clipboard.writeText(url).then(() => {
    btn.textContent = "Copied!";
    setTimeout(() => (btn.textContent = "Copy"), 1800);
  });
}

/* ── Exit warning ── */

function triggerWarning(e, el) {
  e.preventDefault();
  redirectUrl = el.dataset.href;
  const display =
    redirectUrl.length > 70 ? redirectUrl.slice(0, 70) + "…" : redirectUrl;
  warningDest.textContent = display;
  startCountdown();
  overlay.classList.add("active");
}

function startCountdown() {
  let remaining = COUNTDOWN;
  countdownEl.textContent = remaining;
  circle.style.strokeDashoffset = 0;

  countdownTimer = setInterval(() => {
    remaining--;
    countdownEl.textContent = remaining;
    circle.style.strokeDashoffset = CIRC * (1 - remaining / COUNTDOWN);
    if (remaining <= 0) {
      clearInterval(countdownTimer);
      doRedirect();
    }
  }, 1000);
}

function doRedirect() {
  overlay.classList.remove("active");
  if (redirectUrl) window.open(redirectUrl, "_blank", "noopener,noreferrer");
  redirectUrl = null;
}

goBtn.addEventListener("click", () => {
  clearInterval(countdownTimer);
  doRedirect();
});

cancelBtn.addEventListener("click", () => {
  clearInterval(countdownTimer);
  overlay.classList.remove("active");
  redirectUrl = null;
});

/* ── Escape helpers (prevent XSS from user-supplied URLs) ── */

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(str) {
  return str.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
