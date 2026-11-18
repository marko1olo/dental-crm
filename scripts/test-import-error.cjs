const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-gpu"],
  });

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => {
    sessionStorage.setItem("dente:sw-controller-reload", "1");
    sessionStorage.setItem("dente_unlocked", "true");
    localStorage.setItem("dente_demo_mode", "true");
    localStorage.setItem("dente_demo_showcase", "true");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
  });

  const page = await context.newPage();
  page.on("pageerror", err => console.log("PAGE UNCAUGHT ERROR:", err.message));
  page.on("console", msg => {
    if (msg.type() === "error" || msg.type() === "warning" || msg.text().includes("Vite")) {
      console.log("PAGE CONSOLE:", msg.type(), msg.text());
    }
  });

  console.log("Navigating...");
  await page.goto("http://127.0.0.1:5173/?stand=cashbox#checkout", { waitUntil: "commit" });

  console.log("Waiting for boot-state to detach...");
  await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 });
  console.log("BOOT STATE DETACHED! APP MOUNTED!");

  const html = await page.evaluate(() => document.body.innerHTML);
  console.log("HTML len:", html.length);
  console.log("Contains cashbox modal:", html.includes("cash-register"));

  await browser.close();
})();
