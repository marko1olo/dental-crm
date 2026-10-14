/**
 * scripts/capture_perio_4proofs.cjs
 *
 * Captures 4 canonical visual proofs for the Periodontology domain in DENTE Dental CRM:
 * 1. docs/proofs/perio/perio_chart_pc_light.png (1440x900)
 * 2. docs/proofs/perio/perio_chart_pc_dark.png (1440x900)
 * 3. docs/proofs/perio/perio_chart_mobile_light.png (390x844)
 * 4. docs/proofs/perio/perio_chart_mobile_dark.png (390x844)
 */

const { chromium } = require("playwright");
const { spawn } = require("node:child_process");
const http = require("node:http");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const outDirs = [
  path.resolve(__dirname, "../docs/proofs/perio"),
  path.resolve("C:/Users/Admin/.gemini/antigravity/brain/db9b08bb-f60c-443e-9476-9a6478657cb1/perio"),
];

for (const dir of outDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function checkPort(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const req = http.get(`http://${host}:${port}/`, () => resolve(true));
    req.on("error", () => resolve(false));
    req.setTimeout(1200, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const ok = await new Promise((res) => {
        const req = http.get(url, (response) => {
          res(response.statusCode >= 200 && response.statusCode < 500);
        });
        req.on("error", () => res(false));
        req.setTimeout(1200, () => {
          req.destroy();
          res(false);
        });
      });
      if (ok) return true;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 600));
  }
  throw new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`);
}

async function applyTheme(page, theme) {
  await page.evaluate((th) => {
    try {
      localStorage.setItem("dente_theme_mode", th);
      if (window.__useThemeStore) {
        window.__useThemeStore.getState().setThemeMode(th);
      }
      document.documentElement.setAttribute("data-theme", th);
      const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(th);
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.classList.toggle("light", !isDark);
      document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    } catch (e) {}
  }, theme);
  await page.waitForTimeout(600);
}

async function takeProof(page, fileName, description) {
  const primaryPath = path.join(outDirs[0], fileName);
  await page.locator('[data-testid="interactive-periodontogram"]').first().waitFor({ state: "visible", timeout: 20000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: primaryPath, fullPage: false });

  for (let i = 1; i < outDirs.length; i++) {
    const dest = path.join(outDirs[i], fileName);
    fs.copyFileSync(primaryPath, dest);
  }

  const stats = fs.statSync(primaryPath);
  const hash = crypto.createHash("md5").update(fs.readFileSync(primaryPath)).digest("hex");
  const sizeKb = (stats.size / 1024).toFixed(1);
  const pass = stats.size >= 20480; // per task prompt: all files > 20 KB

  console.log(
    `[PROOF] ${fileName} (${description}): ${stats.size} bytes (${sizeKb} KB) | MD5: ${hash} | >=20KB: ${pass ? "PASS" : "FAIL"}`
  );
  if (!pass) {
    throw new Error(`Screenshot ${fileName} is too small (${stats.size} bytes < 20KB)`);
  }
  return { fileName, sizeBytes: stats.size, sizeKb, md5: hash };
}

let viteProcess = null;

async function openPerioChart(page, serverPort, isMobile = false) {
  const url = `http://127.0.0.1:${serverPort}/?perio=1`;
  console.log(`Navigating directly to ${url} (isMobile: ${isMobile}) ...`);
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 25000 });
  } catch {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });
  }
  await page.waitForTimeout(2000);

  // 1. Remove tour spotlights, banners & overlays
  await page.evaluate(() => {
    document
      .querySelectorAll(
        '.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"], .mobile-dev-switcher'
      )
      .forEach((el) => el.remove());
  });

  // 2. Explicitly wait for interactive periodontogram root
  console.log("Waiting for [data-testid='interactive-periodontogram']...");
  await page.locator('[data-testid="interactive-periodontogram"]').waitFor({ state: "visible", timeout: 30000 });
  console.log("interactive-periodontogram is visible!");

  // 3. Ensure appropriate mode and wait for target component
  if (isMobile) {
    const touchBtn = page.locator('[data-testid="perio-mode-touch-btn"]').first();
    if (await touchBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log("Activating mobile touch mode...");
      await touchBtn.click();
    }
    console.log("Waiting for [data-testid='perio-mobile-cockpit']...");
    await page.locator('[data-testid="perio-mobile-cockpit"]').first().waitFor({ state: "visible", timeout: 15000 });
    console.log("Waiting for [data-testid='mobile-perio-keypad-dial']...");
    await page.locator('[data-testid="mobile-perio-keypad-dial"]').first().waitFor({ state: "visible", timeout: 15000 });
    console.log("perio-mobile-cockpit and keypad dial are visible!");
  } else {
    const desktopBtn = page.locator('[data-testid="perio-mode-desktop-btn"]').first();
    if (await desktopBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log("Activating desktop full-arch mode...");
      await desktopBtn.click();
    }
    console.log("Waiting for [data-testid='perio-preset-norm-card']...");
    await page.locator('[data-testid="perio-preset-norm-card"]').first().waitFor({ state: "visible", timeout: 15000 });
    console.log("Desktop banner is visible!");
  }

  // Remove any leftover toasts before taking screenshot
  await page.evaluate(() => {
    document
      .querySelectorAll('.global-toast-container, [role="alert"], .tour-spotlight-root')
      .forEach((el) => el.remove());
  });

  await page.waitForTimeout(1000);
}

async function run() {
  let serverPort = 5173;
  console.log("Waiting for Vite server on port 5173...");
  await waitForServer(`http://127.0.0.1:${serverPort}/`, 45000);
  console.log(`>>> Vite server online on port ${serverPort}.`);

  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const executablePath = fs.existsSync(chromePath)
    ? chromePath
    : fs.existsSync(edgePath)
      ? edgePath
      : undefined;

  const browser = await chromium.launch({
    headless: true,
    executablePath,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  const proofs = [];

  const initAuthStorage = async (ctx, theme = "light") => {
    await ctx.addInitScript((th) => {
      try {
        localStorage.setItem("dente_demo_showcase", "true");
        localStorage.setItem("dente_clinic_token", "demo-showcase-token-therapist");
        localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-therapist");
        localStorage.setItem("dente_tour_completed", "true");
        localStorage.setItem("dente_onboarding_strip_dismissed", "true");
        localStorage.setItem("dente_theme_mode", th);
        localStorage.setItem(
          "dente_quest_progress_v2",
          JSON.stringify({ isDismissedPermanently: true, activeTrack: null, tracksProgress: {} })
        );
        localStorage.setItem(
          "dente_active_staff_user",
          JSON.stringify({
            id: "019488a0-0000-7000-8000-000000000001",
            fullName: "Д-р Соколов А. В.",
            role: "doctor",
            email: "therapist@dente-demo.ru",
            organizationId: "01948800-0000-7000-8000-000000000001",
            specialization: "Терапевт",
          })
        );
        document.documentElement.setAttribute("data-theme", th);
        const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(th);
        document.documentElement.classList.toggle("dark", isDark);
        document.documentElement.classList.toggle("light", !isDark);
        document.documentElement.style.colorScheme = isDark ? "dark" : "light";
      } catch (e) {}
    }, theme);
  };

  try {
    // -----------------------------------------------------------------------
    // 1. DESKTOP LIGHT (1440x900)
    // -----------------------------------------------------------------------
    console.log("\n>>> DESKTOP (1440x900) LIGHT PROOF <<<");
    const pcLightContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    await initAuthStorage(pcLightContext, "light");
    const pcLightPage = await pcLightContext.newPage();
    await openPerioChart(pcLightPage, serverPort, false);
    await applyTheme(pcLightPage, "light");
    proofs.push(
      await takeProof(pcLightPage, "perio_chart_pc_light.png", "PC Desktop 1440x900 Light")
    );
    await pcLightContext.close();

    // -----------------------------------------------------------------------
    // 2. DESKTOP DARK (1440x900)
    // -----------------------------------------------------------------------
    console.log("\n>>> DESKTOP (1440x900) DARK PROOF <<<");
    const pcDarkContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    await initAuthStorage(pcDarkContext, "dark");
    const pcDarkPage = await pcDarkContext.newPage();
    await openPerioChart(pcDarkPage, serverPort, false);
    await applyTheme(pcDarkPage, "dark");
    proofs.push(
      await takeProof(pcDarkPage, "perio_chart_pc_dark.png", "PC Desktop 1440x900 Dark")
    );
    await pcDarkContext.close();

    // -----------------------------------------------------------------------
    // 3. MOBILE LIGHT (390x844)
    // -----------------------------------------------------------------------
    console.log("\n>>> MOBILE (390x844) LIGHT PROOF <<<");
    const mobileLightContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });
    await initAuthStorage(mobileLightContext, "light");
    const mobileLightPage = await mobileLightContext.newPage();
    await openPerioChart(mobileLightPage, serverPort, true);
    await applyTheme(mobileLightPage, "light");
    proofs.push(
      await takeProof(mobileLightPage, "perio_chart_mobile_light.png", "Mobile 390x844 Light")
    );
    await mobileLightContext.close();

    // -----------------------------------------------------------------------
    // 4. MOBILE DARK (390x844)
    // -----------------------------------------------------------------------
    console.log("\n>>> MOBILE (390x844) DARK PROOF <<<");
    const mobileDarkContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });
    await initAuthStorage(mobileDarkContext, "dark");
    const mobileDarkPage = await mobileDarkContext.newPage();
    await openPerioChart(mobileDarkPage, serverPort, true);
    await applyTheme(mobileDarkPage, "dark");
    await mobileDarkPage.evaluate(() => {
      const dial = document.querySelector('[data-testid="mobile-perio-keypad-dial"]');
      if (dial) {
        dial.scrollIntoView({ behavior: "instant", block: "end" });
      }
    });
    await mobileDarkPage.waitForTimeout(600);
    proofs.push(
      await takeProof(mobileDarkPage, "perio_chart_mobile_dark.png", "Mobile 390x844 Dark (Florida Probe Keypad Dial)")
    );
    await mobileDarkContext.close();

    console.log("\n=======================================================");
    console.log(">>> ALL 4 PERIODONTOLOGY CANONICAL PROOFS CAPTURED <<<");
    console.log("=======================================================");
    for (const p of proofs) {
      console.log(`- ${p.fileName}: ${p.sizeKb} KB (MD5: ${p.md5})`);
    }
  } finally {
    await browser.close();
    if (viteProcess) {
      console.log("Stopping spawned Vite process...");
      viteProcess.kill();
    }
  }
}

run().catch((err) => {
  console.error("FATAL ERROR capturing perio proofs:", err);
  process.exit(1);
});
