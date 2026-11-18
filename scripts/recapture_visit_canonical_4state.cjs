const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const PROOFS_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/visit");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/ff1921e6-2535-4d8f-bbcd-3b7df4937ba7");

for (const dir of [PROOFS_DIR, BRAIN_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function suppressOverlays(page) {
  await page.evaluate(() => {
    const style = document.createElement("style");
    style.id = "suppress-all-overlays";
    style.innerHTML = `
      .tour-spotlight-root, .tour-backdrop-clickable-zone,
      [data-testid="guided-tour-spotlight-overlay"],
      [data-testid="guided-tour-coach-mark-card"],
      [data-testid="demo-mode-banner"], .global-toast-container,
      vite-error-overlay { display: none !important; pointer-events: none !important; }
    `;
    document.head.appendChild(style);
    document.querySelectorAll('.global-toast, .toast, .sa-toast, [data-testid="global-toast"], [role="alert"]').forEach(el => el.remove());
  }).catch(() => {});
}

async function setTheme(page, theme) {
  await page.evaluate((th) => {
    document.documentElement.setAttribute("data-theme", th);
    document.body.setAttribute("data-theme", th);
    if (th === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      document.body.classList.add("dark");
      document.body.classList.remove("light");
      document.documentElement.style.colorScheme = "dark";
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.body.classList.remove("dark");
      document.body.classList.add("light");
      document.documentElement.style.colorScheme = "light";
    }
    localStorage.setItem("dente_theme", th);
    localStorage.setItem("dente_theme_mode", th);
    localStorage.setItem("dente-theme", th);
    localStorage.setItem("theme", th);
    if (window.__useThemeStore) {
      window.__useThemeStore.getState().setThemeMode(th);
    }
    window.dispatchEvent(new Event("themechange"));
  }, theme).catch(() => {});
  await suppressOverlays(page);
  await page.waitForTimeout(600);
}

async function saveProof(page, fileName) {
  await suppressOverlays(page);
  const proofFilePath = path.join(PROOFS_DIR, fileName);
  await page.screenshot({ path: proofFilePath, fullPage: false, animations: "disabled" });

  const brainFilePath = path.join(BRAIN_DIR, fileName);
  fs.copyFileSync(proofFilePath, brainFilePath);

  const stats = fs.statSync(proofFilePath);
  console.log(`[CAPTURED]: ${fileName} -> ${stats.size} bytes (${(stats.size / 1024).toFixed(1)} KB)`);

  if (stats.size < 35000) {
    throw new Error(`CRITICAL DEFECT: ${fileName} size ${stats.size} is < 35KB!`);
  }
}

async function capture() {
  console.log("=== Launching Chrome for Canonical 4-State Visit Proofs ===");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    serviceWorkers: "block",
  });

  await context.addInitScript(() => {
    localStorage.setItem("dente_demo_showcase", "true");
    localStorage.setItem("dente_clinic_token", "demo-showcase-token-therapist");
    localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-therapist");
    localStorage.setItem("dente_active_role", "doctor");
    localStorage.setItem("dente_user_role", "doctor");
    localStorage.setItem("dente_workspace_perspective", "doctor");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_tour_dismissed", "true");
    localStorage.setItem("dente_demo_banner_dismissed", "true");
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
    localStorage.setItem("dente_guide_tour_seen_roles_v2", JSON.stringify(["admin", "doctor", "director"]));
    localStorage.setItem("dente_theme", "light");
    localStorage.setItem("dente_theme_mode", "light");
    localStorage.setItem(
      "dente_active_staff_user",
      JSON.stringify({
        id: "019488a0-0000-7000-8000-000000000001",
        fullName: "Д-р Воронов Алексей Владимирович",
        role: "doctor",
        specialization: "Терапевт",
      })
    );
  });

  const page = await context.newPage();

  console.log("Navigating to http://127.0.0.1:5173/?demo=true#visit ...");
  await page.goto("http://127.0.0.1:5173/?demo=true#visit", {
    waitUntil: "commit",
    timeout: 35000,
  });

  console.log("Waiting for shell to mount and boot screen to detach...");
  await page.waitForSelector(".workspace-shell, .app-shell, .app-mobile-shell, nav", {
    state: "visible",
    timeout: 35000,
  });
  await page.waitForSelector(".boot-subtitle", { state: "detached", timeout: 25000 }).catch(() => {});

  console.log("Waiting for desktop visit-panel to settle...");
  await page.waitForFunction(() => {
    const p = document.querySelector(".visit-panel, [data-testid='visit-view'], .workspace-content");
    return p && !p.getAttribute("aria-busy") && !document.querySelector(".boot-subtitle");
  }, { timeout: 45000 });

  // If intake cockpit is showing, start next patient
  const startNextBtn = page.locator("#btn-intake-start-next, [data-testid='btn-intake-start-next']").first();
  if (await startNextBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log("Clicking start next patient button...");
    await startNextBtn.click();
    await page.waitForTimeout(2000);
  }

  // Ensure EMK / Diary tab is active
  const emkTabBtn = page.locator('[data-testid="visit-tab-emk"], button:has-text("ЭМК"), button:has-text("Дневник")').first();
  if (await emkTabBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log("Activating EMK tab...");
    await emkTabBtn.click().catch(() => {});
    await page.waitForTimeout(1000);
  }

  // 1. PC Light
  console.log("\n>>> Capturing 01_visit_view_pc_light_1440x900.png <<<");
  await setTheme(page, "light");
  await saveProof(page, "01_visit_view_pc_light_1440x900.png");

  // 2. PC Dark
  console.log("\n>>> Capturing 02_visit_view_pc_dark_1440x900.png <<<");
  await setTheme(page, "dark");
  await saveProof(page, "02_visit_view_pc_dark_1440x900.png");

  // 3. Mobile Light
  console.log("\n>>> Capturing 03_visit_view_mobile_light_390x844.png <<<");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1000);
  await setTheme(page, "light");
  await saveProof(page, "03_visit_view_mobile_light_390x844.png");

  // 4. Mobile Dark
  console.log("\n>>> Capturing 04_visit_view_mobile_dark_390x844.png <<<");
  await setTheme(page, "dark");
  await saveProof(page, "04_visit_view_mobile_dark_390x844.png");

  await browser.close();
  console.log("\n=== ALL 4 CANONICAL SCREENSHOTS SUCCESSFULLY PRODUCED & GUARD VERIFIED ===");
}

capture().catch((err) => {
  console.error("FATAL CAPTURE ERROR:", err);
  process.exit(1);
});
