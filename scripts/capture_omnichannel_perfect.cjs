const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const API_BASE = "http://127.0.0.1:4100";
const WEB_BASE = "http://127.0.0.1:5173";
const TARGET_DIR = path.resolve("docs/screenshots/omnichannel_master");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/a3b47045-b11d-4653-8af4-e9981cee44dc");

if (!fs.existsSync(TARGET_DIR)) fs.mkdirSync(TARGET_DIR, { recursive: true });
if (!fs.existsSync(BRAIN_DIR)) fs.mkdirSync(BRAIN_DIR, { recursive: true });

async function provisionSession() {
  const uniqueId = Date.now();
  console.log(`[Provisioning] Initializing owner session om-${uniqueId}@dente.ru...`);
  const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicName: "Клиника ДЕНТЕ Омнихаб",
      email: `om-${uniqueId}@dente.ru`,
      password: "Password123!",
      ownerName: "Д-р Громов Константин Сергеевич",
      ownerPin: "1234",
    }),
  });
  if (!initRes.ok) throw new Error(`Init failed: ${await initRes.text()}`);
  const initData = await initRes.json();

  const unlockRes = await fetch(`${API_BASE}/api/auth/staff/unlock`, {
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
    staffToken: unlockData.staffToken,
    ownerUserId: initData.ownerUserId,
  };
}

async function capture() {
  const auth = await provisionSession();
  console.log(`[Provisioning] Session ready! ClinicToken OK, StaffToken OK.`);

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  const states = [
    { name: "omnichannel_master_pc_light.png", width: 1440, height: 900, isMobile: false, isDark: false },
    { name: "omnichannel_master_pc_dark.png", width: 1440, height: 900, isMobile: false, isDark: true },
    { name: "omnichannel_master_mobile_light.png", width: 390, height: 844, isMobile: true, isDark: false },
    { name: "omnichannel_master_mobile_dark.png", width: 390, height: 844, isMobile: true, isDark: true },
  ];

  for (const s of states) {
    console.log(`\n>>> Capturing ${s.name} (${s.width}x${s.height}, dark: ${s.isDark}, mobile: ${s.isMobile})`);
    const context = await browser.newContext({
      viewport: { width: s.width, height: s.height },
      isMobile: s.isMobile,
      deviceScaleFactor: 2,
    });

    await context.addInitScript(({ ct, st, uid, isDark }) => {
      localStorage.setItem("dente_clinic_token", ct);
      localStorage.setItem("dente_staff_token", st);
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_theme_mode", isDark ? "dark" : "light");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_training_mode_completed", "true");
      localStorage.setItem("dente_training_active", "false");
      localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isDismissedPermanently: true, activeTrack: null, tracksProgress: {} }));
      localStorage.setItem("dente_staff_session", JSON.stringify({
        userId: uid,
        name: "Д-р Громов К. С.",
        fullName: "Д-р Громов Константин Сергеевич",
        role: "owner",
        specialties: ["Главный врач", "Ортопед"],
      }));
      localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
        version: 1,
        uiLanguage: "ru",
        selectedWorkspaceRole: "owner",
        onboardingDismissed: true,
        onboardingStep: "done",
      }));
      localStorage.setItem("dente-workspace-profile", JSON.stringify({
        state: {
          clinicName: "Клиника ДЕНТЕ Омнихаб",
          currentDoctor: { id: uid, fullName: "Д-р Громов К. С.", role: "owner" },
          flags: { disableTour: true },
        },
      }));
    }, { ct: auth.clinicToken, st: auth.staffToken, uid: auth.ownerUserId, isDark: s.isDark });

    const page = await context.newPage();
    await page.goto(`${WEB_BASE}/#settings`, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(2000);

    // Apply theme & remove overlays
    await page.evaluate((isDark) => {
      const mode = isDark ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", mode);
      document.documentElement.dataset.theme = mode;
      document.documentElement.style.colorScheme = mode;
      if (isDark) {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
      } else {
        document.documentElement.classList.add("light");
        document.documentElement.classList.remove("dark");
      }
      document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"]').forEach((el) => el.remove());
    }, s.isDark);

    console.log("Waiting for app hydration...");
    await page.waitForSelector('.settings-segmented-strip, [data-testid="mobile-settings-row-clinic"], [data-testid="settings-view"]', { timeout: 25000 });
    await page.waitForTimeout(1000);

    if (!s.isMobile) {
      // Desktop: switch to Admin role, then click messengers tab
      console.log("Desktop: Selecting Admin role...");
      const adminRoleBtn = page.locator('[data-testid="btn-settings-role-admin"]');
      await adminRoleBtn.waitFor({ state: "visible", timeout: 10000 });
      await adminRoleBtn.click();
      await page.waitForTimeout(800);

      console.log("Desktop: Clicking admin-tab-messengers...");
      const messengersTabBtn = page.locator('[data-testid="admin-tab-messengers"]');
      await messengersTabBtn.waitFor({ state: "visible", timeout: 10000 });
      await messengersTabBtn.click();
      await page.waitForTimeout(2000);
    } else {
      // Mobile: click mobile-settings-row-messengers
      console.log("Mobile: Finding messengers row...");
      const mobileRow = page.locator('[data-testid="mobile-settings-row-messengers"]');
      await mobileRow.scrollIntoViewIfNeeded();
      await mobileRow.waitFor({ state: "visible", timeout: 10000 });
      await mobileRow.click();
      await page.waitForTimeout(2000);
    }

    // Clean any overlays again
    await page.evaluate(() => {
      document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"]').forEach((el) => el.remove());
    });

    // Wait for MessengersOverviewCard to mount
    console.log("Waiting for [data-testid='messengers-overview-card']...");
    const overviewCard = page.locator("[data-testid='messengers-overview-card']");
    await overviewCard.waitFor({ state: "visible", timeout: 15000 });
    await page.waitForTimeout(1500);

    const docPath = path.join(TARGET_DIR, s.name);
    const brainPath = path.join(BRAIN_DIR, s.name);
    await page.screenshot({ path: docPath, fullPage: false });
    fs.copyFileSync(docPath, brainPath);

    const stat = fs.statSync(docPath);
    console.log(`Saved ${s.name}: ${stat.size} bytes`);

    await context.close();
  }

  await browser.close();
  console.log("\nALL 4 SCREENSHOTS CAPTURED SUCCESSFULLY!");
}

capture().catch((e) => {
  console.error("FATAL ERROR:", e);
  process.exit(1);
});
