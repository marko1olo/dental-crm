const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-gpu"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    serviceWorkers: "block",
  });

  await context.addInitScript(() => {
    localStorage.setItem("dente_demo_mode", "true");
    localStorage.setItem("dente_demo_showcase", "true");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_tour_completed", "true");
    sessionStorage.setItem("dente_unlocked", "true");
  });

  const page = await context.newPage();
  page.on("pageerror", err => console.log("PAGE UNCAUGHT ERROR:", err.message));
  page.on("console", msg => console.log("PAGE CONSOLE:", msg.type(), msg.text()));

  console.log("Navigating with SW blocked...");
  await page.goto("http://127.0.0.1:5173/?stand=cashbox#checkout", { waitUntil: "commit" });

  for (let i = 0; i < 15; i++) {
    await page.waitForTimeout(1000);
    const html = await page.evaluate(() => document.body ? document.body.innerHTML : "");
    if (!html.includes("boot-state") && html.length > 500) {
      console.log(`Mounted after ${i+1}s! Length: ${html.length}`);
      break;
    }
  }

  const finalHtml = await page.evaluate(() => document.body.innerHTML);
  console.log("Final HTML preview:", finalHtml.slice(0, 300));
  console.log("Has cashbox:", finalHtml.includes("cash-register") || finalHtml.includes("Касса"));

  await browser.close();
})();
