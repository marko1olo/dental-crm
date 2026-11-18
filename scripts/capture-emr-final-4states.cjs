const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const CONV_ID = "65510ae0-ff00-4753-823d-ea462a92d61c";
const PROOFS_DIR = path.resolve(__dirname, "..", "docs", "proofs", "emr");
const SCREENSHOTS_DIR = path.resolve(__dirname, "..", "docs", "screenshots", "emr");
const BRAIN_DIR = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}/screenshots/emr`);

for (const dir of [PROOFS_DIR, SCREENSHOTS_DIR, BRAIN_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function replicateFile(srcPath, filename) {
  for (const dir of [SCREENSHOTS_DIR, BRAIN_DIR]) {
    try {
      fs.copyFileSync(srcPath, path.join(dir, filename));
    } catch (_) {}
  }
}

async function main() {
  console.log("=== 1. REAL AUTHENTICATION VIA FASTIFY API 4100 ===");
  const authRes = await fetch("http://127.0.0.1:4100/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "doctor@clinic.com", password: "dente2026" }),
  });
  const authData = await authRes.json();
  console.log("[Auth] Logged in as:", authData.user?.fullName, "Role:", authData.user?.role);

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  async function injectAuth(context, theme = "light") {
    await context.addInitScript(({ clinicToken, staffToken, user, th }) => {
      localStorage.setItem("dente_clinic_token", clinicToken);
      localStorage.setItem("dente_staff_token", staffToken);
      localStorage.setItem("dente_active_session_token", staffToken);
      localStorage.setItem("dente_active_role", user.role);
      localStorage.setItem("dente_user_role", user.role);
      localStorage.setItem("dente_active_user_id", user.id || "doc-1");
      localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(user));
      localStorage.setItem("dente_theme", th);
      localStorage.setItem("dente_theme_mode", th);
      localStorage.setItem("theme", th);
      localStorage.setItem("dente_demo_showcase", "true");
      localStorage.setItem("dente_demo_mode", "true");
      localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_tour_dismissed", "true");
      localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
      localStorage.setItem("dente_demo_banner_dismissed", "true");
      localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isDismissedPermanently: true, activeTrack: null, tracksProgress: {} }));
      document.cookie = `dente_clinic_token=${encodeURIComponent(clinicToken)}; path=/; max-age=31536000`;
      document.cookie = `dente_staff_token=${encodeURIComponent(staffToken)}; path=/; max-age=31536000`;
    }, { clinicToken: authData.clinicToken, staffToken: authData.staffToken, user: authData.user, th: theme });
  }

  async function cleanOverlays(page, theme = "light") {
    await page.evaluate((th) => {
      document.documentElement.setAttribute("data-theme", th);
      if (th === "dark") {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
        document.body.className = "dark";
      } else {
        document.documentElement.classList.add("light");
        document.documentElement.classList.remove("dark");
        document.body.className = "light";
      }
      let style = document.getElementById("suppress-all-overlays");
      if (!style) {
        style = document.createElement("style");
        style.id = "suppress-all-overlays";
        document.head.appendChild(style);
      }
      style.innerHTML = `
        .tour-spotlight-root,
        .tour-backdrop-clickable-zone,
        [data-testid="guided-tour-spotlight-overlay"],
        [data-testid="guided-tour-coach-mark-card"],
        [data-testid="demo-mode-banner"],
        .shepherd-element {
          display: none !important;
          pointer-events: none !important;
        }
      `;
      document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"]').forEach((el) => el.remove());
    }, theme);
    await page.waitForTimeout(500);
  }

  async function waitForRealUI(page) {
    for (let i = 0; i < 35; i++) {
      await page.waitForTimeout(1000);
      try {
        const text = await page.evaluate(() => (document.body ? document.body.innerText : ""));
        if (!text.includes("Загрузка системы") && text.length > 200) {
          console.log(`[UI Ready at sec ${i+1}] Found populated DOM (${text.length} chars)`);
          return true;
        }
      } catch (_) {}
    }
    console.log("[UI Warning] Timed out waiting for full text");
    return false;
  }

  async function openEmrModal(page) {
    console.log("  Opening EMR Medical Record modal...");
    // 1. Попробуем прямое событие
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("dente:open-medical-card"));
    });
    await page.waitForTimeout(1000);

    // 2. Если модалка не появилась, кликаем через карточку пациента
    const emrModal = page.locator(".emr-studio-window, .emr043-modal-window").first();
    if (!await emrModal.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log("  Modal not open via event, navigating to patients...");
      const patientRow = page.locator('[data-patient-id], tr[data-id], .patient-row, [data-testid^="patient-row-"]').first();
      if (await patientRow.isVisible({ timeout: 5000 }).catch(() => false)) {
        await patientRow.click({ force: true });
        await page.waitForTimeout(1000);
      }
      const emrBtn = page.locator('button:has-text("ЭМК"), button:has-text("Медицинская карта"), [data-testid="btn-open-emr-modal"]').first();
      if (await emrBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await emrBtn.click({ force: true });
        await page.waitForTimeout(1500);
      }
    }

    // 3. Переключаемся на таб «4. Дневники визитов»
    const diariesTab = page.locator('nav button:has-text("4. Дневники визитов"), nav button:has-text("Дневники"), button:has-text("Дневники визитов")').first();
    if (await diariesTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log("  Switching to Diaries tab...");
      await diariesTab.click();
      await page.waitForTimeout(600);
    }
  }

  const WEB_URL = "http://127.0.0.1:5173";

  try {
    // ═══════════════════════════════════════════════════════════
    // 1. PC LIGHT (1440x900)
    // ═══════════════════════════════════════════════════════════
    {
      console.log("\n[STATE 1/4] Capturing PC Light (1440x900)...");
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      await injectAuth(ctx, "light");
      const page = await ctx.newPage();
      await page.goto(`${WEB_URL}/?demo=true#patients`, { waitUntil: "commit", timeout: 35000 });
      await waitForRealUI(page);
      await cleanOverlays(page, "light");
      await openEmrModal(page);
      await cleanOverlays(page, "light");

      const shot = path.resolve(PROOFS_DIR, "01_emr_studio_pc_light_1440x900.png");
      await page.screenshot({ path: shot });
      replicateFile(shot, "01_emr_studio_pc_light_1440x900.png");
      const sz = fs.statSync(shot).size;
      console.log(`  [SAVED] 01_emr_studio_pc_light_1440x900.png (${sz} bytes, >=20KB: ${sz >= 20480})`);
      await ctx.close();
    }

    // ═══════════════════════════════════════════════════════════
    // 2. PC DARK (1440x900)
    // ═══════════════════════════════════════════════════════════
    {
      console.log("\n[STATE 2/4] Capturing PC Dark (1440x900)...");
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      await injectAuth(ctx, "dark");
      const page = await ctx.newPage();
      await page.goto(`${WEB_URL}/?demo=true#patients`, { waitUntil: "commit", timeout: 35000 });
      await waitForRealUI(page);
      await cleanOverlays(page, "dark");
      await openEmrModal(page);
      await cleanOverlays(page, "dark");

      const shot = path.resolve(PROOFS_DIR, "02_emr_studio_pc_dark_1440x900.png");
      await page.screenshot({ path: shot });
      replicateFile(shot, "02_emr_studio_pc_dark_1440x900.png");
      const sz = fs.statSync(shot).size;
      console.log(`  [SAVED] 02_emr_studio_pc_dark_1440x900.png (${sz} bytes, >=20KB: ${sz >= 20480})`);
      await ctx.close();
    }

    // ═══════════════════════════════════════════════════════════
    // 3. MOBILE LIGHT (390x844 - Apple HIG)
    // ═══════════════════════════════════════════════════════════
    {
      console.log("\n[STATE 3/4] Capturing Mobile Light (390x844)...");
      const ctx = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      });
      await injectAuth(ctx, "light");
      const page = await ctx.newPage();
      await page.goto(`${WEB_URL}/?demo=true#patients`, { waitUntil: "commit", timeout: 35000 });
      await waitForRealUI(page);
      await cleanOverlays(page, "light");
      await openEmrModal(page);
      await cleanOverlays(page, "light");

      const shot = path.resolve(PROOFS_DIR, "03_emr_studio_mobile_light_390x844.png");
      await page.screenshot({ path: shot });
      replicateFile(shot, "03_emr_studio_mobile_light_390x844.png");
      const sz = fs.statSync(shot).size;
      console.log(`  [SAVED] 03_emr_studio_mobile_light_390x844.png (${sz} bytes, >=20KB: ${sz >= 20480})`);
      await ctx.close();
    }

    // ═══════════════════════════════════════════════════════════
    // 4. MOBILE DARK (390x844 - Apple HIG)
    // ═══════════════════════════════════════════════════════════
    {
      console.log("\n[STATE 4/4] Capturing Mobile Dark (390x844)...");
      const ctx = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      });
      await injectAuth(ctx, "dark");
      const page = await ctx.newPage();
      await page.goto(`${WEB_URL}/?demo=true#patients`, { waitUntil: "commit", timeout: 35000 });
      await waitForRealUI(page);
      await cleanOverlays(page, "dark");
      await openEmrModal(page);
      await cleanOverlays(page, "dark");

      const shot = path.resolve(PROOFS_DIR, "04_emr_studio_mobile_dark_390x844.png");
      await page.screenshot({ path: shot });
      replicateFile(shot, "04_emr_studio_mobile_dark_390x844.png");
      const sz = fs.statSync(shot).size;
      console.log(`  [SAVED] 04_emr_studio_mobile_dark_390x844.png (${sz} bytes, >=20KB: ${sz >= 20480})`);
      await ctx.close();
    }

    console.log("\n=== ALL 4 STATES CAPTURED SUCCESSFULLY ===");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
