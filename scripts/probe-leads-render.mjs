import { chromium } from "playwright";

async function probe() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--proxy-server=direct://",
      "--proxy-bypass-list=*",
    ],
  });

  const page = await browser.newPage();
  await page.addInitScript(() => {
    try {
      localStorage.setItem("dente_organization_id", "org-1");
      localStorage.setItem("dente_clinic_token", "demo-clinic-token");
      localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-chief");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_workspace_perspective", "owner");
      localStorage.setItem("dente_demo_showcase", "true");
      localStorage.setItem("dente_demo_showcase_mode_v1", "true");
      sessionStorage.setItem("dente_unlocked", "true");
    } catch (_) {}
  });

  page.on("console", (msg) => console.log("PAGE LOG:", msg.type(), msg.text()));
  page.on("pageerror", (err) => console.error("PAGE ERROR:", err.message));

  console.log("Navigating to http://127.0.0.1:5173/?stand=leads#leads ...");
  await page.goto("http://127.0.0.1:5173/?stand=leads#leads", { waitUntil: "commit" });

  console.log("Waiting for React mount into #root...");
  await page.waitForFunction(() => (document.getElementById("root")?.children.length || 0) > 0, {
    timeout: 25000,
  });

  console.log("Waiting for Leads container...");
  await page.waitForSelector('.leads-board-container, .leads-mobile-container, .leads-kanban, .kanban-column', {
    timeout: 25000,
  });

  const info = await page.evaluate(() => {
    return {
      title: document.title,
      url: window.location.href,
      bodyTextSnippet: document.body.innerText.slice(0, 300),
      kanbanColumns: document.querySelectorAll(".leads-kanban-column, .kanban-column").length,
      leadCards: document.querySelectorAll(".lead-card, [data-testid='lead-card']").length,
    };
  });

  console.log("SUCCESSFUL PROBE INFO:", JSON.stringify(info, null, 2));
  await browser.close();
}

probe().catch((err) => {
  console.error("FATAL PROBE ERROR:", err);
  process.exit(1);
});
