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
