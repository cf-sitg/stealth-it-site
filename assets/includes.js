const BOOKING_URL = "https://calendar.app.google/ZoHRH6gXWqQ1Mrjn7";

async function loadPartials() {
  const includes = document.querySelectorAll("[data-include]");

  for (const el of includes) {
    const file = el.getAttribute("data-include");
    const response = await fetch(file);
    const html = await response.text();
    el.outerHTML = html;
  }
}

function setActiveNav() {
  const path = window.location.pathname;

  document.querySelectorAll("nav a[data-nav]").forEach(link => {
    const key = link.getAttribute("data-nav");

    if (
      (key === "services" && path.includes("services.html")) ||
      (key === "tools" && path.includes("tools.html")) ||
      (key === "privacy" && path.includes("privacy.html"))
    ) {
      link.classList.add("active");
    }
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function statusClass(value, goodCondition = true) {
  if (value === null || value === undefined) return "warn";
  return goodCondition ? "ok" : "bad";
}

function portClass(port, status) {
  if (status !== "open") return "ok";

  if (port === 22 || port === 3389) return "bad";
  if (port === 443) return "ok";
  if (port === 80) return "warn";

  return "warn";
}

async function runCheck() {
  const domainInput = document.getElementById("domainInput");
  const resultBox = document.getElementById("resultBox");
  const button = document.getElementById("runCheckButton");

  if (!domainInput || !resultBox) return;

  const domain = domainInput.value.trim();

  if (!domain) {
    resultBox.innerHTML = `<div class="result-section"><p>Enter a domain.</p></div>`;
    return;
  }

  resultBox.innerHTML = `<div class="result-section"><p>Running check...</p></div>`;

  if (button) button.disabled = true;

  try {
    const res = await fetch("https://api.stealthitgroup.com/api/check", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ domain })
    });

    const data = await res.json();

    if (!res.ok) {
      resultBox.innerHTML = `<div class="result-section"><p>${escapeHtml(data.error || "Error running check.")}</p></div>`;
      return;
    }

    resultBox.innerHTML = formatToolResult(data);
  } catch (err) {
    console.error(err);
    resultBox.innerHTML = `<div class="result-section"><p>Error running check.</p></div>`;
  } finally {
    if (button) button.disabled = false;
  }
}

async function runEmailCheck() {
  const input = document.getElementById("emailDomainInput");
  const resultBox = document.getElementById("emailResultBox");
  const button = document.getElementById("runEmailCheckButton");

  if (!input || !resultBox) return;

  const domain = input.value.trim();

  if (!domain) {
    resultBox.innerHTML = `<div class="result-section"><p>Enter a domain.</p></div>`;
    return;
  }

  resultBox.innerHTML = `<div class="result-section"><p>Running check...</p></div>`;
  if (button) button.disabled = true;

  try {
    const res = await fetch("https://api.stealthitgroup.com/api/email-check", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ domain })
    });

    const data = await res.json();

    resultBox.innerHTML = formatEmailResult(data.emailSecurity, domain);

  } catch (err) {
    console.error(err);
    resultBox.innerHTML = `<div class="result-section"><p>Error running check.</p></div>`;
  } finally {
    if (button) button.disabled = false;
  }
}

function formatToolResult(data) {
  const spfPresent = Boolean(data?.dns?.spf?.present);
  const dmarcPresent = Boolean(data?.dns?.dmarc?.present);

  const httpsAvailable = Boolean(data?.tls?.httpsAvailable);
  const certValid = Boolean(data?.tls?.authorized);

  const headers = data?.headers?.headers || {};
  const hstsPresent = Boolean(headers.hsts);
  const cspPresent = Boolean(headers.csp);
  const framePresent = Boolean(headers.xFrameOptions);
  const contentTypePresent = Boolean(headers.xContentTypeOptions);
  const referrerPresent = Boolean(headers.referrerPolicy);

  const ports = Array.isArray(data?.ports) ? data.ports : [];

  const hasIssues =
    !spfPresent ||
    !dmarcPresent ||
    !httpsAvailable ||
    !certValid ||
    !hstsPresent ||
    !cspPresent ||
    !framePresent ||
    !contentTypePresent ||
    !referrerPresent ||
    ports.some(p => p.status === "open" && (p.port === 22 || p.port === 3389));

  const score =
  (spfPresent ? 1 : 0) +
  (dmarcPresent ? 1 : 0) +
  (httpsAvailable ? 1 : 0) +
  (certValid ? 1 : 0) +
  (hstsPresent ? 1 : 0) +
  (cspPresent ? 1 : 0) +
  (framePresent ? 1 : 0) +
  (contentTypePresent ? 1 : 0) +
  (referrerPresent ? 1 : 0) -
  (ports.some(p => p.status === "open" && (p.port === 22 || p.port === 3389)) ? 2 : 0);

const maxScore = 9;
const scorePercent = Math.max(0, Math.round((score / maxScore) * 100));

let grade =
  scorePercent >= 85 ? "Good" :
  scorePercent >= 60 ? "Fair" :
  "Needs Work";

if (!dmarcPresent) {
  grade = "Fair";
}

if (!httpsAvailable || !certValid || ports.some(p => p.status === "open" && (p.port === 22 || p.port === 3389))) {
  grade = "Needs Work";
}

const gradeClass =
  grade === "Good" ? "ok" :
  grade === "Fair" ? "warn" :
  "bad";

  return `
    <div class="result-section">
      <h4>Domain</h4>
      <div class="result-item">
        <span>Checked domain</span>
        <span>${escapeHtml(data.domain)}</span>
      </div>
    </div>

      <div class="result-section">
    <h4>Summary</h4>
    <div class="result-item">
      <span>Security posture</span>
      <span class="${gradeClass}">${grade}</span>
    </div>
    <div class="result-item">
      <span>Quick score</span>
      <span>${scorePercent}%</span>
    </div>
  </div>

<div class="result-section">
  <h4>DNS</h4>
  <div class="result-item">
    <span>SPF</span>
    <span class="${statusClass(spfPresent, spfPresent)}">${spfPresent ? "Present" : "Missing"}</span>
  </div>
  <div class="result-item">
    <span>DMARC</span>
    <span class="${statusClass(dmarcPresent, dmarcPresent)}">${dmarcPresent ? "Present" : "Missing"}</span>
  </div>

  ${!dmarcPresent ? `
    <p class="note">DMARC helps prevent email spoofing and phishing.</p>
  ` : ""}
</div>

    <div class="result-section">
      <h4>TLS</h4>
      <div class="result-item">
        <span>HTTPS</span>
        <span class="${statusClass(httpsAvailable, httpsAvailable)}">${httpsAvailable ? "Yes" : "No"}</span>
      </div>
      <div class="result-item">
        <span>Certificate valid</span>
        <span class="${statusClass(certValid, certValid)}">${certValid ? "Yes" : "No"}</span>
      </div>
      <div class="result-item">
        <span>Days remaining</span>
        <span>${escapeHtml(data?.tls?.daysRemaining ?? "N/A")}</span>
      </div>
    </div>

    <div class="result-section">
      <h4>Headers</h4>
      <div class="result-item">
        <span>HSTS</span>
        <span class="${statusClass(hstsPresent, hstsPresent)}">${hstsPresent ? "Yes" : "No"}</span>
      </div>
      <div class="result-item">
        <span>CSP</span>
        <span class="${statusClass(cspPresent, cspPresent)}">${cspPresent ? "Yes" : "No"}</span>
      </div>
      <div class="result-item">
        <span>X-Frame-Options</span>
        <span class="${statusClass(framePresent, framePresent)}">${framePresent ? "Yes" : "No"}</span>
      </div>
      <div class="result-item">
        <span>X-Content-Type-Options</span>
        <span class="${statusClass(contentTypePresent, contentTypePresent)}">${contentTypePresent ? "Yes" : "No"}</span>
      </div>
      <div class="result-item">
        <span>Referrer-Policy</span>
        <span class="${statusClass(referrerPresent, referrerPresent)}">${referrerPresent ? "Yes" : "No"}</span>
      </div>
    </div>

    <div class="result-section">
      <h4>Ports</h4>
      ${ports.map(p => `
        <div class="result-item">
          <span>${escapeHtml(p.port)}</span>
          <span class="${portClass(p.port, p.status)}">${escapeHtml(p.status)}</span>
        </div>
      `).join("")}
    </div>

    ${hasIssues ? `
      <div class="result-section result-cta">
        <p>
          Need help fixing this?
          <a href="${escapeHtml(BOOKING_URL)}" target="_blank" rel="noopener noreferrer">Schedule a quick intro.</a>
        </p>
      </div>
    ` : ""}
  `;
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadPartials();
  setActiveNav();

  const button1 = document.getElementById("runCheckButton");
  if (button1) button1.addEventListener("click", runCheck);

  const button2 = document.getElementById("runEmailCheckButton");
  if (button2) button2.addEventListener("click", runEmailCheck);
});

function formatEmailResult(sec, domain) {
  const spf = sec.spf;
  const dmarc = sec.dmarc;
  const dkim = sec.dkim;
  const risk = sec.summary.spoofingRisk;

  const riskClass =
    risk === "Low" ? "ok" :
    risk === "Medium" ? "warn" :
    "bad";

  const hasIssues =
    !dmarc.present ||
    dmarc.policy === "none" ||
    !dkim.present;

  return `
    <div class="result-section">
      <h4>Summary</h4>
      <div class="result-item">
        <span>Domain</span>
        <span>${escapeHtml(domain)}</span>
      </div>
      <div class="result-item">
        <span>Spoofing Risk</span>
        <span class="${riskClass}">${risk}</span>
      </div>
    </div>

    <div class="result-section">
      <h4>SPF</h4>
      <div class="result-item">
        <span>Status</span>
        <span class="${statusClass(spf.present, spf.present)}">
          ${spf.present ? "Present" : "Missing"}
        </span>
      </div>
      ${spf.softFail ? `<p class="note">SPF is softfail (~all). Consider hard fail (-all).</p>` : ""}
      ${spf.overlyPermissive ? `<p class="note">SPF contains +all (very permissive).</p>` : ""}
    </div>

    <div class="result-section">
      <h4>DMARC</h4>
      <div class="result-item">
        <span>Status</span>
        <span class="${statusClass(dmarc.present, dmarc.present)}">
          ${dmarc.present ? "Present" : "Missing"}
        </span>
      </div>
      <div class="result-item">
        <span>Policy</span>
        <span>${dmarc.policy || "None"}</span>
      </div>

      ${!dmarc.present ? `
        <p class="note">DMARC is missing. Your domain can likely be spoofed.</p>
      ` : ""}

      ${dmarc.policy === "none" ? `
        <p class="note">DMARC is not enforced (p=none).</p>
      ` : ""}
    </div>

    <div class="result-section">
      <h4>DKIM</h4>
      <div class="result-item">
        <span>Status</span>
        <span class="${statusClass(dkim.present, dkim.present)}">
          ${dkim.present ? "Detected" : "Not detected"}
        </span>
      </div>
    </div>

    ${hasIssues ? `
      <div class="result-section result-cta">
        <p>
          Need help fixing this?
          <a href="${escapeHtml(BOOKING_URL)}" target="_blank" rel="noopener noreferrer">Schedule a quick intro.</a>
        </p>
      </div>
    ` : ""}
  `;
}

async function runPriorityCheck() {
  const input = document.getElementById("priorityDomainInput");
  const resultBox = document.getElementById("priorityResultBox");
  const button = document.getElementById("runPriorityCheckButton");

  if (!input || !resultBox) return;

  const domain = input.value.trim();

  if (!domain) {
    resultBox.innerHTML = `<div class="result-section"><p>Enter a domain.</p></div>`;
    return;
  }

  resultBox.innerHTML = `<div class="result-section"><p>Running prioritization...</p></div>`;
  if (button) button.disabled = true;

  try {
    const res = await fetch("https://api.stealthitgroup.com/api/prioritized-check", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ domain })
    });

    const data = await res.json();

    if (!res.ok) {
      resultBox.innerHTML = `<div class="result-section"><p>${escapeHtml(data.error || "Error running check.")}</p></div>`;
      return;
    }

    resultBox.innerHTML = formatPriorityResult(data);
  } catch (err) {
    console.error(err);
    resultBox.innerHTML = `<div class="result-section"><p>Error running check.</p></div>`;
  } finally {
    if (button) button.disabled = false;
  }
}

function severityClass(severity) {
  if (severity === "High") return "bad";
  if (severity === "Medium") return "warn";
  return "ok";
}

function formatPriorityResult(data) {
  const issues = Array.isArray(data.issues) ? data.issues : [];

  if (issues.length === 0) {
    return `
      <div class="result-section">
        <h4>Summary</h4>
        <div class="result-item">
          <span>Domain</span>
          <span>${escapeHtml(data.domain)}</span>
        </div>
        <div class="result-item">
          <span>Open issues</span>
          <span class="ok">None found</span>
        </div>
      </div>
    `;
  }

  return `
    <div class="result-section">
      <h4>Summary</h4>
      <div class="result-item">
        <span>Domain</span>
        <span>${escapeHtml(data.domain)}</span>
      </div>
      <div class="result-item">
        <span>Total issues</span>
        <span>${escapeHtml(data.summary.totalIssues)}</span>
      </div>
      <div class="result-item">
        <span>High</span>
        <span class="bad">${escapeHtml(data.summary.high)}</span>
      </div>
      <div class="result-item">
        <span>Medium</span>
        <span class="warn">${escapeHtml(data.summary.medium)}</span>
      </div>
      <div class="result-item">
        <span>Low</span>
        <span class="ok">${escapeHtml(data.summary.low)}</span>
      </div>
    </div>

    <div class="result-section">
      <h4>Fix first</h4>
      ${issues.map((issue, index) => `
        <div class="priority-issue">
          <div class="priority-title">
            <span>${index + 1}. ${escapeHtml(issue.title)}</span>
            <span class="${severityClass(issue.severity)}">${escapeHtml(issue.severity)}</span>
          </div>

          <p class="note">${escapeHtml(issue.why)}</p>

          <div class="result-item">
            <span>Category</span>
            <span>${escapeHtml(issue.category)}</span>
          </div>
          <div class="result-item">
            <span>Effort</span>
            <span>${escapeHtml(issue.effort)}</span>
          </div>
          <div class="result-item">
            <span>Impact</span>
            <span>${escapeHtml(issue.impact)}</span>
          </div>

          <p class="note"><strong>Fix:</strong> ${escapeHtml(issue.fix)}</p>
        </div>
      `).join("")}
    </div>

      <div class="result-section result-cta">
        <p>
          Need help fixing this?
          <a href="${escapeHtml(BOOKING_URL)}" target="_blank" rel="noopener noreferrer">Schedule a quick intro.</a>
        </p>
      </div>
  `;
}
