const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const TARGET_DIR = path.resolve("docs/screenshots/omnichannel_master");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/beb92312-c6d7-426d-a438-12dcad022abc");

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
      deviceScaleFactor: 2,
    });

    await context.addInitScript(({ auth, isDark }) => {
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
      localStorage.setItem("dente_guide_tour_seen_roles_v2", JSON.stringify(["owner", "doctor", "admin", "director"]));
      localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isDismissedPermanently: true, activeTrack: null, tracksProgress: {} }));
      localStorage.setItem("dental-crm:express-tour-dismissed", "true");
      localStorage.setItem("dente_express_tour_dismissed", "true");
      localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
        version: 1,
        uiLanguage: "ru",
        selectedWorkspaceRole: "owner",
        onboardingDismissed: true,
        onboardingStep: "done",
      }));
    }, { auth, isDark: s.isDark });

    const page = await context.newPage();
    await page.goto("http://127.0.0.1:5173/#settings", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector('[data-testid="settings-view"]', { timeout: 45000 });

    // Apply theme, inject anti-overlay styles & remove overlays
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
      
      const antiOverlayStyle = document.createElement("style");
      antiOverlayStyle.id = "anti-overlay-inquisition-style";
      antiOverlayStyle.innerHTML = `
        [data-testid="interactive-tour-invite-banner"],
        .global-toast-container,
        [role="alert"],
        .tour-spotlight-root,
        [data-testid="guided-tour-spotlight-overlay"],
        .tour-backdrop-clickable-zone,
        [data-testid="demo-mode-banner"] {
          display: none !important;
          opacity: 0 !important;
          visibility: hidden !important;
          pointer-events: none !important;
        }
      `;
      document.head.appendChild(antiOverlayStyle);

      document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"], [data-testid="interactive-tour-invite-banner"]').forEach((el) => el.remove());
    }, s.isDark);

    if (s.isMobile) {
      // For mobile: if mobile settings list is showing, tap on messengers row
      const mobileRow = page.locator('[data-testid="mobile-settings-row-messengers"], [data-testid="mobile-settings-row-telegram"], [data-testid="mobile-settings-row-whatsapp"]');
      if (await mobileRow.count() > 0) {
        console.log("Mobile: clicking messengers row...");
        await mobileRow.first().click({ force: true });
        await page.waitForTimeout(1500);
      }
    } else {
      // Desktop: switch to Admin role, then click messengers tab
      console.log("Desktop: clicking Admin role...");
      const adminRoleBtn = page.locator('[data-testid="btn-settings-role-admin"]');
      await adminRoleBtn.waitFor({ state: "visible", timeout: 10000 });
      await adminRoleBtn.click({ force: true });
      await page.waitForTimeout(600);

      console.log("Desktop: clicking admin-tab-messengers...");
      const messengersTab = page.locator('[data-testid="admin-tab-messengers"]');
      await messengersTab.waitFor({ state: "visible", timeout: 10000 });
      await messengersTab.click({ force: true });
      await page.waitForTimeout(1500);
    }

    console.log("Waiting for messengers overview card...");
    const overviewCard = page.locator("[data-testid='messengers-overview-card']");
    await overviewCard.first().waitFor({ state: "visible", timeout: 15000 });
    
    // Position scrolling properly
    await page.evaluate((isMobile) => {
      document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"], [data-testid="interactive-tour-invite-banner"]').forEach((el) => el.remove());

      const card = document.querySelector('[data-testid="messengers-overview-card"]');
      if (card) {
        if (isMobile) {
          // On mobile: scroll to top of settings container
          const scrollContainer = card.closest(".mobile-settings-subpage") || card.closest(".settings-view") || window;
          if (scrollContainer && scrollContainer.scrollTo) {
            scrollContainer.scrollTo(0, 0);
          }
          window.scrollTo(0, 0);
        } else {
          // On desktop: scroll smoothly into view
          card.scrollIntoView({ block: "start", behavior: "instant" });
          window.scrollBy(0, -90);
        }
      }
    }, s.isMobile);

    await page.waitForTimeout(1000);

    const docPath = path.join(TARGET_DIR, s.name);
    const brainPath = path.join(BRAIN_DIR, s.name);
    await page.screenshot({ path: docPath, fullPage: false });
    fs.copyFileSync(docPath, brainPath);

    const stat = fs.statSync(docPath);
    console.log(`Saved ${s.name}: ${stat.size} bytes`);

    await context.close();
  }

  await browser.close();
  console.log("\nALL 4 LIVE PROOFS CAPTURED SUCCESSFULLY!");
}

capture().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
