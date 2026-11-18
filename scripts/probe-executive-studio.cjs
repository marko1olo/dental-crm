const { chromium } = require("playwright");

async function probe() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  await context.addInitScript(() => {
    localStorage.setItem("dente_demo_mode", "true");
    localStorage.setItem("dente_demo_showcase", "true");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_user_role", "owner");
    localStorage.setItem("dente_role", "owner");
    localStorage.setItem("dente_perspective", "management");
    sessionStorage.setItem("dente_unlocked", "true");
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({
      dismissed: true,
      step: "done",
      completed: true,
    }));
  });

  const page = await context.newPage();
  page.on("console", msg => console.log("[PAGE CONSOLE]", msg.type(), msg.text()));
  page.on("pageerror", err => console.log("[PAGE ERROR]", err));
  page.on("response", res => {
    if (res.status() >= 400) console.log("[HTTP ERR]", res.status(), res.url());
  });

  console.log("Navigating...");
  await page.goto("http://localhost:5173/?demo=true#executive-studio", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  const html = await page.evaluate(() => document.body.innerHTML.slice(0, 1000));
  console.log("BODY PREVIEW:", html);

  const foundModal = await page.$('[data-testid="executive-analytics-studio-modal"]');
  console.log("foundModal:", Boolean(foundModal));

  const allTestIds = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("[data-testid]")).map(el => el.getAttribute("data-testid"));
  });
  console.log("Visible testids:", allTestIds.slice(0, 20));

  await browser.close();
}

probe().catch(console.error);
