const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

async function testRealAuth() {
  console.log("[Auth] Fetching real JWT tokens from Fastify API...");
  const res = await fetch("http://127.0.0.1:4100/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "doctor@clinic.com", password: "dente2026" }),
  });
  const data = await res.json();
  console.log("[Auth] API login response ok:", data.ok, "user:", data.user?.fullName);

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-gpu"],
  });

  const setupContext = async (context, theme = "light") => {
    await context.addInitScript(({ clinicToken, staffToken, user, th }) => {
      localStorage.setItem("dente_clinic_token", clinicToken);
      localStorage.setItem("dente_staff_token", staffToken);
      localStorage.setItem("dente_active_session_token", staffToken);
      localStorage.setItem("dente_active_role", user.role || "owner");
      localStorage.setItem("dente_active_user_id", user.id || "doc-1");
      localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(user));
      localStorage.setItem("dente_theme_mode", th);
      localStorage.setItem("dente_theme", th);
      localStorage.setItem("theme", th);
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_tour_dismissed", "true");
      localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
      localStorage.setItem("dente_demo_banner_dismissed", "true");
      localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
      localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isDismissedPermanently: true, activeTrack: null, tracksProgress: {} }));
      localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
        version: 1,
        uiLanguage: "ru",
        selectedWorkspaceRole: user.role || "owner",
        onboardingDismissed: true,
        onboardingStep: "done",
      }));
      document.cookie = `dente_clinic_token=${encodeURIComponent(clinicToken)}; path=/; max-age=31536000`;
      document.cookie = `dente_staff_token=${encodeURIComponent(staffToken)}; path=/; max-age=31536000`;
      document.documentElement.setAttribute("data-theme", th);
      if (th === "dark") {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
      } else {
        document.documentElement.classList.add("light");
        document.documentElement.classList.remove("dark");
      }
    }, { clinicToken: data.clinicToken, staffToken: data.staffToken, user: data.user, th: theme });
  };

  const suppressOverlays = async (page) => {
    try {
      await page.evaluate(() => {
        let style = document.getElementById("suppress-all-overlays");
        if (!style) {
          style = document.createElement("style");
          style.id = "suppress-all-overlays";
          style.innerHTML = `
            .tour-spotlight-root,
            .tour-backdrop-clickable-zone,
            [data-testid="guided-tour-spotlight-overlay"],
            [data-testid="guided-tour-coach-mark-card"],
            [data-testid="demo-mode-banner"],
            [data-testid="shift-studio-modal"],
            .shift-studio-backdrop,
            .shepherd-element {
              display: none !important;
              pointer-events: none !important;
            }
          `;
          document.head.appendChild(style);
        }
        document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"], [data-testid="shift-studio-modal"], .shift-studio-backdrop').forEach((el) => el.remove());
      });
    } catch (_) {}
  };

  const waitForRealUI = async (page) => {
    console.log("[Page] Waiting for real UI to hydrate...");
    await page.waitForFunction(() => {
      const text = document.body ? document.body.innerText : "";
      return !text.includes("Загрузка системы") && !text.includes("Загрузка рабочей смены") && text.length > 200;
    }, { timeout: 30000 });
    await suppressOverlays(page);
    await page.waitForTimeout(1000);
  };

  const switchToLeads = async (page) => {
    console.log("[Leads] Switching to leads view...");
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        const ok = await page.evaluate(() => {
          if (window.__useAppStore) {
            window.__useAppStore.getState().setCurrentView("leads");
            return true;
          }
          return false;
        });
        if (ok) {
          console.log("[Leads] Switched to leads on attempt", attempt + 1);
          break;
        }
      } catch (_) {}
      await page.waitForTimeout(1000);
    }
    await page.waitForTimeout(3000);
    await suppressOverlays(page);
    await page.waitForTimeout(500);
  };

  // 1. PC CONTEXT (1440x900)
  console.log("\n--- [PC 1440x900 Context] ---");
  const pcContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  await setupContext(pcContext, "light");
  const pcPage = await pcContext.newPage();

  console.log("[PC] Navigating to http://127.0.0.1:5173/#leads ...");
  await pcPage.goto("http://127.0.0.1:5173/#leads", { waitUntil: "commit", timeout: 30000 });
  await waitForRealUI(pcPage);
  await switchToLeads(pcPage);

  // 1. PC Light
  const shot1 = path.resolve(__dirname, "..", "docs", "proofs", "leads", "01_leads_kanban_pc_light_1440x900.png");
  await pcPage.screenshot({ path: shot1 });
  console.log("[Leads] Saved 01_leads_kanban_pc_light_1440x900.png:", shot1, "Size:", fs.statSync(shot1).size);

  // 2. PC Dark
  await pcPage.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    document.documentElement.classList.remove("light");
    document.documentElement.classList.add("dark");
  });
  await pcPage.waitForTimeout(1000);
  const shot2 = path.resolve(__dirname, "..", "docs", "proofs", "leads", "02_leads_kanban_pc_dark_1440x900.png");
  await pcPage.screenshot({ path: shot2 });
  console.log("[Leads] Saved 02_leads_kanban_pc_dark_1440x900.png:", shot2, "Size:", fs.statSync(shot2).size);

  await pcContext.close();

  // 2. MOBILE CONTEXT (390x844)
  console.log("\n--- [Mobile 390x844 Context] ---");
  const mobileCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  await setupContext(mobileCtx, "light");
  const mobilePage = await mobileCtx.newPage();

  console.log("[Mobile] Navigating to http://127.0.0.1:5173/#leads ...");
  await mobilePage.goto("http://127.0.0.1:5173/#leads", { waitUntil: "commit", timeout: 30000 });
  await waitForRealUI(mobilePage);
  await switchToLeads(mobilePage);

  // 3. Mobile Light
  const shot3 = path.resolve(__dirname, "..", "docs", "proofs", "leads", "03_leads_mobile_feed_light_390x844.png");
  await mobilePage.screenshot({ path: shot3 });
  console.log("[Leads] Saved 03_leads_mobile_feed_light_390x844.png:", shot3, "Size:", fs.statSync(shot3).size);

  // 4. Mobile Dark
  await mobilePage.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    document.documentElement.classList.remove("light");
    document.documentElement.classList.add("dark");
  });
  await mobilePage.waitForTimeout(1000);
  const shot4 = path.resolve(__dirname, "..", "docs", "proofs", "leads", "04_leads_mobile_feed_dark_390x844.png");
  await mobilePage.screenshot({ path: shot4 });
  console.log("[Leads] Saved 04_leads_mobile_feed_dark_390x844.png:", shot4, "Size:", fs.statSync(shot4).size);

  await mobileCtx.close();
  await browser.close();
  console.log("\n[SUCCESS] All 4 leads screenshots captured successfully!");
}

testRealAuth().catch(console.error);
