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
    const res = await fetch("https://stealth-tools-api.onrender.com/api/check", {
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

function formatToolResult(data) {
  if (!data || !data.dns || !data.tls) {
    return "Invalid response.";
  }

  return `
Domain: ${data.domain}

DNS
- SPF: ${data.dns.spf.present ? "Present" : "Missing"}
- DMARC: ${data.dns.dmarc.present ? "Present" : "Missing"}

TLS
- HTTPS: ${data.tls.httpsAvailable ? "Yes" : "No"}
- Cert Valid: ${data.tls.authorized ? "Yes" : "No"}
- Days Remaining: ${data.tls.daysRemaining ?? "N/A"}

Headers
- HSTS: ${data.headers?.headers?.hsts ? "Yes" : "No"}
- CSP: ${data.headers?.headers?.csp ? "Yes" : "No"}
- X-Frame: ${data.headers?.headers?.xFrameOptions ? "Yes" : "No"}

Ports
${data.ports.map(p => `- ${p.port}: ${p.status}`).join("\n")}
`;
}
