const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const PROOFS_DIR = path.resolve(__dirname, "../docs/proofs/visit");
if (!fs.existsSync(PROOFS_DIR)) {
  fs.mkdirSync(PROOFS_DIR, { recursive: true });
}

const brainDir = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/460fcd9e-ad42-40fe-987b-a4e7d5572f97");
if (!fs.existsSync(brainDir)) {
  fs.mkdirSync(brainDir, { recursive: true });
}

async function capture() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  const targets = [
    {
      name: "01_chairside_workspace_pc_light_1440x900.png",
      legacyName: "chairside_visit_live_pc_light.png",
      width: 1440,
      height: 900,
      isMobile: false,
      theme: "light",
    },
    {
      name: "02_chairside_workspace_pc_dark_1440x900.png",
      legacyName: "chairside_visit_live_pc_dark.png",
      width: 1440,
      height: 900,
      isMobile: false,
      theme: "dark",
    },
    {
      name: "03_chairside_workspace_mobile_light_390x844.png",
      legacyName: "chairside_visit_live_mobile_light.png",
      width: 390,
      height: 844,
      isMobile: true,
      theme: "light",
    },
    {
      name: "04_chairside_workspace_mobile_dark_390x844.png",
      legacyName: "chairside_visit_live_mobile_dark.png",
      width: 390,
      height: 844,
      isMobile: true,
      theme: "dark",
    },
  ];

  for (const t of targets) {
    console.log(`\n=== Capturing ${t.name} (${t.width}x${t.height}, ${t.theme}) ===`);
    const context = await browser.newContext({
      viewport: { width: t.width, height: t.height },
      isMobile: t.isMobile,
      hasTouch: t.isMobile,
      deviceScaleFactor: t.isMobile ? 2 : 1,
      serviceWorkers: "block",
    });

    await context.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());

    await context.addInitScript(({ theme }) => {
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
      localStorage.setItem("dente_theme", theme);
      localStorage.setItem("dente_theme_mode", theme);
      sessionStorage.setItem("dente_unlocked", "true");
      localStorage.setItem(
        "dente_active_staff_user",
        JSON.stringify({
          id: "019488a0-0000-7000-8000-000000000001",
          fullName: "Д-р Соколов А. В.",
          role: "doctor",
          specialization: "Терапевт",
        })
      );
    }, { theme: t.theme });

    const page = await context.newPage();

    console.log(`Navigating to http://127.0.0.1:5173/?demo=true#visit ...`);
    await page.goto("http://127.0.0.1:5173/?demo=true#visit", {
      waitUntil: "commit",
      timeout: 45000,
    });

    console.log("Waiting for shell container to mount...");
    await page.waitForSelector(".workspace-shell, .app-shell, .app-mobile-shell, nav", {
      state: "visible",
      timeout: 45000,
    });

    // Theme injection and stamping
    await page.evaluate((theme) => {
      localStorage.setItem("dente_theme_mode", theme);
      localStorage.setItem("dente-theme", theme);
      localStorage.setItem("theme", theme);
      if (window.__useThemeStore) {
        window.__useThemeStore.getState().setThemeMode(theme);
      }
      if (window.__useAppStore) {
        window.__useAppStore.getState().setCurrentView("visit");
      }
      document.documentElement.setAttribute("data-theme", theme);
      document.body.setAttribute("data-theme", theme);
      const isDark = theme === "dark";
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.classList.toggle("light", !isDark);
      document.body.classList.toggle("dark", isDark);
      document.body.classList.toggle("light", !isDark);
      document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    }, t.theme);

    await page.waitForTimeout(1000);

    if (!t.isMobile) {
      console.log("Waiting for desktop visit-panel to settle...");
      // If intake cockpit is showing, start next patient
      const startNextBtn = page.locator("#btn-intake-start-next");
      if (await startNextBtn.isVisible()) {
        console.log("Clicking #btn-intake-start-next...");
        await startNextBtn.click();
        await page.waitForTimeout(2000);
      }

      await page.waitForSelector('[data-testid="btn-complete-visit-header"], .visit-panel, [data-testid="visit-view"]', {
        state: "visible",
        timeout: 30000,
      });
      await page.waitForSelector('[data-testid="visit-odontogram-tab"], .visit-odontogram-tab, .diary-view, .soap-editor, .visit-panel', {
        state: "visible",
        timeout: 30000,
      });
    } else {
      console.log("Waiting for mobile chairside layout...");
      await page.waitForSelector(
        '.app-mobile-shell, .mobile-chairside-container, [data-testid="mobile-chairside-visit-workspace"], .app-mobile-tab-bar, [data-testid="visit-view"]',
        { state: "visible", timeout: 35000 }
      );
    }

    await page.waitForTimeout(1000);

    // Clean up any transient toast notifications
    await page.evaluate(() => {
      document.querySelectorAll('.global-toast, .toast, .sa-toast, [data-testid="global-toast"], [role="alert"]').forEach(el => el.remove());
    });

    await page.waitForTimeout(500);

    const outPath = path.join(PROOFS_DIR, t.name);
    await page.screenshot({ path: outPath, fullPage: false });
    const stat = fs.statSync(outPath);
    console.log(`Saved ${t.name}: ${stat.size} bytes`);

    // Copy to brainDir for easy artifact embedding and reading
    fs.copyFileSync(outPath, path.join(brainDir, t.name));

    if (t.legacyName) {
      const legacyPath = path.join(PROOFS_DIR, t.legacyName);
      fs.copyFileSync(outPath, legacyPath);
      fs.copyFileSync(outPath, path.join(brainDir, t.legacyName));
    }

    if (stat.size < 40000) {
      throw new Error(`CRITICAL DEFECT: ${t.name} is under 40KB (${stat.size} bytes)!`);
    }

    await context.close();
  }

  await browser.close();
  console.log("\nAll 4 state screenshots captured successfully!");
}

capture().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
