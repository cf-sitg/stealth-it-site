document.addEventListener("DOMContentLoaded", async () => {
  const includes = document.querySelectorAll("[data-include]");

  for (const el of includes) {
    const file = el.getAttribute("data-include");
    const response = await fetch(file);
    const html = await response.text();
    el.outerHTML = html;
  }

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
});

window.runCheck = async function () {
  const domainInput = document.getElementById("domainInput");
  const resultBox = document.getElementById("resultBox");

  if (!domainInput || !resultBox) return;

  const domain = domainInput.value.trim();

  if (!domain) {
    resultBox.textContent = "Enter a domain.";
    return;
  }

  resultBox.textContent = "Running check...";

  try {
    const res = await fetch("https://api.stealthitgroup.com/api/check", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ domain })
    });

    const data = await res.json();

    resultBox.textContent = formatToolResult(data);

  } catch (err) {
    resultBox.textContent = "Error running check.";
  }
};

function statusClass(value, goodCondition = true) {
  if (value === null || value === undefined) return "warn";
  return goodCondition ? "ok" : "bad";
}

function formatToolResult(data) {
  const spfClass = statusClass(data.dns.spf.present, data.dns.spf.present);
  const dmarcClass = statusClass(data.dns.dmarc.present, data.dns.dmarc.present);

  const httpsClass = statusClass(data.tls.httpsAvailable, data.tls.httpsAvailable);
  const certClass = statusClass(data.tls.authorized, data.tls.authorized);

  const hstsClass = statusClass(data.headers.headers.hsts, data.headers.headers.hsts);
  const cspClass = statusClass(data.headers.headers.csp, data.headers.headers.csp);
  const frameClass = statusClass(data.headers.headers.xFrameOptions, data.headers.headers.xFrameOptions);

  return `
    <div class="result-section">
      <h4>Domain</h4>
      <div class="result-item">${data.domain}</div>
    </div>

    <div class="result-section">
      <h4>DNS</h4>
      <div class="result-item">SPF <span class="${spfClass}">${data.dns.spf.present ? "Present" : "Missing"}</span></div>
      <div class="result-item">DMARC <span class="${dmarcClass}">${data.dns.dmarc.present ? "Present" : "Missing"}</span></div>
    </div>

    <div class="result-section">
      <h4>TLS</h4>
      <div class="result-item">HTTPS <span class="${httpsClass}">${data.tls.httpsAvailable ? "Yes" : "No"}</span></div>
      <div class="result-item">Cert Valid <span class="${certClass}">${data.tls.authorized ? "Yes" : "No"}</span></div>
      <div class="result-item">Days Remaining <span>${data.tls.daysRemaining ?? "N/A"}</span></div>
    </div>

    <div class="result-section">
      <h4>Headers</h4>
      <div class="result-item">HSTS <span class="${hstsClass}">${data.headers.headers.hsts ? "Yes" : "No"}</span></div>
      <div class="result-item">CSP <span class="${cspClass}">${data.headers.headers.csp ? "Yes" : "No"}</span></div>
      <div class="result-item">X-Frame <span class="${frameClass}">${data.headers.headers.xFrameOptions ? "Yes" : "No"}</span></div>
    </div>

    <div class="result-section">
      <h4>Ports</h4>
      ${data.ports.map(p => {
        const cls = p.status === "open" ? "warn" : "ok";
        return `<div class="result-item">${p.port} <span class="${cls}">${p.status}</span></div>`;
      }).join("")}
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  const button = document.getElementById("runCheckButton");

  if (button) {
    button.addEventListener("click", window.runCheck);
  }
});
