/**
 * scripts/capture_perio_4proofs.cjs
 *
 * Captures 4 canonical visual proofs for the Periodontology domain in DENTE Dental CRM:
 * 1. 01_perio_studio_pc_light_1440x900.png (1440x900)
 * 2. 02_perio_studio_pc_dark_1440x900.png (1440x900)
 * 3. 03_perio_studio_mobile_light_390x844.png (390x844)
 * 4. 04_perio_studio_mobile_dark_390x844.png (390x844)
 */

const { chromium } = require("playwright");
const http = require("node:http");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const outDirs = [
  path.resolve(__dirname, "../docs/proofs/perio"),
  path.resolve("C:/Users/Admin/.gemini/antigravity/brain/bf65e0e2-dc41-4fd6-9d45-7f2467de8793/perio"),
  path.resolve("C:/Users/Admin/.gemini/antigravity/brain/db9b08bb-f60c-443e-9476-9a6478657cb1/perio"),
];

for (const dir of outDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
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
        req.setTimeout(5000, () => {
          req.destroy();
          res(false);
        });
      });
      if (ok) return true;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`);
}

async function applyTheme(page, theme) {
  await page.evaluate((th) => {
    try {
      localStorage.setItem("dente_theme_mode", th);
      localStorage.setItem("dente_theme", th);
      if (window.__useThemeStore) {
        window.__useThemeStore.getState().setThemeMode(th);
      }
      document.documentElement.setAttribute("data-theme", th);
      document.body.setAttribute("data-theme", th);
      const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(th);
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.classList.toggle("light", !isDark);
      document.body.classList.toggle("dark", isDark);
      document.body.classList.toggle("light", !isDark);
      document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    } catch (e) {}
  }, theme);
  await page.waitForTimeout(600);
}

async function takeProof(page, baseFileNames, description) {
  const primaryName = baseFileNames[0];
  const primaryPath = path.join(outDirs[0], primaryName);
  await page.locator('[data-testid="interactive-periodontogram"]').first().waitFor({ state: "visible", timeout: 20000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: primaryPath, fullPage: false, animations: "disabled" });

  // Copy to all aliases across all output dirs
  for (const dir of outDirs) {
    for (const name of baseFileNames) {
      const dest = path.join(dir, name);
      if (dest !== primaryPath) {
        fs.copyFileSync(primaryPath, dest);
      }
    }
  }

  const stats = fs.statSync(primaryPath);
  const hash = crypto.createHash("md5").update(fs.readFileSync(primaryPath)).digest("hex");
  const sizeKb = (stats.size / 1024).toFixed(1);
  const pass = stats.size >= 20480; // per task prompt: all files >= 20 KB

  console.log(
    `[PROOF] ${primaryName} (${description}): ${stats.size} bytes (${sizeKb} KB) | MD5: ${hash} | >=20KB: ${pass ? "PASS" : "FAIL"}`
  );
  if (!pass) {
    throw new Error(`Screenshot ${primaryName} is too small (${stats.size} bytes < 20KB)`);
  }
  return { fileName: primaryName, sizeBytes: stats.size, sizeKb, md5: hash };
}

async function openPerioChart(page, serverPort, isMobile = false) {
  const url = `http://127.0.0.1:${serverPort}/?demo=true&perio=1#perio`;
  console.log(`Navigating to ${url} (isMobile: ${isMobile}) ...`);
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  } catch (err) {
    console.warn("goto warning:", err.message);
  }
  await page.waitForTimeout(2000);

  // Remove tour spotlights, banners & overlays
  await page.evaluate(() => {
    document
      .querySelectorAll(
        '.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"], .mobile-dev-switcher'
      )
      .forEach((el) => el.remove());
  });

  // Ensure perio is open
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent("dente:open-perio", {
      detail: { patientId: "demo_perio_patient", patientName: "Смирнова Анна Сергеевна (Пародонтология)" }
    }));
  });

  console.log("Waiting for [data-testid='interactive-periodontogram']...");
  await page.waitForSelector('[data-testid="interactive-periodontogram"]', { state: "visible", timeout: 30000 });
  console.log("interactive-periodontogram is visible!");

  if (isMobile) {
    console.log("Waiting for [data-testid='perio-save-mobile-btn']...");
    await page.waitForSelector('[data-testid="perio-save-mobile-btn"]', { state: "attached", timeout: 15000 }).catch(() => {});
  } else {
    console.log("Waiting for [data-testid='perio-save-draft-btn']...");
    await page.waitForSelector('[data-testid="perio-save-draft-btn"]', { state: "visible", timeout: 15000 }).catch(() => {});
  }

  // Remove any leftover toasts before taking screenshot
  await page.evaluate(() => {
    document
      .querySelectorAll('.global-toast-container, [role="alert"], .tour-spotlight-root')
      .forEach((el) => el.remove());
  });

  await page.waitForTimeout(800);
}

async function run() {
  const serverPort = 5173;
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
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  const proofs = [];

  const initAuthStorage = async (ctx, theme = "light") => {
    await ctx.addInitScript((th) => {
      try {
        localStorage.setItem("dente_demo_showcase", "true");
        localStorage.setItem("dente_offline_mode", "true");
        localStorage.setItem("dente_bypass_auth", "true");
        localStorage.setItem("dente_active_mode", "clinic");
        localStorage.setItem("dente_last_view", "schedule");
        localStorage.setItem("dente_clinic_token", "demo-showcase-token-therapist");
        localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-therapist");
        sessionStorage.setItem("dente_unlocked", "true");
        sessionStorage.setItem("dente:sw-controller-reload", "1");
        localStorage.setItem("dente_tour_completed", "true");
        localStorage.setItem("dente_tour_dismissed", "true");
        localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
        localStorage.setItem("dente_onboarding_completed", "true");
        localStorage.setItem("dente_onboarding_strip_dismissed", "true");
        localStorage.setItem("dente_demo_banner_dismissed", "true");
        localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
        localStorage.setItem("dente_theme_mode", th);
        localStorage.setItem("dente_theme", th);
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
        document.body.setAttribute("data-theme", th);
        const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(th);
        document.documentElement.classList.toggle("dark", isDark);
        document.documentElement.classList.toggle("light", !isDark);
        document.body.classList.toggle("dark", isDark);
        document.body.classList.toggle("light", !isDark);
        document.documentElement.style.colorScheme = isDark ? "dark" : "light";
      } catch (e) {}
    }, theme);
  };

  try {
    // -----------------------------------------------------------------------
    // 1 & 2. DESKTOP (1440x900) LIGHT & DARK PROOFS
    // -----------------------------------------------------------------------
    console.log("\n>>> DESKTOP (1440x900) PROOFS <<<");
    const pcContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    await initAuthStorage(pcContext, "light");
    const pcPage = await pcContext.newPage();
    await openPerioChart(pcPage, serverPort, false);

    // PC Light
    console.log("Capturing PC Desktop Light...");
    await applyTheme(pcPage, "light");
    proofs.push(
      await takeProof(
        pcPage,
        [
          "01_perio_studio_pc_light_1440x900.png",
          "01_perio_pc_light_1440x900.png",
          "perio_chart_pc_light.png",
        ],
        "PC Desktop 1440x900 Light"
      )
    );

    // PC Dark
    console.log("Capturing PC Desktop Dark...");
    await applyTheme(pcPage, "dark");
    proofs.push(
      await takeProof(
        pcPage,
        [
          "02_perio_studio_pc_dark_1440x900.png",
          "02_perio_pc_dark_1440x900.png",
          "perio_chart_pc_dark.png",
        ],
        "PC Desktop 1440x900 Dark"
      )
    );
    await pcContext.close();

    // -----------------------------------------------------------------------
    // 3 & 4. MOBILE (390x844) LIGHT & DARK PROOFS
    // -----------------------------------------------------------------------
    console.log("\n>>> MOBILE (390x844) PROOFS <<<");
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
    });
    await initAuthStorage(mobileContext, "light");
    const mobilePage = await mobileContext.newPage();
    await openPerioChart(mobilePage, serverPort, true);

    // Mobile Light
    console.log("Capturing Mobile Light...");
    await applyTheme(mobilePage, "light");
    proofs.push(
      await takeProof(
        mobilePage,
        [
          "03_perio_studio_mobile_light_390x844.png",
          "03_perio_mobile_light_390x844.png",
          "perio_chart_mobile_light.png",
        ],
        "Mobile 390x844 Light"
      )
    );

    // Mobile Dark
    console.log("Capturing Mobile Dark...");
    await applyTheme(mobilePage, "dark");
    proofs.push(
      await takeProof(
        mobilePage,
        [
          "04_perio_studio_mobile_dark_390x844.png",
          "04_perio_mobile_dark_390x844.png",
          "perio_chart_mobile_dark.png",
        ],
        "Mobile 390x844 Dark"
      )
    );
    await mobileContext.close();

    console.log("\n=======================================================");
    console.log(">>> ALL 4 PERIODONTOLOGY CANONICAL PROOFS CAPTURED <<<");
    console.log("=======================================================");
    for (const p of proofs) {
      console.log(`- ${p.fileName}: ${p.sizeKb} KB (MD5: ${p.md5})`);
    }
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("FATAL ERROR capturing perio proofs:", err);
  process.exit(1);
});
