const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-gpu"],
  });

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => {
    localStorage.setItem("dente_demo_showcase", "true");
    localStorage.setItem("dente_demo_mode", "true");
    localStorage.setItem("demo_mode", "true");
    localStorage.setItem("dente_clinic_token", "demo-clinic-token");
    localStorage.setItem("dente_staff_token", "demo-staff-token");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_tour_dismissed", "true");
    sessionStorage.setItem("dente_unlocked", "true");
  });

  const page = await context.newPage();
  page.on("console", msg => console.log("PAGE LOG:", msg.type(), msg.text()));
  page.on("pageerror", err => console.log("PAGE ERROR:", err.message));
  page.on("requestfailed", req => console.log("REQ FAILED:", req.url(), req.failure()?.errorText));

  console.log("Navigating...");
  await page.goto("http://127.0.0.1:5173/?demo=true#checkout", { waitUntil: "domcontentloaded", timeout: 30000 });

  for (let i = 0; i < 25; i++) {
    await page.waitForTimeout(1000);
    const text = await page.evaluate(() => document.body ? document.body.innerText : "");
    if (!text.includes("Загрузка системы") && text.length > 100) {
      console.log(`App loaded after ${i + 1}s! Body length: ${text.length}`);
      break;
    }
  }

  const modals = await page.evaluate(() => {
    const els = document.querySelectorAll("[data-testid]");
    return Array.from(els).map(el => el.getAttribute("data-testid")).filter(id => id && (id.includes("cash") || id.includes("modal") || id.includes("pay") || id.includes("checkout")));
  });
  console.log("Found matching testids:", modals);

  await browser.close();
})();
