const puppeteer = require("puppeteer");
const path = require("node:path");
const fs = require("node:fs");

const proofDir = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/finance");
if (!fs.existsSync(proofDir)) {
  fs.mkdirSync(proofDir, { recursive: true });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function resolveViteUrl() {
  for (const port of [5173, 5174, 5175]) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`);
      if (res.ok || res.status === 200 || res.status === 304) {
        return `http://127.0.0.1:${port}`;
      }
    } catch (_) {}
  }
  return "http://127.0.0.1:5173";
}

async function provisionSession() {
  console.log("[Auth] Provisioning live clinic session via API at http://127.0.0.1:4100 ...");
  const uniqueId = Date.now();
  const initRes = await fetch("http://127.0.0.1:4100/api/auth/setup/init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicName: "Стоматология ДЕНТЕ Премиум",
      email: `doctor-finance-${uniqueId}@dente.local`,
      password: "Password123!",
      ownerName: "Д-р Воронов Алексей Владимирович",
      ownerPin: "1234",
    }),
  });
  if (!initRes.ok) throw new Error(`Init failed: ${await initRes.text()}`);
  const initData = await initRes.json();

  const unlockRes = await fetch("http://127.0.0.1:4100/api/auth/staff/unlock", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-dente-clinic-token": initData.clinicToken,
    },
    body: JSON.stringify({ userId: initData.ownerUserId, pinCode: "1234" }),
  });
  if (!unlockRes.ok) throw new Error(`Unlock failed: ${await unlockRes.text()}`);
  const unlockData = await unlockRes.json();

  return {
    clinicToken: initData.clinicToken,
    organizationId: initData.organizationId,
    staffToken: unlockData.staffToken,
    ownerUserId: initData.ownerUserId,
  };
}

async function main() {
  console.log("=== STARTING FAST CHECKOUT CAPTURE VIA PUPPETEER WITH BOOT-STATE DETACH ===");
  const auth = await provisionSession();
  const webUrl = await resolveViteUrl();
  console.log(`[Auth] Session provisioned! Web URL is ${webUrl}`);

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // Inject tokens before React loads
    await page.evaluateOnNewDocument((authData) => {
      localStorage.setItem("dente_clinic_token", authData.clinicToken);
      localStorage.setItem("dente_organization_id", authData.organizationId || "00000000-0000-0000-0000-000000000001");
      localStorage.setItem("dente_staff_token", authData.staffToken);
      localStorage.setItem("dente_active_session_token", authData.staffToken);
      localStorage.setItem("dente_active_user_id", authData.ownerUserId);
      localStorage.setItem("dente_user_id", authData.ownerUserId);
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_user_role", "owner");
      localStorage.setItem("dente_active_mode", "clinic");
      sessionStorage.setItem("dente_unlocked", "true");
      sessionStorage.setItem("dente_chunk_reload_/", "1");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_demo_showcase", "true");
      localStorage.setItem("dente_theme_mode", "light");
      localStorage.setItem("dente_theme", "light");
      localStorage.setItem("theme", "light");
      localStorage.setItem(
        "dente_ui_preferences_v1",
        JSON.stringify({ onboardingDismissed: true, onboardingStep: "done", version: 1 })
      );
      localStorage.setItem(
        "dental-crm:onboarding:v1",
        JSON.stringify({ dismissed: true, step: "done", completed: true, onboardingDismissed: true, onboardingStep: "done", version: 1 })
      );
      localStorage.setItem(
        "dental-crm:web-ui-preferences:v1",
        JSON.stringify({ version: 1, uiLanguage: "ru", selectedWorkspaceRole: "owner", onboardingDismissed: true, onboardingStep: "done" })
      );
    }, auth);

    console.log(`Navigating to ${webUrl}/?fast_checkout=1 ...`);
    await page.goto(`${webUrl}/?fast_checkout=1`, { waitUntil: "domcontentloaded", timeout: 30000 });

    console.log("Waiting for .boot-state to detach...");
    await page.waitForFunction(() => !document.querySelector(".boot-state"), { timeout: 25000 }).catch(() => {});
    await sleep(2000);

    console.log("Waiting for .fast-checkout-modal-container...");
    await page.waitForSelector(".fast-checkout-modal-container", { timeout: 20000 });
    console.log("FastCheckout modal container visible!");

    // Suppress toasts, coach marks and tour overlays
    await page.evaluate(() => {
      const style = document.createElement("style");
      style.id = "suppress-all-tour-overlays";
      style.innerHTML = `
        .tour-spotlight-root,
        .tour-backdrop-clickable-zone,
        [data-testid="guided-tour-spotlight-overlay"],
        [data-testid="guided-tour-coach-mark-card"],
        .shepherd-element,
        .toast,
        [data-testid="toast-container"] {
          display: none !important;
          pointer-events: none !important;
          opacity: 0 !important;
        }
      `;
      document.head.appendChild(style);
    });
    await sleep(500);

    // ─── SCREENSHOT 1: PC LIGHT (1440x900) ───────────────────────────
    console.log("Capturing PC Light (1440x900)...");
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      localStorage.setItem("dente_theme", "light");
      localStorage.setItem("dente_theme_mode", "light");
    });
    await sleep(800);

    const pcLightPath = path.join(proofDir, "pc_light_fast_checkout.png");
    await page.screenshot({ path: pcLightPath, fullPage: false });
    const pcLightSize = fs.statSync(pcLightPath).size;
    console.log(`[PROOF 1/4] Saved: ${pcLightPath} (${pcLightSize} bytes)`);

    // ─── SCREENSHOT 2: PC LIGHT CASH REGISTER (1440x900) ─────────────
    console.log("Clicking cash payment method for cash register tender panel...");
    const cashSelector = '[data-testid="checkout-method-cash"], [data-testid="simple-cash-btn"]';
    await page.waitForSelector(cashSelector, { timeout: 5000 }).catch(() => {});
    const cashBtn = await page.$(cashSelector);
    if (cashBtn) {
      await cashBtn.click();
      await page.waitForSelector('[data-testid="cash-tender-panel"]', { timeout: 5000 }).catch(() => {});
      await sleep(1000);
    }
    const pcLightCashPath = path.join(proofDir, "pc_light_cash_register.png");
    await page.screenshot({ path: pcLightCashPath, fullPage: false });
    const pcLightCashSize = fs.statSync(pcLightCashPath).size;
    console.log(`[PROOF 2/4] Saved: ${pcLightCashPath} (${pcLightCashSize} bytes)`);

    // ─── SCREENSHOT 3: PC DARK (1440x900) ────────────────────────────
    console.log("Switching to PC Dark (1440x900)...");
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
      localStorage.setItem("dente_theme", "dark");
      localStorage.setItem("dente_theme_mode", "dark");
    });
    await sleep(800);

    const pcDarkPath = path.join(proofDir, "pc_dark_fast_checkout.png");
    await page.screenshot({ path: pcDarkPath, fullPage: false });
    const pcDarkSize = fs.statSync(pcDarkPath).size;
    console.log(`[PROOF 3/4] Saved: ${pcDarkPath} (${pcDarkSize} bytes)`);

    // ─── SCREENSHOT 4: MOBILE (390x844) IN SEPARATE PAGE ────────────
    console.log("Setting up separate mobile page (390x844)...");
    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await mobilePage.evaluateOnNewDocument((authData) => {
      localStorage.setItem("dente_clinic_token", authData.clinicToken);
      localStorage.setItem("dente_organization_id", authData.organizationId || "00000000-0000-0000-0000-000000000001");
      localStorage.setItem("dente_staff_token", authData.staffToken);
      localStorage.setItem("dente_active_session_token", authData.staffToken);
      localStorage.setItem("dente_active_user_id", authData.ownerUserId);
      localStorage.setItem("dente_user_id", authData.ownerUserId);
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_user_role", "owner");
      localStorage.setItem("dente_active_mode", "clinic");
      sessionStorage.setItem("dente_unlocked", "true");
      sessionStorage.setItem("dente_chunk_reload_/", "1");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_demo_showcase", "true");
      localStorage.setItem("dente_theme_mode", "light");
      localStorage.setItem("dente_theme", "light");
      localStorage.setItem("theme", "light");
      localStorage.setItem(
        "dente_ui_preferences_v1",
        JSON.stringify({ onboardingDismissed: true, onboardingStep: "done", version: 1 })
      );
      localStorage.setItem(
        "dental-crm:onboarding:v1",
        JSON.stringify({ dismissed: true, step: "done", completed: true, onboardingDismissed: true, onboardingStep: "done", version: 1 })
      );
      localStorage.setItem(
        "dental-crm:web-ui-preferences:v1",
        JSON.stringify({ version: 1, uiLanguage: "ru", selectedWorkspaceRole: "owner", onboardingDismissed: true, onboardingStep: "done" })
      );
    }, auth);

    console.log("Navigating mobile page to ?fast_checkout=1 ...");
    await mobilePage.goto(`${webUrl}/?fast_checkout=1`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await mobilePage.waitForFunction(
      () => !document.querySelector(".boot-state") && !document.body.innerText.includes("Загрузка системы"),
      { timeout: 25000 }
    ).catch(() => {});
    await mobilePage.waitForSelector(".fast-checkout-modal-container", { timeout: 20000 });
    await sleep(2000);

    // Suppress toasts on mobile
    await mobilePage.evaluate(() => {
      const style = document.createElement("style");
      style.id = "suppress-all-tour-overlays";
      style.innerHTML = `
        .tour-spotlight-root,
        .tour-backdrop-clickable-zone,
        [data-testid="guided-tour-spotlight-overlay"],
        [data-testid="guided-tour-coach-mark-card"],
        .shepherd-element,
        .toast,
        [data-testid="toast-container"] {
          display: none !important;
          pointer-events: none !important;
          opacity: 0 !important;
        }
      `;
      document.head.appendChild(style);
      document.documentElement.setAttribute("data-theme", "light");
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    });
    await sleep(800);

    const mobileLightPath = path.join(proofDir, "mobile_light_fast_checkout.png");
    await mobilePage.screenshot({ path: mobileLightPath, fullPage: false });
    const mobileLightSize = fs.statSync(mobileLightPath).size;
    console.log(`[PROOF 4/4] Saved: ${mobileLightPath} (${mobileLightSize} bytes)`);

    // Mobile Dark
    await mobilePage.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
      localStorage.setItem("dente_theme", "dark");
      localStorage.setItem("dente_theme_mode", "dark");
    });
    await sleep(800);

    const mobileDarkPath = path.join(proofDir, "mobile_dark_fast_checkout.png");
    await mobilePage.screenshot({ path: mobileDarkPath, fullPage: false });
    const mobileDarkSize = fs.statSync(mobileDarkPath).size;
    console.log(`[PROOF EXTRA] Saved: ${mobileDarkPath} (${mobileDarkSize} bytes)`);

    console.log("=== ALL PROOFS CAPTURED SUCCESSFULLY ===");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Puppeteer capture error:", err);
  process.exit(1);
});
