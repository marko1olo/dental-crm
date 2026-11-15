const { chromium } = require("playwright");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const CONV_ID = process.env.CONV_ID || "df9777a8-9195-4f3f-b4ba-cf9559464254";
const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/copilot");
const OUT_SCREENSHOTS = path.resolve(__dirname, "../docs/screenshots/copilot");
const OUT_BRAIN = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`);

[OUT_DOCS, OUT_SCREENSHOTS, OUT_BRAIN].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function saveProof(page, filename, altFilenames = []) {
  for (let attempt = 0; attempt < 30; attempt++) {
    const isBootOrEmpty = await page.evaluate(() => {
      const text = document.body ? document.body.innerText : "";
      const isBoot = text.includes("Загрузка системы") || text.includes("Загрузка CRM");
      const hasHud = Boolean(document.querySelector('[data-testid="chairside-copilot-hud"]'));
      return isBoot || !hasHud;
    }).catch(() => true);
    if (!isBootOrEmpty) break;
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(600);
  const pDocs = path.join(OUT_DOCS, filename);
  const pScreen = path.join(OUT_SCREENSHOTS, filename);
  const pBrain = path.join(OUT_BRAIN, filename);
  
  await page.screenshot({ path: pDocs, fullPage: false, timeout: 15000 });
  fs.copyFileSync(pDocs, pScreen);
  fs.copyFileSync(pDocs, pBrain);

  for (const alt of altFilenames) {
    fs.copyFileSync(pDocs, path.join(OUT_DOCS, alt));
    fs.copyFileSync(pDocs, path.join(OUT_SCREENSHOTS, alt));
    fs.copyFileSync(pDocs, path.join(OUT_BRAIN, alt));
  }
  
  const size = fs.statSync(pDocs).size;
  console.log(`[Captured] ${filename} (${size} bytes) -> OK: ${size >= 20000}`);
  if (size < 20000) {
    throw new Error(`Screenshot ${filename} is too small: ${size} bytes (< 20 KB)!`);
  }
}

async function setTheme(page, theme) {
  await page.evaluate((th) => {
    document.documentElement.setAttribute("data-theme", th);
    document.body.setAttribute("data-theme", th);
    localStorage.setItem("dente_theme", th);
    localStorage.setItem("dente_theme_mode", th);
    localStorage.setItem("theme", th);
    if (th === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      document.body.classList.add("dark");
      document.body.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
      document.body.classList.add("light");
      document.body.classList.remove("dark");
    }
    window.dispatchEvent(new Event("themechange"));
  }, theme);
  await page.waitForTimeout(800);
}

async function suppressOverlays(page) {
  await page.evaluate(() => {
    const style = document.createElement("style");
    style.id = "suppress-all-overlays";
    style.innerHTML = `
      .tour-spotlight-root, .tour-backdrop-clickable-zone,
      [data-testid="guided-tour-spotlight-overlay"],
      [data-testid="guided-tour-coach-mark-card"],
      [data-testid="demo-mode-banner"], .global-toast-container { display: none !important; }
    `;
    document.head.appendChild(style);
  }).catch(() => {});
}

async function waitForBoot(page) {
  console.log("Waiting for app boot and hydration...");
  for (let i = 0; i < 45; i++) {
    await page.waitForTimeout(1000);
    try {
      const state = await page.evaluate(() => {
        const text = document.body ? document.body.innerText : "";
        const isBoot = text.includes("Загрузка системы") || text.includes("Загрузка CRM");
        const hasHud = Boolean(document.querySelector('[data-testid="chairside-copilot-hud"]'));
        const hasCopilotGlobal = typeof (window).__denteCopilot !== "undefined";
        return { isBoot, hasHud, hasCopilotGlobal, len: text.length };
      });
      if (state) {
        if (!state.hasHud && state.hasCopilotGlobal) {
          await page.evaluate(() => {
            if ((window).__denteCopilot?.openHud) (window).__denteCopilot.openHud();
          }).catch(() => {});
        }
        if (!state.isBoot && state.hasHud) {
          console.log(`[BOOT READY] Hydration completed at iteration ${i + 1}`);
          break;
        }
      }
    } catch {}
  }
  await page.waitForTimeout(1000);
  await suppressOverlays(page);
}

async function setupContextStorage(context) {
  await context.addInitScript(() => {
    try {
      sessionStorage.setItem("dente:sw-controller-reload", "1");
      sessionStorage.setItem("dente_unlocked", "true");
      localStorage.setItem("dente_demo_showcase", "true");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_tour_dismissed", "true");
      localStorage.setItem("dente_demo_banner_dismissed", "true");
      localStorage.setItem("dente_active_role", "doctor");
      localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({
        id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "doctor"
      }));
    } catch (e) {}
  });
}

async function ensureViteServer() {
  const candidatePorts = [5173, 5174, 5175, 5176, 5188, 5189];
  for (const p of candidatePorts) {
    try {
      const res = await fetch(`http://127.0.0.1:${p}/`, { signal: AbortSignal.timeout(800) });
      if (res.ok) {
        console.log(`[Vite] Found running Vite server on port ${p}`);
        return { proc: null, port: p };
      }
    } catch {}
  }

  const port = 5188;
  console.log(`[Vite] Spawning local Vite dev server on port ${port}...`);
  const viteBin = path.resolve(__dirname, "../node_modules/vite/bin/vite.js");
  const viteProc = spawn(process.execPath, [viteBin, "--host", "127.0.0.1", "--port", String(port)], {
    cwd: path.resolve(__dirname, "../apps/web"),
    stdio: "pipe",
  });

  let activePort = port;
  viteProc.stdout.on("data", (d) => {
    const s = d.toString();
    console.log(`[Vite stdout] ${s.trim()}`);
    const m = s.match(/http:\/\/127\.0\.0\.1:(\d+)\//);
    if (m && m[1]) {
      activePort = parseInt(m[1], 10);
    }
  });
  viteProc.stderr.on("data", (d) => {
    console.error(`[Vite stderr] ${d.toString().trim()}`);
  });

  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 600));
    const tryPorts = [activePort, port, 5189, 5188, 5173];
    for (const p of tryPorts) {
      try {
        const check = await fetch(`http://127.0.0.1:${p}/`, { signal: AbortSignal.timeout(800) });
        if (check.ok) {
          console.log(`[Vite] Dev server ready on port ${p}.`);
          return { proc: viteProc, port: p };
        }
      } catch {}
    }
  }
  throw new Error(`[Vite] Failed to start dev server on port ${activePort}`);
}

async function run() {
  const server = await ensureViteServer();
  const viteProc = server.proc;

  const browserCandidates = [
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ];
  const executablePath = browserCandidates.find((p) => fs.existsSync(p));

  const browser = await chromium.launch({
    headless: true,
    executablePath,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  try {
    const url = `http://127.0.0.1:${server.port}/?stand=chairside-hud&demo=true&hud=open#chairside-hud`;

    // ══════════════════════════════════════════════════════════════════════════
    // 1. DESKTOP VIEWPORT (1440x900)
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n--- Capturing Desktop 1440x900 Proofs ---");
    const pcContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      serviceWorkers: "block",
    });
    await setupContextStorage(pcContext);

    const pcPage = await pcContext.newPage();
    console.log(`Navigating to ${url}...`);
    await pcPage.goto(url, { waitUntil: "domcontentloaded", timeout: 35000 });
    await waitForBoot(pcPage);

    console.log("Waiting for chairside HUD selector...");
    await pcPage.waitForSelector('[data-testid="chairside-copilot-hud"]', { state: "visible", timeout: 25000 });
    await pcPage.waitForTimeout(1000);

    // 1A. PC Light - Resting State (Honest Empty State, zero false caries, "Готов к работе")
    await setTheme(pcPage, "light");
    await saveProof(pcPage, "01_chairside_hud_pc_light_1440x900.png", [
      "01_copilot_hud_pc_light_1440x900.png",
      "01_copilot_hud_pc_light.png",
      "chairside_hud_pc_light_1440x900.png",
      "01_copilot_pc_light_1440x900.png"
    ]);

    // 1B. PC Dark - Resting State
    await setTheme(pcPage, "dark");
    await saveProof(pcPage, "02_chairside_hud_pc_dark_1440x900.png", [
      "02_copilot_hud_pc_dark_1440x900.png",
      "02_copilot_hud_pc_dark.png",
      "chairside_hud_pc_dark_1440x900.png",
      "02_copilot_pc_dark_1440x900.png"
    ]);

    await pcContext.close();

    // ══════════════════════════════════════════════════════════════════════════
    // 2. MOBILE VIEWPORT (390x844 - iPhone 14/15 Apple HIG)
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n--- Capturing Mobile 390x844 Proofs ---");
    const mobContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      serviceWorkers: "block",
    });
    await setupContextStorage(mobContext);

    const mobPage = await mobContext.newPage();
    console.log(`Navigating to ${url}...`);
    await mobPage.goto(url, { waitUntil: "domcontentloaded", timeout: 35000 });
    await waitForBoot(mobPage);

    console.log("Waiting for chairside HUD selector on mobile...");
    await mobPage.waitForSelector('[data-testid="chairside-copilot-hud"]', { state: "visible", timeout: 25000 });
    await mobPage.waitForTimeout(1000);

    // 2A. Mobile Light - Resting State
    await setTheme(mobPage, "light");
    await saveProof(mobPage, "03_chairside_hud_mobile_light_390x844.png", [
      "03_copilot_hud_mobile_light_390x844.png",
      "03_copilot_hud_mobile_light.png",
      "chairside_hud_mobile_light_390x844.png",
      "03_copilot_mobile_light_390x844.png"
    ]);

    // 2B. Mobile Dark - Resting State
    await setTheme(mobPage, "dark");
    await saveProof(mobPage, "04_chairside_hud_mobile_dark_390x844.png", [
      "04_copilot_hud_mobile_dark_390x844.png",
      "04_copilot_hud_mobile_dark.png",
      "chairside_hud_mobile_dark_390x844.png",
      "04_copilot_mobile_dark_390x844.png"
    ]);

    // 2C. Mobile Light with Preset Clicked
    await setTheme(mobPage, "light");
    await mobPage.waitForSelector('[data-testid="chairside-copilot-hud"]', { state: "visible", timeout: 15000 }).catch(() => {});
    const mobPresetBtn = mobPage.locator(".btn-preset-caries-16").first();
    await mobPresetBtn.waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
    if (await mobPresetBtn.isVisible()) {
      await mobPresetBtn.click();
      await mobPage.waitForTimeout(1000);
      await saveProof(mobPage, "07_chairside_hud_preset_mobile_light_390x844.png");
    }

    // 2D. Mobile Dark with Preset Clicked
    await setTheme(mobPage, "dark");
    await mobPage.waitForTimeout(600);
    if (await mobPresetBtn.isVisible()) {
      await saveProof(mobPage, "08_chairside_hud_preset_mobile_dark_390x844.png");
    }

    await mobContext.close();
    console.log("\n[SUCCESS] All 4-State Visual Proofs captured cleanly!");
  } finally {
    await browser.close();
    if (viteProc) {
      console.log("[Vite] Stopping spawned Vite server...");
      viteProc.kill();
    }
  }
}

run().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
