const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const PROOFS_DIR = path.resolve(__dirname, "../docs/proofs/visit");
if (!fs.existsSync(PROOFS_DIR)) {
  fs.mkdirSync(PROOFS_DIR, { recursive: true });
}

const brainDir = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/175c98af-837e-4bd4-8dd3-032b29f868fd");
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
      name: "chairside_visit_live_pc_light.png",
      legacyName: "visit_chairside_pc_light_1440x900.png",
      width: 1440,
      height: 900,
      isMobile: false,
      theme: "light",
    },
    {
      name: "chairside_visit_live_pc_dark.png",
      legacyName: "visit_chairside_pc_dark_1440x900.png",
      width: 1440,
      height: 900,
      isMobile: false,
      theme: "dark",
    },
    {
      name: "chairside_visit_live_mobile_light.png",
      legacyName: "visit_chairside_mobile_light_390x844.png",
      width: 390,
      height: 844,
      isMobile: true,
      theme: "light",
    },
    {
      name: "chairside_visit_live_mobile_dark.png",
      legacyName: "visit_chairside_mobile_dark_390x844.png",
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
      deviceScaleFactor: 1,
      serviceWorkers: "block",
    });

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
      timeout: 35000,
    });

    console.log("Waiting for shell container to mount...");
    await page.waitForSelector(".workspace-shell, .app-shell, .app-mobile-shell, nav", {
      state: "visible",
      timeout: 35000,
    });

    // Theme injection and stamping
    await page.evaluate((theme) => {
      localStorage.setItem("dente_theme_mode", theme);
      localStorage.setItem("dente-theme", theme);
      localStorage.setItem("theme", theme);
      if (window.__useThemeStore) {
        window.__useThemeStore.getState().setThemeMode(theme);
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

    if (!t.isMobile) {
      console.log("Waiting for desktop visit-panel to settle...");
      await page.waitForFunction(() => {
        const p = document.querySelector(".visit-panel");
        return p && !p.getAttribute("aria-busy") && !p.querySelector(".boot-state");
      }, { timeout: 45000 });

      // If intake cockpit is showing, start next patient
      const startNextBtn = page.locator("#btn-intake-start-next");
      if (await startNextBtn.isVisible()) {
        console.log("Clicking #btn-intake-start-next...");
        await startNextBtn.click();
        await page.waitForTimeout(2000);
      }

      await page.waitForSelector('[data-testid="btn-complete-visit-header"]', {
        state: "visible",
        timeout: 30000,
      });
      await page.waitForSelector('[data-testid="visit-odontogram-tab"], .visit-odontogram-tab, .diary-view, .soap-editor', {
        state: "visible",
        timeout: 30000,
      });
    } else {
      console.log("Waiting for mobile chairside layout...");
      await page.waitForSelector(
        '.app-mobile-shell, .mobile-chairside-container, [data-testid="mobile-chairside-layout"], .app-mobile-tab-bar',
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

    const shortName = t.legacyName.replace("_1440x900", "").replace("_390x844", "");
    const canonicalPath = path.join(PROOFS_DIR, shortName);
    fs.copyFileSync(outPath, canonicalPath);

    fs.copyFileSync(outPath, path.join(brainDir, shortName));
    fs.copyFileSync(outPath, path.join(brainDir, t.name));

    if (t.legacyName) {
      const legacyPath = path.join(PROOFS_DIR, t.legacyName);
      fs.copyFileSync(outPath, legacyPath);
      fs.copyFileSync(outPath, path.join(brainDir, t.legacyName));
    }

    if (stat.size < 30000) {
      throw new Error(`CRITICAL DEFECT: ${t.name} is under 30KB (${stat.size} bytes)!`);
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
