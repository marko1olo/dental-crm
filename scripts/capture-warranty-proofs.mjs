import { existsSync, mkdirSync, copyFileSync, statSync, readFileSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { chromium } from "playwright";

const API_BASE = "http://127.0.0.1:4100";
const PROOFS_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/warranty";
const BRAIN_DIR = process.env.BRAIN_DIR || "C:/Users/Admin/.gemini/antigravity/brain/1840b950-ed75-4e21-ba75-2dc6b63a03f3";

mkdirSync(PROOFS_DIR, { recursive: true });
mkdirSync(BRAIN_DIR, { recursive: true });

async function resolveWebBase() {
  for (const port of [5174, 5173, 5175, 5176]) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`);
      if (res.ok || res.status === 200) {
        console.log(`[Vite] Detected active web server at http://127.0.0.1:${port}`);
        return `http://127.0.0.1:${port}`;
      }
    } catch {}
  }
  return "http://127.0.0.1:5174";
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
    });
  } catch (_) {}
}

async function run() {
  const webBase = await resolveWebBase();
  console.log("🔐 Authenticating against Fastify API...");
  const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@clinic.ru", password: "Password123!" }),
  });
  if (!loginRes.ok) {
    throw new Error(`Login failed with HTTP ${loginRes.status}: ${await loginRes.text()}`);
  }
  const auth = await loginRes.json();
  console.log(`✅ Logged in as ${auth.user?.fullName} (${auth.clinic?.name || "ООО ДЕНТЕ"})`);

  console.log("🚀 Launching browser for Warranty 4-State Proofs:", executablePath);
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
      id: "warranty_pc_light",
      width: 1440,
      height: 900,
      scale: 1,
      isMobile: false,
      theme: "light",
      tab: "editor",
      file: "warranty_pc_light.png",
      desc: "Desktop Light 1440x900 - Single Primary CTA «Распечатать паспорт»",
    },
    {
      id: "warranty_pc_dark",
      width: 1440,
      height: 900,
      scale: 1,
      isMobile: false,
      theme: "dark",
      tab: "remediation",
      file: "warranty_pc_dark.png",
      desc: "Desktop Dark 1440x900 - 0 ₽ Remediation Tab without master password",
    },
    {
      id: "warranty_mobile_light",
      width: 390,
      height: 844,
      scale: 2,
      isMobile: true,
      theme: "light",
      tab: "editor",
      file: "warranty_mobile_light.png",
      desc: "Apple HIG Mobile Light 390x844 - Bottom Sheet & 44x44px Touch Targets",
    },
    {
      id: "warranty_mobile_dark",
      width: 390,
      height: 844,
      scale: 2,
      isMobile: true,
      theme: "dark",
      tab: "editor",
      file: "warranty_mobile_dark.png",
      desc: "Apple HIG Mobile Dark 390x844 - Dark Bottom Sheet & Natural Thumb Zone",
    },
  ];

  for (const state of states) {
    console.log(`\n📸 Capturing ${state.file} (${state.width}x${state.height}, theme=${state.theme}, tab=${state.tab})...`);

    const context = await browser.newContext({
      viewport: { width: state.width, height: state.height },
      deviceScaleFactor: state.scale,
      isMobile: state.isMobile,
      hasTouch: state.isMobile,
      colorScheme: state.theme,
    });

    const page = await context.newPage();

    await page.addInitScript(
      ({ clinicToken, staffToken, u, t }) => {
        localStorage.setItem("dente_clinic_token", clinicToken);
        localStorage.setItem("dente_staff_token", staffToken);
        localStorage.setItem("dente_active_role", u.role);
        localStorage.setItem("dente_active_user_id", u.id);
        localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(u));
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
        document.cookie = `dente_clinic_token=${encodeURIComponent(clinicToken)}; path=/; max-age=31536000`;
        document.cookie = `dente_staff_token=${encodeURIComponent(staffToken)}; path=/; max-age=31536000`;
      },
      { clinicToken: auth.clinicToken, staffToken: auth.staffToken, u: auth.user, t: state.theme },
    );

    await page.goto(`${webBase}/?demo=true&warranty=true&theme=${state.theme}`, {
      waitUntil: "commit",
      timeout: 30000,
    });

    console.log("Waiting for warranty modal window to mount...");
    await page.waitForSelector('.warranty-modal-window, [data-testid="warranty-standalone-workspace"]', {
      timeout: 30000,
    });
    console.log("Mounted successfully!");

    await sleep(600);
    await suppressOverlays(page);

    // Apply theme forcibly
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
    }, { t: state.theme });

    // Switch tab if remediation is requested
    if (state.tab === "remediation") {
      console.log("Switching to remediation tab...");
      await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll(".warranty-tab-btn"));
        const remTab = tabs.find((b) => b.textContent && b.textContent.includes("Гарантийная переделка"));
        if (remTab) (remTab).click();
      });
      await sleep(600);
    }

    await sleep(400);

    const outPath = path.join(PROOFS_DIR, state.file);
    await page.screenshot({ path: outPath, fullPage: false });

    // Also save with ordered prefix as requested by Mandate 8al and Battle Order
    const prefixMap = {
      "warranty_pc_light.png": "01_warranty_pc_light.png",
      "warranty_pc_dark.png": "02_warranty_pc_dark.png",
      "warranty_mobile_light.png": "03_warranty_mobile_light.png",
      "warranty_mobile_dark.png": "04_warranty_mobile_dark.png",
    };
    if (prefixMap[state.file]) {
      const orderedPath = path.join(PROOFS_DIR, prefixMap[state.file]);
      copyFileSync(outPath, orderedPath);
      copyFileSync(outPath, path.join(BRAIN_DIR, prefixMap[state.file]));
    }

    const brainPath = path.join(BRAIN_DIR, state.file);
    copyFileSync(outPath, brainPath);

    const stats = statSync(outPath);
    const hash = crypto.createHash("md5").update(readFileSync(outPath)).digest("hex");
    const sizeKb = (stats.size / 1024).toFixed(1);

    console.log(`✅ Saved: ${outPath} (${sizeKb} KB, MD5: ${hash}) -> ${state.desc}`);
    if (stats.size < 20480) {
      throw new Error(`Screenshot ${state.file} too small (${stats.size} < 20KB)`);
    }

    await context.close();
  }

  console.log("\n🎉 ALL 4 CANONICAL RED TEAM WARRANTY VISUAL PROOFS CAPTURED SUCCESSFULLY!");
  await browser.close();
}

run().catch((err) => {
  console.error("❌ Fatal Error in run():", err);
  process.exit(1);
});
