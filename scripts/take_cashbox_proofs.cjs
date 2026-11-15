const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const PROOF_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/cashbox");
const SCREEN_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/cashbox");
const INQUISITION_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/inquisition_live");

for (const d of [PROOF_DIR, SCREEN_DIR, INQUISITION_DIR]) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function verifyProof(filePath) {
  const size = fs.statSync(filePath).size;
  if (size < 20480) {
    throw new Error(`[BLANK DETECTED] ${filePath} is ${size} bytes (< 20KB)!`);
  }
  console.log(`[VERIFIED] ${path.basename(filePath)} (${(size / 1024).toFixed(1)} KB)`);
  return size;
}

async function setTheme(page, theme) {
  await page.evaluate((th) => {
    const isDark = th === "dark";
    document.documentElement.setAttribute("data-theme", th);
    document.body.setAttribute("data-theme", th);
    localStorage.setItem("dente_theme", th);
    localStorage.setItem("dente_theme_mode", th);
    localStorage.setItem("theme", th);
    if (isDark) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      document.body.classList.add("dark");
      document.body.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
      document.body.classList.add("light");
      document.body.classList.remove("dark");
    }
    document.documentElement.style.colorScheme = th;
    window.dispatchEvent(new Event("themechange"));
  }, theme);
  await page.waitForTimeout(600);
}

async function setupContext(context) {
  await context.addInitScript(() => {
    try {
      sessionStorage.setItem("dente:sw-controller-reload", "1");
      sessionStorage.setItem("dente_unlocked", "true");
      localStorage.setItem("dente_demo_showcase", "true");
      localStorage.setItem("dente_demo_mode", "true");
      localStorage.setItem("demo_mode", "true");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_tour_dismissed", "true");
      localStorage.setItem("dente_demo_banner_dismissed", "true");
      localStorage.setItem("dente_active_role", "cashier");
      localStorage.setItem(
        "dental-crm:active-user:v1",
        JSON.stringify({
          id: "usr-cashier-01",
          fullName: "Кассир Воронова С. Н.",
          role: "cashier",
        }),
      );
      localStorage.setItem(
        "dente_staff_session",
        JSON.stringify({
          userId: "usr-cashier-01",
          name: "Кассир Воронова С. Н.",
          role: "cashier",
          roleScope: "clinical_director",
        }),
      );
    } catch (e) {}
  });
}

async function waitForCashboxModal(page) {
  console.log("Waiting for Cashbox modal hydration...");
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(1000);
    try {
      const state = await page.evaluate(() => {
        const text = document.body ? document.body.innerText : "";
        const isBoot = text.includes("Загрузка системы") || text.includes("Загрузка CRM");
        const modal = document.querySelector(
          '[data-testid="cash-register-checkout-modal"], [data-testid="cash-register-studio-modal"]',
        );
        return { isBoot, hasModal: Boolean(modal), len: text.length };
      });

      if (state) {
        if (!state.hasModal) {
          await page.evaluate(() => {
            window.dispatchEvent(
              new CustomEvent("dente:open-cashbox", {
                detail: {
                  mode: "checkout",
                  patientId: "pat-1",
                  patientName: "Иванов Иван Иванович",
                  amountRub: 5400,
                  patientDepositRub: 1200,
                  patientFamilyBalanceRub: 3500,
                },
              }),
            );
          }).catch(() => {});
        }
        if (!state.isBoot && state.hasModal) {
          console.log(`[BOOT READY] Cashbox mounted at iteration ${i + 1}`);
          break;
        }
      }
    } catch (e) {}
  }
  await page.waitForTimeout(800);
}

(async () => {
  console.log("=== Capturing 4-State Proofs for CASHBOX ===");
  let basePort = 5173;
  try {
    const probe = await fetch("http://127.0.0.1:5173/");
    if (probe.status < 500) basePort = 5173;
  } catch {
    basePort = 5174;
  }
  console.log(`Using active port: ${basePort}`);
  const url = `http://127.0.0.1:${basePort}/?stand=cashbox&demo=true#checkout`;

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-gpu", "--disable-setuid-sandbox"],
  });

  try {
    // ══════════════════════════════════════════════════════════════════════════
    // 1. DESKTOP VIEWPORT (1440x900)
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n--- Capturing Desktop 1440x900 Proofs ---");
    const pcContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      serviceWorkers: "block",
    });
    await setupContext(pcContext);

    const pcPage = await pcContext.newPage();
    console.log(`Navigating to ${url}...`);
    await pcPage.goto(url, { waitUntil: "commit", timeout: 35000 });
    await waitForCashboxModal(pcPage);

    // 1A. PC Light
    await setTheme(pcPage, "light");
    const pcLight = path.join(PROOF_DIR, "01_cashbox_studio_pc_light_1440x900.png");
    await pcPage.screenshot({ path: pcLight, fullPage: false, animations: "disabled" });
    fs.copyFileSync(pcLight, path.join(SCREEN_DIR, "01_cashbox_studio_pc_light_1440x900.png"));
    fs.copyFileSync(pcLight, path.join(INQUISITION_DIR, "01_cashbox_studio_pc_light_1440x900.png"));
    verifyProof(pcLight);

    // 1B. PC Dark
    await setTheme(pcPage, "dark");
    const pcDark = path.join(PROOF_DIR, "02_cashbox_studio_pc_dark_1440x900.png");
    await pcPage.screenshot({ path: pcDark, fullPage: false, animations: "disabled" });
    fs.copyFileSync(pcDark, path.join(SCREEN_DIR, "02_cashbox_studio_pc_dark_1440x900.png"));
    fs.copyFileSync(pcDark, path.join(INQUISITION_DIR, "02_cashbox_studio_pc_dark_1440x900.png"));
    verifyProof(pcDark);

    await pcContext.close();

    // ══════════════════════════════════════════════════════════════════════════
    // 2. MOBILE VIEWPORT (390x844 - iPhone 14/15 Apple HIG)
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n--- Capturing Mobile 390x844 Proofs ---");
    const mobContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      serviceWorkers: "block",
    });
    await setupContext(mobContext);

    const mobPage = await mobContext.newPage();
    console.log(`Navigating to ${url}...`);
    await mobPage.goto(url, { waitUntil: "commit", timeout: 35000 });
    await waitForCashboxModal(mobPage);

    // 2A. Mobile Light
    await setTheme(mobPage, "light");
    const mobLight = path.join(PROOF_DIR, "03_cashbox_studio_mobile_light_390x844.png");
    await mobPage.screenshot({ path: mobLight, fullPage: false, animations: "disabled" });
    fs.copyFileSync(mobLight, path.join(SCREEN_DIR, "03_cashbox_studio_mobile_light_390x844.png"));
    fs.copyFileSync(mobLight, path.join(INQUISITION_DIR, "03_cashbox_studio_mobile_light_390x844.png"));
    verifyProof(mobLight);

    // 2B. Mobile Dark
    await setTheme(mobPage, "dark");
    const mobDark = path.join(PROOF_DIR, "04_cashbox_studio_mobile_dark_390x844.png");
    await mobPage.screenshot({ path: mobDark, fullPage: false, animations: "disabled" });
    fs.copyFileSync(mobDark, path.join(SCREEN_DIR, "04_cashbox_studio_mobile_dark_390x844.png"));
    fs.copyFileSync(mobDark, path.join(INQUISITION_DIR, "04_cashbox_studio_mobile_dark_390x844.png"));
    verifyProof(mobDark);

    await mobContext.close();
    await browser.close();

    console.log("\n>>> [SUCCESS] All 4 Cashbox proofs captured and verified! <<<");
  } catch (err) {
    await browser.close();
    throw err;
  }
})().catch((e) => {
  console.error("[FATAL]", e);
  process.exit(1);
});
