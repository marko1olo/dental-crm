const { chromium } = require("playwright");
const path = require("node:path");

async function testInit() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();
  await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  // 1. Click "Демо-тур" tab or "Быстрый вход в Демо-тур"
  const demoTab = page.locator("text=Демо-тур").first();
  if (await demoTab.isVisible()) {
    console.log("Found Demo Tour tab, clicking...");
    await demoTab.click();
    await page.waitForTimeout(800);
  }

  // 2. Click "Войти в демо-тур как Терапевт"
  const enterDemoBtn = page.locator('button:has-text("Войти в демо-тур как Терапевт")').first();
  if (await enterDemoBtn.isVisible()) {
    console.log("Found enterDemoBtn, clicking...");
    await enterDemoBtn.click();
    await page.waitForTimeout(2500);
  }

  // 3. Clear any tour overlays & bypass tour
  await page.evaluate(() => {
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
    localStorage.setItem("dente_tour_completed", "true");
    document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"]').forEach((el) => el.remove());
  });

  // 4. Navigate to Patients tab via MobileTabBar
  console.log("Waiting for MobileTabBar...");
  await page.waitForSelector(".mobile-tab-bar", { timeout: 10000 });
  const patientsTab = page.locator('.mobile-tab-item:has-text("Пациенты")').first();
  if (await patientsTab.isVisible()) {
    console.log("Clicking Patients in MobileTabBar...");
    await patientsTab.click();
    await page.waitForTimeout(2000);
  }

  const testShot = path.resolve("docs/screenshots/inquisition_live/test_init_patients.png");
  await page.screenshot({ path: testShot });
  console.log("Saved init test screenshot:", testShot);

  const hasPatientsPanel = await page.evaluate(() => Boolean(document.querySelector("#patients") || document.querySelector(".patients-panel")));
  console.log("Has patients panel:", hasPatientsPanel);

  await browser.close();
}

testInit().catch(console.error);
