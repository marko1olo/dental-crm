const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const PROOFS_DIR = path.resolve(__dirname, "../docs/proofs/visit");
if (!fs.existsSync(PROOFS_DIR)) {
  fs.mkdirSync(PROOFS_DIR, { recursive: true });
}

async function capture() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  const targets = [
    {
      name: "visit_chairside_pc_light_1440x900.png",
      width: 1440,
      height: 900,
      isMobile: false,
      theme: "light",
    },
    {
      name: "visit_chairside_pc_dark_1440x900.png",
      width: 1440,
      height: 900,
      isMobile: false,
      theme: "dark",
    },
    {
      name: "visit_chairside_mobile_light_390x844.png",
      width: 390,
      height: 844,
      isMobile: true,
      theme: "light",
    },
    {
      name: "visit_chairside_mobile_dark_390x844.png",
      width: 390,
      height: 844,
      isMobile: true,
      theme: "dark",
    },
  ];

  for (const t of targets) {
    console.log(`\n--- Capturing ${t.name} (${t.width}x${t.height}, ${t.theme}) ---`);
    const context = await browser.newContext({
      viewport: { width: t.width, height: t.height },
      isMobile: t.isMobile,
      hasTouch: t.isMobile,
      deviceScaleFactor: 1,
    });

    await context.addInitScript(({ theme }) => {
      localStorage.setItem("dente_theme", theme);
      localStorage.setItem("dente_theme_mode", theme);
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_tour_dismissed", "true");
      localStorage.setItem("dente_demo_banner_dismissed", "true");
      localStorage.setItem("dente_onboarding_completed", "true");
    }, { theme: t.theme });

    const page = await context.newPage();
    await page.goto("http://127.0.0.1:5173/?demo=true#visit", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    // Wait for initial boot splash to finish detaching
    await page.waitForSelector(".boot-state", { state: "detached", timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1500);

    // Ensure theme attributes are properly stamped
    await page.evaluate((theme) => {
      document.documentElement.setAttribute("data-theme", theme);
      document.body.setAttribute("data-theme", theme);
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
        document.body.classList.add("dark");
        document.body.classList.remove("light");
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
        document.body.classList.remove("dark");
        document.body.classList.add("light");
      }
    }, t.theme);
    await page.waitForTimeout(500);

    // If intake cockpit is showing, select next or first patient
    const startNextBtn = page.locator('#btn-intake-start-next');
    const patientItem = page.locator('.intake-queue-item, [data-testid^="queue-item-"]').first();
    try {
      await page.waitForSelector('#btn-intake-start-next, .intake-queue-item, [data-testid^="queue-item-"], .odontogram-container, .mobile-chairside-container', { timeout: 10000 });
    } catch (_) {}

    if (await startNextBtn.isVisible()) {
      console.log("Clicking #btn-intake-start-next...");
      await startNextBtn.click();
      await page.waitForTimeout(2000);
    } else if (await patientItem.isVisible()) {
      console.log("Clicking first queue patient...");
      await patientItem.click();
      await page.waitForTimeout(2000);
    }

    // Ensure we are on visit view
    await page.evaluate(() => {
      if (window.__useAppStore) {
        window.__useAppStore.getState().setCurrentView("visit");
      }
      // Clean up any transient toast notifications
      document.querySelectorAll('.global-toast, .toast, .sa-toast, [data-testid="global-toast"], [role="alert"]').forEach(el => el.remove());
    });
    await page.waitForTimeout(1000);

    const outPath = path.join(PROOFS_DIR, t.name);
    await page.screenshot({ path: outPath, fullPage: false });
    const stat = fs.statSync(outPath);
    console.log(`Saved ${t.name}: ${stat.size} bytes`);
    if (stat.size < 20000) {
      console.error(`WARNING: ${t.name} is under 20KB (${stat.size} bytes)!`);
    }

    await context.close();
  }

  await browser.close();
  console.log("\nAll 4 state screenshots captured successfully!");
}

capture().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
