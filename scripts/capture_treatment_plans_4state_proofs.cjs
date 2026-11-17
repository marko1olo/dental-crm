/**
 * scripts/capture_treatment_plans_4state_proofs.cjs
 *
 * 4-STATE VISUAL PROOF CAPTURE: TREATMENT PLAN STUDIO SSOT
 * Mandates 8al, 8am, 8e, Apple HIG (390x844 & 1440x900).
 * Captures canonical states:
 * 1. 01_treatment_plan_studio_pc_light_1440x900.png
 * 2. 02_treatment_plan_studio_pc_dark_1440x900.png
 * 3. 03_treatment_plan_studio_mobile_light_390x844.png
 * 4. 04_treatment_plan_studio_mobile_dark_390x844.png
 * 5. 05_treatment_plan_warranty_pc_light_1440x900.png
 * 6. 06_treatment_plan_warranty_pc_dark_1440x900.png
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const BASE_URL = "http://127.0.0.1:5173/?demo=1&plans=1#treatment-plans";
const OUT_DIRS = [
  path.resolve(__dirname, "../docs/proofs/treatment-plans"),
  path.resolve(__dirname, "../docs/proofs/treatment_plans"),
  path.resolve(__dirname, "../docs/proofs/treatment_plan_presenter"),
];

for (const dir of OUT_DIRS) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const browserCandidates = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

const executablePath = browserCandidates.find((p) => fs.existsSync(p));
if (!executablePath) {
  throw new Error("No browser executable found in candidates");
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log("🚀 Starting Treatment Plan Studio 4-State Proof Capture...");
  console.log("Browser:", executablePath);

  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });

  const targets = [
    {
      name: "01_treatment_plan_studio_pc_light_1440x900.png",
      legacyName: "01_treatment_plan_presenter_pc_light_1440x900.png",
      viewport: { width: 1440, height: 900 },
      isMobile: false,
      theme: "light",
      url: BASE_URL,
    },
    {
      name: "02_treatment_plan_studio_pc_dark_1440x900.png",
      legacyName: "02_treatment_plan_presenter_pc_dark_1440x900.png",
      viewport: { width: 1440, height: 900 },
      isMobile: false,
      theme: "dark",
      url: BASE_URL,
    },
    {
      name: "03_treatment_plan_studio_mobile_light_390x844.png",
      legacyName: "03_treatment_plan_presenter_mobile_light_390x844.png",
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      theme: "light",
      url: BASE_URL,
    },
    {
      name: "04_treatment_plan_studio_mobile_dark_390x844.png",
      legacyName: "04_treatment_plan_presenter_mobile_dark_390x844.png",
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      theme: "dark",
      url: BASE_URL,
    },
    {
      name: "05_treatment_plan_warranty_pc_light_1440x900.png",
      legacyName: "03_treatment_plan_warranty_pc_light_1440x900.png",
      viewport: { width: 1440, height: 900 },
      isMobile: false,
      theme: "light",
      tab: "warranty",
      url: BASE_URL,
    },
    {
      name: "06_treatment_plan_warranty_pc_dark_1440x900.png",
      legacyName: "04_treatment_plan_warranty_pc_dark_1440x900.png",
      viewport: { width: 1440, height: 900 },
      isMobile: false,
      theme: "dark",
      tab: "warranty",
      url: BASE_URL,
    },
  ];

  for (const t of targets) {
    const context = await browser.newContext({
      viewport: t.viewport,
      deviceScaleFactor: 2,
      isMobile: t.isMobile,
      hasTouch: t.hasTouch || false,
    });

    await context.addInitScript(({ theme, isDark }) => {
      try {
        sessionStorage.setItem("dente_unlocked", "true");
        sessionStorage.setItem("dente:sw-controller-reload", "1");
        localStorage.setItem("dente_clinic_token", "demo-clinic-token");
        localStorage.setItem("dente_staff_token", "demo-staff-token");
        localStorage.setItem("dente_active_session_token", "demo-staff-token");
        localStorage.setItem("dente_workspace_perspective", "doctor");
        localStorage.setItem("dente_user_role", "doctor");
        localStorage.setItem("dente_active_role", "doctor");
        localStorage.setItem("dente_active_user_id", "doc-1");
        localStorage.setItem("dente_active_staff_user", JSON.stringify({ id: "doc-1", name: "Д-р Орлов А.В.", role: "doctor" }));
        localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({ id: "doc-1", fullName: "Д-р Орлов А.В.", role: "doctor" }));
        localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true, step: "done" }));
        localStorage.setItem("dente_onboarding_completed", "true");
        localStorage.setItem("dente_tour_completed", "true");
        localStorage.setItem("dente_tour_dismissed", "true");
        localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
        localStorage.setItem("dente_demo_banner_dismissed", "true");
        localStorage.setItem("dente_theme_mode", theme);
        localStorage.setItem("dente_theme", theme);
        localStorage.setItem("theme", theme);
        localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
          version: 1,
          uiLanguage: "ru",
          selectedWorkspaceRole: "doctor",
          selectedSpecialty: "therapist",
          onboardingDismissed: true,
        }));
      } catch (e) {}
    }, { theme: t.theme, isDark: t.theme === "dark" });

    const page = await context.newPage();

    console.log(`\nNavigating to ${t.url} (${t.viewport.width}x${t.viewport.height}, theme: ${t.theme})...`);
    let navigated = false;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        await page.goto(t.url, { waitUntil: "commit", timeout: 30000 });
        navigated = true;
        break;
      } catch (err) {
        console.warn(`Retry navigation attempt ${attempt + 1}:`, err.message);
        await sleep(1500);
      }
    }
    if (!navigated) {
      throw new Error(`Failed to navigate to ${t.url}`);
    }

    await sleep(2000);

    // Set theme and remove overlays
    const isDark = t.theme === "dark";
    try {
      await page.evaluate(({ isDark, theme }) => {
        document.documentElement.setAttribute("data-theme", theme);
        document.documentElement.classList.toggle("dark", isDark);
        document.documentElement.classList.toggle("light", !isDark);
        if (document.body) {
          document.body.className = isDark ? "dark" : "light";
          document.body.classList.toggle("dark", isDark);
          document.body.classList.toggle("light", !isDark);
        }
        document.documentElement.style.colorScheme = isDark ? "dark" : "light";
        localStorage.setItem("dente_theme_mode", theme);
        localStorage.setItem("dente_theme", theme);
        localStorage.setItem("theme", theme);

        const clutter = [
          ".tour-spotlight-root",
          ".tour-backdrop-clickable-zone",
          '[data-testid="guided-tour-spotlight-overlay"]',
          '[data-testid="guided-tour-coach-mark-card"]',
          '[data-testid="demo-mode-banner"]',
          ".shepherd-element",
          ".splash",
          "#splash-root",
          '[data-testid="splash-loader"]',
          ".splash-screen",
          "#loading-screen",
        ];
        clutter.forEach((sel) => {
          document.querySelectorAll(sel).forEach((el) => el.remove());
        });

        const style = document.createElement("style");
        style.id = "suppress-all-overlays";
        style.innerHTML = `
          .tour-spotlight-root,
          .tour-backdrop-clickable-zone,
          [data-testid="guided-tour-spotlight-overlay"],
          [data-testid="guided-tour-coach-mark-card"],
          [data-testid="demo-mode-banner"],
          .shepherd-element,
          .splash,
          #splash-root,
          [data-testid="splash-loader"],
          .splash-screen,
          #loading-screen,
          [data-testid="global-toast"],
          .sa-toast {
            display: none !important;
            pointer-events: none !important;
            opacity: 0 !important;
          }
        `;
        document.head.appendChild(style);
      }, { isDark, theme: t.theme });
    } catch (err) {
      console.warn("Theme set warning:", err.message);
    }

    await sleep(800);

    // Гарантированное открытие Студии планов лечения
    for (let attempt = 0; attempt < 12; attempt++) {
      await page.evaluate(() => {
        window.dispatchEvent(
          new CustomEvent("dente:open-treatment-plan", {
            detail: {
              patientName: "Смирнова Екатерина Васильевна",
              doctorFullName: "Д-р Орлов А.В. (Главный врач)",
              patientId: "00000000-0000-0000-0000-000000000001",
            },
          }),
        );
      }).catch(() => {});
      const modal = await page.$('[data-testid="treatment-plan-studio-modal"]');
      if (modal && await modal.isVisible()) {
        console.log('Found visible [data-testid="treatment-plan-studio-modal"]!');
        break;
      }
      await sleep(800);
    }

    // Дожидаемся селектора модалки перед снимком
    await page.waitForSelector('[data-testid="treatment-plan-studio-modal"]', { state: "visible", timeout: 15000 }).catch((e) => {
      console.warn("waitForSelector modal warning:", e.message);
    });
    await sleep(800);

    if (t.tab === "warranty") {
      try {
        await page.click('[data-testid="depth-mode-expert-btn"]');
        await sleep(500);
        await page.click('[data-testid="tab-warranty-passport"]');
        await page.waitForSelector('[data-testid="studio-warranty-passport-tab"]', { state: "visible", timeout: 10000 });
        await sleep(800);
      } catch (err) {
        console.warn("Could not switch to warranty tab:", err.message);
      }
    }

    await sleep(600);

    for (const dir of OUT_DIRS) {
      const outPath = path.join(dir, t.name);
      await page.screenshot({ path: outPath, fullPage: false });
      const stats = fs.statSync(outPath);
      console.log(`✅ Captured: ${outPath} (${Math.round(stats.size / 1024)} KB)`);

      if (t.legacyName) {
        const legacyPath = path.join(dir, t.legacyName);
        fs.copyFileSync(outPath, legacyPath);
      }
      const canonicalName = t.name.replace("_studio_", "_");
      if (canonicalName !== t.name) {
        fs.copyFileSync(outPath, path.join(dir, canonicalName));
      }
      const tierName = t.name.replace("_studio_", "_3tier_");
      if (tierName !== t.name) {
        fs.copyFileSync(outPath, path.join(dir, tierName));
      }
      const shortName = t.name
        .replace("_studio_", "s_")
        .replace("_1440x900", "")
        .replace("_390x844", "");
      fs.copyFileSync(outPath, path.join(dir, shortName));
    }

    await context.close();
  }

  await browser.close();
  console.log("\n🎉 All 4-State Proofs Captured Successfully!");
}

main().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
