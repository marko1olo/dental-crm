import { existsSync, mkdirSync, copyFileSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const API_BASE = "http://127.0.0.1:4100";
const PROOFS_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/warranty";
const BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/11ebac5c-c63a-4be6-b517-dbbedaa87370";

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
  throw new Error("No browser executable found in candidates");
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
  const patientId = "01a00000-0000-0000-0000-000000000001";

  console.log("Launching browser for 4-State Proofs:", executablePath);
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });

  const states = [
    {
      file: "01_warranty_passport_pc_light_1440x900.png",
      width: 1440,
      height: 900,
      scale: 1,
      isMobile: false,
      theme: "light",
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
      tab: "remediation",
      desc: "PC Dark 1440x900 - Warranty Remediation 0 Rub (Doctor Autonomy Mandate 8e)",
    },
    {
      file: "03_warranty_passport_mobile_light_390x844.png",
      width: 390,
      height: 844,
      scale: 2,
      isMobile: true,
      theme: "light",
      tab: "editor",
      desc: "Mobile Light 390x844 - Apple HIG Touch >=44px & Bottom Sheet",
    },
    {
      file: "04_warranty_passport_mobile_dark_390x844.png",
      width: 390,
      height: 844,
      scale: 2,
      isMobile: true,
      theme: "dark",
      tab: "editor",
      desc: "Mobile Dark 390x844 - Apple HIG Dark Mode & 0px Overflow",
    },
  ];

  for (const item of states) {
    console.log(`\n📸 Capturing ${item.file} (${item.width}x${item.height}, theme=${item.theme})...`);

    const context = await browser.newContext({
      viewport: { width: item.width, height: item.height },
      deviceScaleFactor: item.scale,
      isMobile: item.isMobile,
      hasTouch: item.isMobile,
      colorScheme: item.theme,
    });

    const page = await context.newPage();

    await page.addInitScript(
      ({ t, pid }) => {
        localStorage.setItem("dente_selected_patient_id", pid);
        localStorage.setItem("dente_active_patient_id", pid);
        localStorage.setItem("dente_demo_showcase", "true");
        localStorage.setItem("dente_demo_showcase_mode_v1", "true");
        localStorage.setItem("dente_theme", t);
        localStorage.setItem("dente_theme_mode", t);
        localStorage.setItem(
          "dente_ui_preferences_v1",
          JSON.stringify({ onboardingDismissed: true, theme: t }),
        );
        localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
        localStorage.setItem("dente_tour_completed", "true");
        localStorage.setItem("dente_tour_dismissed", "true");
        localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
        localStorage.setItem("dente_demo_banner_dismissed", "true");
      },
      { t: item.theme, pid: patientId },
    );

    const targetUrl = `${webBase}/?demo=true&warranty=true&theme=${item.theme}#warranty-passport`;
    console.log(`Navigating to ${targetUrl}...`);
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 35000 });

    console.log("Waiting for .warranty-modal-window...");
    await page.waitForSelector(".warranty-modal-window", { timeout: 20000 });
    await sleep(800);

    await suppressOverlays(page);

    await page.evaluate(({ t }) => {
      document.documentElement.setAttribute("data-theme", t);
      document.body.setAttribute("data-theme", t);
      if (t === "dark") {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
        document.body.className = "dark";
        document.documentElement.style.colorScheme = "dark";
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
        document.body.className = "light";
        document.documentElement.style.colorScheme = "light";
      }
    }, { t: item.theme });

    if (item.tab === "remediation") {
      console.log("Switching to remediation tab...");
      await page.waitForSelector(".warranty-tab-remediation", { timeout: 5000 });
      await page.click(".warranty-tab-remediation");
      await page.waitForSelector(".warranty-remediation-container", { timeout: 5000 });
      await sleep(800);
    }

    await sleep(600);

    const outPath = path.join(PROOFS_DIR, item.file);
    await page.screenshot({ path: outPath, fullPage: false });

    const brainPath = path.join(BRAIN_DIR, item.file);
    copyFileSync(outPath, brainPath);

    const stats = statSync(outPath);
    const sizeKb = (stats.size / 1024).toFixed(1);
    console.log(`✅ Saved: ${outPath} (${sizeKb} KB) -> ${item.desc}`);

    if (stats.size < 30000) {
      throw new Error(`Screenshot ${item.file} too small (${sizeKb} KB < 30KB)`);
    }

    await context.close();
  }

  console.log("\n🎉 ALL 4 CANONICAL WARRANTY PROOFS CAPTURED SUCCESSFULLY!");
  await browser.close();
}

run().catch((err) => {
  console.error("❌ Fatal Error in capture script:", err);
  process.exit(1);
});
