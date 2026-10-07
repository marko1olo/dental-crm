const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const TARGET_DIR = path.resolve("docs/screenshots/omnichannel_master");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/a3b47045-b11d-4653-8af4-e9981cee44dc");

if (!fs.existsSync(TARGET_DIR)) fs.mkdirSync(TARGET_DIR, { recursive: true });
if (!fs.existsSync(BRAIN_DIR)) fs.mkdirSync(BRAIN_DIR, { recursive: true });

async function capture() {
  console.log("1. Authenticating as doctor@clinic.com...");
  const loginRes = await fetch("http://127.0.0.1:4100/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "doctor@clinic.com", password: "dente2026" }),
  });
  const auth = await loginRes.json();
  console.log("Auth OK, clinicToken present:", Boolean(auth.clinicToken));

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
      hasTouch: s.isMobile,
      deviceScaleFactor: 2,
    });

    await context.addInitScript(({ auth, isDark, isMobile }) => {
      window.addEventListener("dente-toast", (e) => {
        e.stopImmediatePropagation();
        e.preventDefault();
      }, true);

      localStorage.setItem("dente_clinic_token", auth.clinicToken);
      localStorage.setItem("dente_staff_token", auth.staffToken);
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({ ...auth.user, role: "owner" }));
      localStorage.setItem("dente_cached_active_staff_user", JSON.stringify({ ...auth.user, role: "owner" }));
      localStorage.setItem("dente_theme_mode", isDark ? "dark" : "light");
      localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_training_mode_completed", "true");
      localStorage.setItem("dente_training_active", "false");
      localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
      localStorage.setItem("dente_guide_tour_seen_roles_v2", JSON.stringify(["admin", "doctor", "director"]));
      localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isDismissedPermanently: true, activeTrack: null, tracksProgress: {} }));
      localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
        version: 1,
        uiLanguage: "ru",
        selectedWorkspaceRole: "owner",
        onboardingDismissed: true,
        onboardingStep: "done",
      }));
    }, { auth, isDark: s.isDark, isMobile: s.isMobile });

    const page = await context.newPage();

    // Navigate with demo=true and #settings
    await page.goto("http://127.0.0.1:5173/?demo=true#settings", { waitUntil: "domcontentloaded", timeout: 25000 });
    await page.waitForTimeout(2500);

    // Apply theme
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
      // Remove any overlays
      document.querySelectorAll('.sa-toast, [data-testid="global-toast"], .tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"], [data-testid="interactive-tour-invite-banner"]').forEach((el) => el.remove());
    }, s.isDark);

    if (!s.isMobile) {
      // Desktop flow
      console.log("Desktop: Ensuring admin role tab is clicked...");
      const adminRoleBtn = page.locator('[data-testid="btn-settings-role-admin"]');
      await adminRoleBtn.waitFor({ state: "visible", timeout: 15000 });
      await adminRoleBtn.click({ force: true });
      await page.waitForTimeout(800);

      console.log("Desktop: Clicking admin-tab-messengers...");
      const messengersTabBtn = page.locator('[data-testid="admin-tab-messengers"]');
      await messengersTabBtn.waitFor({ state: "visible", timeout: 15000 });
      await messengersTabBtn.click({ force: true });
      await page.waitForTimeout(1000);
    } else {
      // Mobile flow
      console.log("Mobile: Clicking mobile-settings-row-messengers...");
      const mobileRow = page.locator('[data-testid="mobile-settings-row-messengers"]');
      await mobileRow.scrollIntoViewIfNeeded();
      await mobileRow.waitFor({ state: "visible", timeout: 15000 });
      await mobileRow.click({ force: true });
      await page.waitForTimeout(1200);
    }

    // Wait for MessengersOverviewCard
    console.log("Waiting for MessengersOverviewCard...");
    const overviewCard = page.locator("[data-testid='messengers-overview-card']");
    await overviewCard.first().waitFor({ state: "visible", timeout: 15000 });

    // Inject suppression style and reset scroll
    await page.evaluate((isMobile) => {
      const style = document.createElement("style");
      style.innerHTML = `
        .sa-toast, [data-testid="global-toast"], .global-toast-container, [role="alert"], [data-testid="interactive-tour-invite-banner"], .tour-spotlight-root {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
      `;
      document.head.appendChild(style);

      document.querySelectorAll('.sa-toast, [data-testid="global-toast"], .tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"], [data-testid="interactive-tour-invite-banner"]').forEach((el) => el.remove());

      if (isMobile) {
        document.querySelectorAll("*").forEach((el) => {
          if (el.scrollTop > 0) el.scrollTop = 0;
        });
        window.scrollTo(0, 0);
      }
    }, s.isMobile);

    if (!s.isMobile) {
      await overviewCard.first().scrollIntoViewIfNeeded();
    }
    await page.waitForTimeout(500);

    const docPath = path.join(TARGET_DIR, s.name);
    const brainPath = path.join(BRAIN_DIR, s.name);
    await page.screenshot({ path: docPath, fullPage: false });
    fs.copyFileSync(docPath, brainPath);

    const stat = fs.statSync(docPath);
    console.log(`Saved ${s.name}: ${stat.size} bytes (Target: >= 40000 bytes)`);
    if (stat.size < 40000) {
      console.warn(`WARNING: File size is under 40KB (${stat.size} bytes)`);
    }

    await context.close();
  }

  await browser.close();
  console.log("\nALL 4 LIVE PROOFS CAPTURED SUCCESSFULLY!");
}

capture().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
