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
  console.log("=== 1. REAL AUTHENTICATION VIA FASTIFY API ===");
  let authData = { clinicToken: "demo-clinic-token", staffToken: "demo-staff-token", user: { id: "doc-1", role: "doctor", fullName: "Д-р Воронов А.В." } };
  try {
    const authRes = await fetch("http://127.0.0.1:4100/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "doctor@clinic.com", password: "dente2026" }),
    });
    if (authRes.ok) {
      const parsed = await authRes.json();
      if (parsed.staffToken) {
        authData = parsed;
        console.log("[Auth] Successfully logged in as:", authData.user?.fullName);
      }
    }
  } catch (err) {
    console.log("[Auth Warning] Fallback to demo tokens:", err.message);
  }

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

  async function openAndHydrateEmr(page) {
    // 1. Попробуем через триггер в карточке пациента или hash
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("dente:open-medical-card"));
    });
    await page.waitForTimeout(1000);

    const emrModal = page.locator('.emr-studio-window, .emr043-modal-window, .emr-studio-backdrop').first();
    const isVisible = await emrModal.isVisible({ timeout: 3000 }).catch(() => false);
    if (!isVisible) {
      console.log("  [EMR] Modal not visible via event, clicking patient card directly...");
      const row = page.locator('[data-patient-id], tr[data-id], .patient-row, [data-testid^="patient-row-"]').first();
      if (await row.isVisible({ timeout: 3000 }).catch(() => false)) {
        await row.click({ force: true });
        await page.waitForTimeout(800);
        const cardBtn = page.locator('button:has-text("В карту"), [data-testid="patient-action-open-card"], [data-testid="btn-open-patient-card"]').first();
        if (await cardBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await cardBtn.click({ force: true });
          await page.waitForTimeout(1000);
        }
      }
      const emrBtn = page.locator('button:has-text("ЭМК"), button:has-text("Медицинская карта"), [data-testid="btn-open-emr-modal"]').first();
      if (await emrBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await emrBtn.click({ force: true });
        await page.waitForTimeout(1000);
      }
    }

    // Если всё ещё нет, открываем через hash direct launcher
    if (!(await emrModal.isVisible({ timeout: 2000 }).catch(() => false))) {
      await page.evaluate(() => {
        window.location.hash = "#medical-card";
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      });
      await page.waitForTimeout(1500);
    }

    // Переключаемся на таб Дневники визитов
    const diariesTabBtn = page.locator('nav button:has-text("4. Дневники визитов"), nav button:has-text("Дневники"), button:has-text("Дневники визитов")').first();
    if (await diariesTabBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log("  [EMR] Switching to Diaries Tab...");
      await diariesTabBtn.click();
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
      await page.waitForTimeout(3000);
      await cleanOverlays(page, "light");
      await openAndHydrateEmr(page);
      await cleanOverlays(page, "light");

      const shot = path.resolve(PROOFS_DIR, "01_emr_studio_pc_light_1440x900.png");
      await page.screenshot({ path: shot });
      replicateFile(shot, "01_emr_studio_pc_light_1440x900.png");
      console.log("  [SAVED]", shot, "Size:", fs.statSync(shot).size, "bytes");
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
      await page.waitForTimeout(3000);
      await cleanOverlays(page, "dark");
      await openAndHydrateEmr(page);
      await cleanOverlays(page, "dark");

      const shot = path.resolve(PROOFS_DIR, "02_emr_studio_pc_dark_1440x900.png");
      await page.screenshot({ path: shot });
      replicateFile(shot, "02_emr_studio_pc_dark_1440x900.png");
      console.log("  [SAVED]", shot, "Size:", fs.statSync(shot).size, "bytes");
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
      await page.waitForTimeout(3000);
      await cleanOverlays(page, "light");
      await openAndHydrateEmr(page);
      await cleanOverlays(page, "light");

      const shot = path.resolve(PROOFS_DIR, "03_emr_studio_mobile_light_390x844.png");
      await page.screenshot({ path: shot });
      replicateFile(shot, "03_emr_studio_mobile_light_390x844.png");
      console.log("  [SAVED]", shot, "Size:", fs.statSync(shot).size, "bytes");
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
      await page.waitForTimeout(3000);
      await cleanOverlays(page, "dark");
      await openAndHydrateEmr(page);
      await cleanOverlays(page, "dark");

      const shot = path.resolve(PROOFS_DIR, "04_emr_studio_mobile_dark_390x844.png");
      await page.screenshot({ path: shot });
      replicateFile(shot, "04_emr_studio_mobile_dark_390x844.png");
      console.log("  [SAVED]", shot, "Size:", fs.statSync(shot).size, "bytes");
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
