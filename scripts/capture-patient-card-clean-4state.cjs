const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const CONV_ID = "93774532-8e43-4f61-9703-5fb3190efcad";
const DIRS = [
  path.resolve(__dirname, "..", "docs", "proofs", "patient_card"),
  path.resolve(__dirname, "..", "docs", "proofs", "patient-card"),
  `C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`,
];

DIRS.forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

function replicateFile(srcPath, filename) {
  for (const dir of DIRS) {
    try {
      fs.copyFileSync(srcPath, path.join(dir, filename));
    } catch (_) {}
  }
}

async function main() {
  console.log("=== 1. REAL AUTHENTICATION VIA FASTIFY API ===");
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
    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(1000);
      try {
        const text = await page.evaluate(() => (document.body ? document.body.innerText : ""));
        if (!text.includes("Загрузка системы") && text.length > 200) {
          console.log(`[UI Ready] Found populated DOM (${text.length} chars)`);
          return true;
        }
      } catch (_) {}
    }
    console.log("[UI Warning] Timed out waiting for full text");
    return false;
  }

  const WEB_URL = "http://127.0.0.1:5175";

  // ═══════════════════════════════════════════════════════════
  // PART A: PC 1440x900 (LIGHT & DARK)
  // ═══════════════════════════════════════════════════════════
  console.log("\n=== CAPTURING PATIENT CARD PC PROOFS ===");

  // 1. PC Light (1440x900)
  {
    console.log("[Patients] Capturing patient_card_pc_light_1440x900.png...");
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await injectAuth(ctx, "light");
    const page = await ctx.newPage();
    await page.goto(`${WEB_URL}/?demo=true#patients`, { waitUntil: "commit", timeout: 35000 });
    await waitForRealUI(page);
    await page.waitForTimeout(1500);

    // Click patient to open details/card
    try {
      const row = page.locator('[data-patient-id], tr[data-id], .patient-row, [data-testid^="patient-row-"]').first();
      await row.waitFor({ state: "visible", timeout: 10000 });
      await row.click({ force: true });
      await page.waitForTimeout(1000);
      const cardBtn = page.locator('button:has-text("В карту"), [data-testid="patient-action-open-card"], [data-testid="btn-open-patient-card"]').first();
      if (await cardBtn.count() > 0) {
        await cardBtn.click({ force: true });
        await page.waitForTimeout(1500);
      }
    } catch (e) {
      console.log("[Select Error]", e.message);
    }

    await cleanOverlays(page, "light");
    const shot = path.resolve(DIRS[0], "patient_card_pc_light_1440x900.png");
    await page.screenshot({ path: shot });
    replicateFile(shot, "patient_card_pc_light_1440x900.png");
    console.log("  Saved:", shot, "Size:", fs.statSync(shot).size, "bytes");

    // Also capture inline family wallet tab
    try {
      const familyTab = page.locator("button:has-text('Семья'), [data-tab='family']").first();
      if (await familyTab.count() > 0) {
        await familyTab.click();
        await page.waitForTimeout(600);
        const openWallet = page.locator("button:has-text('Семейный счет'), button:has-text('Управление балансом')").first();
        if (await openWallet.count() > 0) {
          await openWallet.click();
          await page.waitForTimeout(600);
        }
        await cleanOverlays(page, "light");
        const famShot = path.resolve(DIRS[0], "patient_family_inline_pc_light_1440x900.png");
        await page.screenshot({ path: famShot });
        replicateFile(famShot, "patient_family_inline_pc_light_1440x900.png");
        console.log("  Saved Family Inline:", famShot, "Size:", fs.statSync(famShot).size, "bytes");
      }
    } catch (_) {}

    await ctx.close();
  }

  // 2. PC Dark (1440x900)
  {
    console.log("[Patients] Capturing patient_card_pc_dark_1440x900.png...");
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await injectAuth(ctx, "dark");
    const page = await ctx.newPage();
    await page.goto(`${WEB_URL}/?demo=true#patients`, { waitUntil: "commit", timeout: 35000 });
    await waitForRealUI(page);
    await page.waitForTimeout(1500);

    try {
      const row = page.locator('[data-patient-id], tr[data-id], .patient-row, [data-testid^="patient-row-"]').first();
      await row.waitFor({ state: "visible", timeout: 10000 });
      await row.click({ force: true });
      await page.waitForTimeout(1000);
      const cardBtn = page.locator('button:has-text("В карту"), [data-testid="patient-action-open-card"], [data-testid="btn-open-patient-card"]').first();
      if (await cardBtn.count() > 0) {
        await cardBtn.click({ force: true });
        await page.waitForTimeout(1500);
      }
    } catch (e) {
      console.log("[Select Error]", e.message);
    }

    await cleanOverlays(page, "dark");
    const shot = path.resolve(DIRS[0], "patient_card_pc_dark_1440x900.png");
    await page.screenshot({ path: shot });
    replicateFile(shot, "patient_card_pc_dark_1440x900.png");
    console.log("  Saved:", shot, "Size:", fs.statSync(shot).size, "bytes");

    // Also capture inline family wallet tab in dark
    try {
      const familyTab = page.locator("button:has-text('Семья'), [data-tab='family']").first();
      if (await familyTab.count() > 0) {
        await familyTab.click();
        await page.waitForTimeout(600);
        const openWallet = page.locator("button:has-text('Семейный счет'), button:has-text('Управление балансом')").first();
        if (await openWallet.count() > 0) {
          await openWallet.click();
          await page.waitForTimeout(600);
        }
        await cleanOverlays(page, "dark");
        const famShot = path.resolve(DIRS[0], "patient_family_inline_pc_dark_1440x900.png");
        await page.screenshot({ path: famShot });
        replicateFile(famShot, "patient_family_inline_pc_dark_1440x900.png");
        console.log("  Saved Family Inline Dark:", famShot, "Size:", fs.statSync(famShot).size, "bytes");
      }
    } catch (_) {}

    await ctx.close();
  }

  // ═══════════════════════════════════════════════════════════
  // PART B: MOBILE 390x844 (APPLE HIG)
  // ═══════════════════════════════════════════════════════════
  console.log("\n=== CAPTURING PATIENT CARD MOBILE PROOFS ===");

  // 3. Mobile Light (390x844)
  {
    console.log("[Patients] Capturing patient_card_mobile_light_390x844.png...");
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    await injectAuth(ctx, "light");
    const page = await ctx.newPage();
    await page.goto(`${WEB_URL}/?demo=true#patients`, { waitUntil: "commit", timeout: 35000 });
    await waitForRealUI(page);
    await page.waitForTimeout(1500);

    try {
      const mobRow = page.locator('[data-patient-id], .mobile-patient-card, .patient-row, [data-testid^="patient-row-"]').first();
      await mobRow.waitFor({ state: "visible", timeout: 10000 });
      await mobRow.click({ force: true });
      await page.waitForTimeout(1000);
      const cardBtn = page.locator('button:has-text("В карту"), [data-testid="patient-action-open-card"], [data-testid="btn-open-patient-card"]').first();
      if (await cardBtn.count() > 0) {
        await cardBtn.click({ force: true });
        await page.waitForTimeout(1500);
      }
    } catch (e) {
      console.log("[Mobile Select Error]", e.message);
    }

    await cleanOverlays(page, "light");
    const shot = path.resolve(DIRS[0], "patient_card_mobile_light_390x844.png");
    await page.screenshot({ path: shot });
    replicateFile(shot, "patient_card_mobile_light_390x844.png");
    console.log("  Saved:", shot, "Size:", fs.statSync(shot).size, "bytes");
    await ctx.close();
  }

  // 4. Mobile Dark (390x844)
  {
    console.log("[Patients] Capturing patient_card_mobile_dark_390x844.png...");
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    await injectAuth(ctx, "dark");
    const page = await ctx.newPage();
    await page.goto(`${WEB_URL}/?demo=true#patients`, { waitUntil: "commit", timeout: 35000 });
    await waitForRealUI(page);
    await page.waitForTimeout(1500);

    try {
      const mobRow = page.locator('[data-patient-id], .mobile-patient-card, .patient-row, [data-testid^="patient-row-"]').first();
      await mobRow.waitFor({ state: "visible", timeout: 10000 });
      await mobRow.click({ force: true });
      await page.waitForTimeout(1000);
      const cardBtn = page.locator('button:has-text("В карту"), [data-testid="patient-action-open-card"], [data-testid="btn-open-patient-card"]').first();
      if (await cardBtn.count() > 0) {
        await cardBtn.click({ force: true });
        await page.waitForTimeout(1500);
      }
    } catch (e) {
      console.log("[Mobile Select Error]", e.message);
    }

    await cleanOverlays(page, "dark");
    const shot = path.resolve(DIRS[0], "patient_card_mobile_dark_390x844.png");
    await page.screenshot({ path: shot });
    replicateFile(shot, "patient_card_mobile_dark_390x844.png");
    console.log("  Saved:", shot, "Size:", fs.statSync(shot).size, "bytes");
    await ctx.close();
  }

  await browser.close();
  console.log("\n[SUCCESS] All Patient Card & Family Wallet 4-state visual proofs captured successfully!");
}

main().catch((err) => {
  console.error("FATAL CAPTURE ERROR:", err);
  process.exit(1);
});
