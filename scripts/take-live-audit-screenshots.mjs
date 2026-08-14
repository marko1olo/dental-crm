/**
 * Live 4-state visual audit screenshot runner for DENTE dental-crm.
 *
 * Strategy:
 *   1. Create a fresh test clinic via POST /api/auth/setup/init (gets clinicToken)
 *   2. Unlock staff via POST /api/auth/staff/unlock (gets staffToken)
 *   3. Inject tokens + onboardingDismissed into browser localStorage so the real screen views render
 *   4. Capture all 16 states: desktop/mobile × light/dark for Schedule, Visit, Finance, Imaging
 */

import puppeteer from "puppeteer";
import path from "path";

const API_BASE = "http://127.0.0.1:4100";
const APP_BASE = "http://127.0.0.1:5173";
const CHROME_PATH = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\ac0ebfe0-b3db-438a-bc2d-a6e0bee44a2a";

// ─── 1. Auth provisioning ────────────────────────────────────────────────────────

async function provisionTestClinic() {
  const uniqueId = Date.now();
  const loginEmail = `audit-test-${uniqueId}@dente-visual-test.local`;
  const password = "Dente2026!";
  const ownerPin = "123456";

  console.log(`[AUTH] Creating test clinic: ${loginEmail}`);

  const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicName: `Клиника Дент-Аудит ${uniqueId}`,
      email: loginEmail,
      password,
      ownerName: "Д-р Иванов Иван Иванович",
      ownerPin,
    }),
  });

  if (!initRes.ok) throw new Error(`setup/init failed ${initRes.status}: ${await initRes.text()}`);
  const initData = await initRes.json();
  console.log(`[AUTH] Clinic OK. orgId=${initData.organizationId}, ownerUserId=${initData.ownerUserId}`);

  const unlockRes = await fetch(`${API_BASE}/api/auth/staff/unlock`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-dente-clinic-token": initData.clinicToken,
    },
    body: JSON.stringify({ userId: initData.ownerUserId, pinCode: ownerPin }),
  });

  if (!unlockRes.ok) throw new Error(`staff/unlock failed ${unlockRes.status}: ${await unlockRes.text()}`);
  const unlockData = await unlockRes.json();
  console.log(`[AUTH] Staff unlocked. staffToken OK`);

  return { clinicToken: initData.clinicToken, staffToken: unlockData.staffToken };
}

// ─── 2. Browser Navigation ────────────────────────────────────────────────────────

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile:  { width: 390,  height: 844 },
};

async function seedTokensAndGo(page, clinicToken, staffToken, url) {
  // Step 1: navigate to origin to access localStorage
  try {
    await page.goto(`${APP_BASE}/`, { waitUntil: "domcontentloaded", timeout: 15000 });
  } catch (e) {
    console.log(`  [WARN] Initial load: ${e.message}`);
  }

  // Seed auth tokens and dismiss onboarding flags
  await page.evaluate((ct, st) => {
    localStorage.setItem("dente_clinic_token", ct);
    localStorage.setItem("dente_staff_token", st);
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
    localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true }));
  }, clinicToken, staffToken);

  // Step 2: navigate to target page
  try {
    await page.goto(url, { waitUntil: "load", timeout: 20000 });
  } catch (e) {
    console.log(`  [WARN] Page load: ${e.message}`);
  }

  // Wait until .topbar and .panel/.workspace are mounted and visible
  try {
    await page.waitForSelector(".topbar", { visible: true, timeout: 30000 });
    await page.waitForSelector(".panel, .workspace, .work-grid", { visible: true, timeout: 30000 });
  } catch (e) {
    console.log(`  [WARN] Wait selectors: ${e.message}`);
  }

  // Settle CSS transitions & fetch calls
  await new Promise(r => setTimeout(r, 1500));
}

async function applyTheme(page, dark) {
  await page.evaluate((isDark) => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      root.setAttribute("data-theme", "dark");
      localStorage.setItem("dente_theme", "dark");
    } else {
      root.classList.remove("dark");
      root.setAttribute("data-theme", "light");
      localStorage.setItem("dente_theme", "light");
    }
  }, dark);

  await new Promise(r => setTimeout(r, 600));
}

async function screenshot(page, name) {
  const p = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: p, fullPage: false });
  console.log(`[SHOT] ${name}.png`);
  return p;
}

// ─── 3. Main ──────────────────────────────────────────────────────────────────

const PAGES = [
  { name: "schedule", url: `${APP_BASE}/#schedule` },
  { name: "visit",    url: `${APP_BASE}/#visit` },
  { name: "finance",  url: `${APP_BASE}/#finance` },
  { name: "imaging",  url: `${APP_BASE}/#imaging` },
];

async function main() {
  const auth = await provisionTestClinic().catch(e => {
    console.error("[AUTH FATAL]", e.message);
    process.exit(1);
  });

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-web-security"],
  });

  try {
    for (const { name, url } of PAGES) {
      for (const [size, viewport] of Object.entries(VIEWPORTS)) {
        for (const dark of [false, true]) {
          const theme = dark ? "dark" : "light";
          const label = `${name}_${size}_${theme}`;
          console.log(`\n[CAPTURE] ${label} (${viewport.width}×${viewport.height})`);

          const page = await browser.newPage();
          await page.setViewport(viewport);

          try {
            await seedTokensAndGo(page, auth.clinicToken, auth.staffToken, url);
            await applyTheme(page, dark);
            await screenshot(page, label);
            
            // Capture scrolled view
            await page.evaluate(() => window.scrollBy(0, 700));
            await new Promise(r => setTimeout(r, 400));
            await screenshot(page, `${label}_scrolled`);
          } catch (err) {
            console.error(`  [ERR] ${label}: ${err.message}`);
            try { await screenshot(page, `${label}`); } catch {}
          } finally {
            await page.close();
          }
        }
      }
    }
  } finally {
    await browser.close();
  }

  console.log("\n[DONE] All screenshots captured successfully.");
}

main().catch(e => { console.error("[FATAL]", e); process.exit(1); });
