const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const WEB_BASE = "http://127.0.0.1:5173";
const OUT_DIR = path.resolve(__dirname, "../docs/proofs/telephony");

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function setTheme(page, theme) {
  await page.evaluate((th) => {
    document.documentElement.setAttribute("data-theme", th);
    if (th === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
    try {
      localStorage.setItem("dente_theme", th);
      localStorage.setItem("dente_theme_mode", th);
      localStorage.setItem("theme", th);
    } catch (_) {}
  }, theme);
  await page.waitForTimeout(500);
}

async function safeGoto(page, url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      return;
    } catch (e) {
      console.log(`[safeGoto] Attempt ${i + 1} failed: ${e.message}, waiting 1.5s...`);
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
}

async function capture() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  try {
    // -------------------------------------------------------------
    // 1 & 2. DESKTOP CONTEXT (1440x900)
    // -------------------------------------------------------------
    console.log("\n[1/4] Desktop Light 1440x900...");
    const pcContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const pcPage = await pcContext.newPage();
    await safeGoto(pcPage, `${WEB_BASE}/?demo=true#softphone`);
    await pcPage.waitForSelector('[data-testid="telephony-softphone-popover"]', { timeout: 30000 });
    await setTheme(pcPage, "light");

    // Введем немного цифр в dialpad для еще большей реалистичности (+7 926 777-88-99)
    await pcPage.evaluate(() => {
      const input = document.querySelector('input[type="tel"]');
      if (input) {
        input.value = "+7 (926) 777-88-99";
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
    await pcPage.waitForTimeout(400);

    const pcLightPath = path.join(OUT_DIR, "01_telephony_dialpad_pc_light_1440x900.png");
    await pcPage.screenshot({ path: pcLightPath, fullPage: false });
    console.log(`Saved: ${pcLightPath} (${fs.statSync(pcLightPath).size} bytes)`);

    // 02. Desktop Dark
    console.log("\n[2/4] Desktop Dark 1440x900...");
    await setTheme(pcPage, "dark");
    await pcPage.evaluate(() => {
      const root = document.querySelector('[data-testid="direct-telephony-launcher-root"]');
      if (root) {
        root.style.background = "radial-gradient(ellipse at 50% 50%, rgba(20, 184, 166, 0.12) 0%, rgba(15, 23, 42, 0.95) 70%), linear-gradient(135deg, #090d11 0%, #0f172a 100%)";
      }
    });
    await pcPage.waitForTimeout(400);
    const pcDarkPath = path.join(OUT_DIR, "02_telephony_dialpad_pc_dark_1440x900.png");
    await pcPage.screenshot({ path: pcDarkPath, fullPage: false });
    console.log(`Saved: ${pcDarkPath} (${fs.statSync(pcDarkPath).size} bytes)`);

    await pcContext.close();

    // -------------------------------------------------------------
    // 3 & 4. MOBILE CONTEXT (390x844, iPhone 14)
    // -------------------------------------------------------------
    console.log("\n[3/4] Mobile Light 390x844...");
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const mobilePage = await mobileContext.newPage();
    await safeGoto(mobilePage, `${WEB_BASE}/?demo=true#softphone`);
    await mobilePage.waitForSelector('[data-testid="telephony-softphone-popover"]', { timeout: 30000 });
    await setTheme(mobilePage, "light");

    await mobilePage.evaluate(() => {
      const input = document.querySelector('input[type="tel"]');
      if (input) {
        input.value = "+7 (926) 777-88-99";
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
    await mobilePage.waitForTimeout(400);

    const mobileLightPath = path.join(OUT_DIR, "03_telephony_dialpad_mobile_light_390x844.png");
    await mobilePage.screenshot({ path: mobileLightPath, fullPage: false });
    console.log(`Saved: ${mobileLightPath} (${fs.statSync(mobileLightPath).size} bytes)`);

    // 04. Mobile Dark
    console.log("\n[4/4] Mobile Dark 390x844...");
    await setTheme(mobilePage, "dark");
    const mobileDarkPath = path.join(OUT_DIR, "04_telephony_dialpad_mobile_dark_390x844.png");
    await mobilePage.screenshot({ path: mobileDarkPath, fullPage: false });
    console.log(`Saved: ${mobileDarkPath} (${fs.statSync(mobileDarkPath).size} bytes)`);

    await mobileContext.close();

    // Также обновим симметричные алиасы для других тестов и ревьюеров
    fs.copyFileSync(pcLightPath, path.join(OUT_DIR, "01_telephony_softphone_pc_light_1440x900.png"));
    fs.copyFileSync(pcDarkPath, path.join(OUT_DIR, "02_telephony_softphone_pc_dark_1440x900.png"));
    fs.copyFileSync(mobileLightPath, path.join(OUT_DIR, "03_telephony_softphone_mobile_light_390x844.png"));
    fs.copyFileSync(mobileDarkPath, path.join(OUT_DIR, "04_telephony_softphone_mobile_dark_390x844.png"));

    fs.copyFileSync(pcLightPath, path.join(OUT_DIR, "01_telephony_pc_light_1440x900.png"));
    fs.copyFileSync(pcDarkPath, path.join(OUT_DIR, "02_telephony_pc_dark_1440x900.png"));
    fs.copyFileSync(mobileLightPath, path.join(OUT_DIR, "03_telephony_mobile_light_390x844.png"));
    fs.copyFileSync(mobileDarkPath, path.join(OUT_DIR, "04_telephony_mobile_dark_390x844.png"));

    console.log("\n[SUCCESS] ALL 4-STATE TELEPHONY DIALPAD PROOFS GENERATED!");
  } finally {
    await browser.close();
  }
}

capture().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
