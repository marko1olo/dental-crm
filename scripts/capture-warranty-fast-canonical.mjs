import { existsSync, mkdirSync, copyFileSync, statSync, readFileSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { chromium } from "playwright";

const PROOFS_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/warranty";
const BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/ade87a20-2d4c-462d-9256-61503b635791/screenshots";

mkdirSync(PROOFS_DIR, { recursive: true });
mkdirSync(BRAIN_DIR, { recursive: true });

async function resolveWebBase() {
  for (const port of [5173, 5174]) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(1500) });
      if (res.ok || res.status === 200) {
        return `http://127.0.0.1:${port}`;
      }
    } catch (_) {}
  }
  return "http://127.0.0.1:5173";
}

const browserCandidates = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];
const executablePath = browserCandidates.find((p) => existsSync(p));
if (!executablePath) {
  throw new Error("No browser executable found");
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function suppressOverlays(page) {
  try {
    await page.evaluate(() => {
      const style = document.createElement("style");
      style.id = "suppress-all-overlays";
      style.innerHTML = `
        .tour-spotlight-root,
        .tour-backdrop-clickable-zone,
        [data-testid="guided-tour-spotlight-overlay"],
        [data-testid="guided-tour-coach-mark-card"],
        [data-testid="demo-mode-banner"],
        .global-toast-container,
        vite-error-overlay {
          display: none !important;
          pointer-events: none !important;
        }
      `;
      document.head.appendChild(style);
      document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay'], .toast, .connection-toast").forEach((el) => el.remove());
    });
  } catch (_) {}
}

async function run() {
  const webBase = await resolveWebBase();
  console.log(`🌐 Using webBase: ${webBase}`);

  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });

  const targets = [
    {
      file: "01_warranty_passport_pc_light_1440x900.png",
      width: 1440,
      height: 900,
      scale: 1,
      isMobile: false,
      theme: "light",
      url: `${webBase}/?demo=true&theme=light#warranty=true`,
      tab: "editor",
      desc: "PC Light 1440x900 - Warranty Passport Studio Modal Editor",
    },
    {
      file: "02_warranty_passport_pc_dark_1440x900.png",
      width: 1440,
      height: 900,
      scale: 1,
      isMobile: false,
      theme: "dark",
      url: `${webBase}/?demo=true&theme=dark#warranty=true`,
      tab: "remediation",
      desc: "PC Dark 1440x900 - Warranty Remediation 0 ₽",
    },
    {
      file: "05_warranty_mobile_light_390x844.png",
      width: 390,
      height: 844,
      scale: 2,
      isMobile: true,
      theme: "light",
      url: `${webBase}/?demo=true&theme=light#warranty=true`,
      tab: "editor",
      desc: "Mobile Light 390x844 - Apple HIG Bottom Sheet & Touch Targets",
    },
    {
      file: "06_warranty_mobile_dark_390x844.png",
      width: 390,
      height: 844,
      scale: 2,
      isMobile: true,
      theme: "dark",
      url: `${webBase}/?demo=true&theme=dark#warranty=true`,
      tab: "editor",
      desc: "Mobile Dark 390x844 - Apple HIG Bottom Sheet Dark Mode",
    },
  ];

  for (const item of targets) {
    console.log(`\n📸 Capturing ${item.file} (${item.width}x${item.height}, theme=${item.theme})...`);

    const context = await browser.newContext({
      viewport: { width: item.width, height: item.height },
      deviceScaleFactor: item.scale,
      isMobile: item.isMobile,
      hasTouch: item.isMobile,
      colorScheme: item.theme,
    });

    const page = await context.newPage();

    await page.addInitScript(({ t }) => {
      localStorage.setItem("dente_clinic_token", "demo-token");
      localStorage.setItem("dente_staff_token", "demo-staff-token");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_active_user_id", "doc-1");
      localStorage.setItem("dente_selected_patient_id", "01a00000-0000-0000-0000-000000000001");
      localStorage.setItem("dente_active_patient_id", "01a00000-0000-0000-0000-000000000001");
      localStorage.setItem("dente_demo_showcase", "true");
      localStorage.setItem("dente_demo_showcase_mode_v1", "true");
      localStorage.setItem("dente_theme", t);
      localStorage.setItem("dente_theme_mode", t);
      localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true, theme: t }));
      localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_tour_dismissed", "true");
      localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
      localStorage.setItem("dente_demo_banner_dismissed", "true");
    }, { t: item.theme });

    try {
      await page.goto(item.url, { waitUntil: "domcontentloaded", timeout: 20000 });
    } catch (_) {}

    await sleep(1500);

    // Trigger modal open
    await page.evaluate(() => {
      window.location.hash = "#warranty=true";
      window.dispatchEvent(new CustomEvent("dente:open-warranty-passport"));
      window.dispatchEvent(new CustomEvent("dente-open-warranty-passport"));
    });

    await sleep(1000);

    // Force theme
    await page.evaluate(({ t }) => {
      document.documentElement.setAttribute("data-theme", t);
      document.body.setAttribute("data-theme", t);
      if (t === "dark") {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
        document.body.className = "dark";
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
        document.body.className = "light";
      }
    }, { t: item.theme });

    if (item.tab === "remediation") {
      await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll(".warranty-tab-btn"));
        const remTab = tabs.find((b) => b.textContent && b.textContent.includes("Гарантийная переделка"));
        if (remTab) remTab.click();
      });
      await sleep(600);
    }

    await suppressOverlays(page);
    await sleep(500);

    const outPath = path.join(PROOFS_DIR, item.file);
    await page.screenshot({ path: outPath, fullPage: false });

    const brainPath = path.join(BRAIN_DIR, item.file);
    copyFileSync(outPath, brainPath);

    const stats = statSync(outPath);
    const hash = crypto.createHash("md5").update(readFileSync(outPath)).digest("hex");
    const sizeKb = (stats.size / 1024).toFixed(1);

    console.log(`✅ Saved: ${outPath} (${sizeKb} KB, MD5: ${hash}) -> ${item.desc}`);
    if (stats.size < 20480) {
      throw new Error(`Screenshot ${item.file} too small (${stats.size} < 20KB)`);
    }

    await context.close();
  }

  console.log("\n🎉 ALL 4 CANONICAL WARRANTY PROOFS CAPTURED SUCCESSFULLY!");
  await browser.close();
}

run().catch((err) => {
  console.error("❌ Fatal Error:", err);
  process.exit(1);
});