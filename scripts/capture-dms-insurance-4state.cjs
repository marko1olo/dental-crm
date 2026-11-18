/**
 * scripts/capture-dms-insurance-4state.cjs
 * Canonical 4-State Visual Proofs Generator for Russian DMS Insurance & Bill Splitting.
 * Mandates: 8al (4-State Visual Proof), 8ze / Apple HIG, 8am (One Primary CTA).
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const PROOFS_DIR = path.resolve("docs/proofs/insurance");
if (!fs.existsSync(PROOFS_DIR)) fs.mkdirSync(PROOFS_DIR, { recursive: true });

async function suppressOverlays(page) {
  await page.addStyleTag({
    content: `
      .tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone,
      .coachmark-tooltip-container, .guide-tour-floating-launcher, .clinical-quest-modal,
      [data-testid="interactive-guide-tour-card"], [data-testid="clinical-quest-banner"],
      .notification-toast, .global-toast, .toast-container, [data-toast], vite-error-overlay {
        display: none !important;
        pointer-events: none !important;
      }
    `,
  }).catch(() => {});
}

async function capture() {
  console.log("Launching browser for DMS Insurance 4-State capture...");
  const launchOptions = {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  };
  if (fs.existsSync("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe")) {
    launchOptions.executablePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  }
  const browser = await chromium.launch(launchOptions);

  const states = [
    {
      name: "01_dms_insurance_pc_light_1440x900.png",
      width: 1440,
      height: 900,
      theme: "light",
      isMobile: false,
    },
    {
      name: "02_dms_insurance_pc_dark_1440x900.png",
      width: 1440,
      height: 900,
      theme: "dark",
      isMobile: false,
    },
    {
      name: "03_dms_insurance_mobile_light_390x844.png",
      width: 390,
      height: 844,
      theme: "light",
      isMobile: true,
    },
    {
      name: "04_dms_insurance_mobile_dark_390x844.png",
      width: 390,
      height: 844,
      theme: "dark",
      isMobile: true,
    },
  ];

  for (const st of states) {
    console.log(`\n=== Capturing ${st.name} (${st.width}x${st.height}, theme: ${st.theme}) ===`);
    const context = await browser.newContext({
      viewport: { width: st.width, height: st.height },
      deviceScaleFactor: 2,
      isMobile: st.isMobile,
      hasTouch: st.isMobile,
      locale: "ru-RU",
    });

    await context.addInitScript((th) => {
      try {
        localStorage.setItem("dente_demo_showcase", "true");
        localStorage.setItem("dente_demo_mode", "true");
        localStorage.setItem("dente_offline_mode", "true");
        localStorage.setItem("dente_clinic_token", "demo_clinic_token");
        localStorage.setItem("dente_staff_token", "demo_staff_token");
        localStorage.setItem("dente_active_session_token", "demo_staff_token");
        localStorage.setItem("dente_organization_id", "org-demo-1");
        localStorage.setItem("dente_onboarding_completed", "true");
        localStorage.setItem("dente_tour_completed", "true");
        localStorage.setItem("dente_tour_dismissed", "true");
        localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
        localStorage.setItem("dente_active_role", "doctor");
        localStorage.setItem("dente_user_role", "doctor");
        localStorage.setItem("dente_role", "doctor");
        localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({ id: "demo-doctor", fullName: "Д-р Соколов А. В.", role: "doctor" }));
        localStorage.setItem("dente_theme", th);
        localStorage.setItem("dente_theme_mode", th);
        sessionStorage.setItem("dente_unlocked", "true");
      } catch (_) {}
    }, st.theme);

    const page = await context.newPage();

    const targetUrl = "http://127.0.0.1:5173/?demo=true&dms=1#dms";
    console.log(`Navigating to ${targetUrl}...`);
    await page.goto(targetUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    // Wait for boot screen to detach if present
    await page.waitForSelector(".boot-state", { state: "detached", timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(1000);

    // Ensure DMS modal is visible
    let modal = await page.$(".dms-modal-window");
    if (!modal) {
      console.log("Dispatching dente:open-dms event...");
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent("dente:open-dms"));
      });
      await page.waitForTimeout(1000);
    }

    await page.waitForSelector(".dms-modal-window", { state: "visible", timeout: 60000 });
    await suppressOverlays(page);

    // Set Theme
    await page.evaluate((th) => {
      document.documentElement.setAttribute("data-theme", th);
      document.body.setAttribute("data-theme", th);
      if (th === "dark") {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
        document.documentElement.style.colorScheme = "dark";
        document.body.classList.add("dark");
        document.body.classList.remove("light");
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
        document.documentElement.style.colorScheme = "light";
        document.body.classList.remove("dark");
        document.body.classList.add("light");
      }
      localStorage.setItem("dente_theme", th);
      localStorage.setItem("dente_theme_mode", th);
    }, st.theme);

    await page.waitForTimeout(800);

    const outPath = path.join(PROOFS_DIR, st.name);
    await page.screenshot({ path: outPath, fullPage: false });
    const size = fs.statSync(outPath).size;
    console.log(`[SUCCESS] Saved ${st.name} (${Math.round(size / 1024)} KB)`);

    await context.close();
  }

  await browser.close();
  console.log("\n>>> ALL 4 STATES CAPTURED SUCCESSFULLY!");
}

capture().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
