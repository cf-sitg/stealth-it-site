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

  return `
    <div class="result-section">
      <h4>Domain</h4>
      <div class="result-item">
        <span>Checked domain</span>
        <span>${escapeHtml(data.domain)}</span>
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

  const button = document.getElementById("runCheckButton");

  if (button) {
    button.addEventListener("click", runCheck);
  }
});
