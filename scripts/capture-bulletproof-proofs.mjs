import { existsSync, mkdirSync, statSync, copyFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUT_LEADS = path.resolve(__dirname, "../docs/proofs/leads");
const OUT_TEL = path.resolve(__dirname, "../docs/proofs/telephony");

if (!existsSync(OUT_LEADS)) mkdirSync(OUT_LEADS, { recursive: true });
if (!existsSync(OUT_TEL)) mkdirSync(OUT_TEL, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function suppressOverlays(page) {
  try {
    await page.evaluate(() => {
      const style = document.createElement("style");
      style.id = "suppress-all-tour-overlays";
      style.innerHTML = `
        .tour-spotlight-root,
        .tour-backdrop-clickable-zone,
        [data-testid="guided-tour-spotlight-overlay"],
        [data-testid="guided-tour-coach-mark-card"],
        .shepherd-element,
        .default-clinic-banner,
        [role="status"] {
          display: none !important;
          pointer-events: none !important;
          opacity: 0 !important;
        }
      `;
      document.head.appendChild(style);
      document.querySelectorAll(".tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
    });
  } catch (_) {}
}

async function setTheme(page, theme) {
  await page.evaluate((th) => {
    if (window.__useThemeStore) {
      window.__useThemeStore.getState().setThemeMode(th);
    }
    document.documentElement.setAttribute("data-theme", th);
    document.body.setAttribute("data-theme", th);
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
    try {
      localStorage.setItem("dente_theme", th);
      localStorage.setItem("dente_theme_mode", th);
      localStorage.setItem("theme", th);
    } catch (_) {}
  }, theme);
  await sleep(600);
}

async function saveProof(page, fullPath, description, minBytes = 25000) {
  await sleep(500);
  await page.screenshot({ path: fullPath, fullPage: false });
  const stat = statSync(fullPath);
  console.log(`  [PROOF] ${path.basename(fullPath)} (${Math.round(stat.size / 1024)} KB) -> ${description}`);
  if (stat.size < minBytes) {
    console.warn(`  [WARNING] File size is small: ${stat.size} bytes`);
  }
}

async function triggerCall(page) {
  console.log("  Dispatching mock incoming call...");
  await page.evaluate(() => {
    if (window.__APP_STORE__) {
      window.__APP_STORE__.getState().setSelectedWorkspaceRole("administrator");
    }
    if (window.__denteTelephonyStore) {
      window.__denteTelephonyStore.getState().triggerIncomingCall({
        callId: "call-" + Date.now(),
        phone: "+7 (999) 777-88-99",
        patientName: "Кузнецов Алексей Петрович",
        patientId: "pat-kuznetsov-01",
        provider: "mango",
        timestamp: new Date().toISOString(),
        status: "ringing",
        debtRub: 0,
        balanceRub: 0,
        hasDebt: false,
        hasDms: false,
        acutePain: true,
      });
    }
  });
  await sleep(1000);
}

async function dismissCall(page) {
  console.log("  Dismissing mock call...");
  await page.evaluate(() => {
    if (window.__denteTelephonyStore) {
      window.__denteTelephonyStore.getState().dismissCall();
    }
  });
  await sleep(600);
}

async function main() {
  console.log("=== Launching Playwright Chromium for Bulletproof Proofs ===");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: [
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--proxy-server=direct://",
      "--proxy-bypass-list=*",
    ],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });

    const page = await context.newPage();

    console.log("1. Navigating to http://127.0.0.1:5173/?demo=true ...");
    await page.goto("http://127.0.0.1:5173/?demo=true", { waitUntil: "domcontentloaded", timeout: 35000 });
    await sleep(2500);

    // Click demo entrance button
    const demoBtn = page.locator("button:has-text('Быстрый вход в Демо-тур')").first();
    if (await demoBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      console.log("Found demo button, clicking...");
      await demoBtn.click();
      await sleep(4000);
    }

    // Wait for real UI
    await page.waitForSelector(".workspace-shell, nav, header", { state: "visible", timeout: 25000 }).catch(() => {});
    await suppressOverlays(page);

    // ─────────────────────────────────────────────────────────────
    // 1. LEADS KANBAN PC (1440x900)
    // ─────────────────────────────────────────────────────────────
    console.log("\n2. Navigating to #leads on PC...");
    await page.evaluate(() => {
      window.location.hash = "leads";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    await sleep(2500);
    await suppressOverlays(page);

    await setTheme(page, "light");
    await saveProof(page, path.join(OUT_LEADS, "01_leads_kanban_pc_light_1440x900.png"), "Leads Kanban PC Light (1440x900)");

    await setTheme(page, "dark");
    await saveProof(page, path.join(OUT_LEADS, "02_leads_kanban_pc_dark_1440x900.png"), "Leads Kanban PC Dark (1440x900)");

    // ─────────────────────────────────────────────────────────────
    // 2. TELEPHONY INCOMING CALL PC (1440x900)
    // ─────────────────────────────────────────────────────────────
    console.log("\n3. Triggering Incoming Call on PC...");
    await triggerCall(page);

    const expandBtn = page.locator('[data-testid="capsule-expand-btn"]').first();
    if (await expandBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log("Expanding call capsule...");
      await expandBtn.click();
      await sleep(600);
    }

    await setTheme(page, "dark");
    await saveProof(page, path.join(OUT_TEL, "02_telephony_incoming_call_pc_dark_1440x900.png"), "Incoming Call PC Dark (1440x900)");

    await setTheme(page, "light");
    await saveProof(page, path.join(OUT_TEL, "01_telephony_incoming_call_pc_light_1440x900.png"), "Incoming Call PC Light (1440x900)");

    await dismissCall(page);

    // ─────────────────────────────────────────────────────────────
    // 3. TELEPHONY STUDIO PC (1440x900)
    // ─────────────────────────────────────────────────────────────
    console.log("\n4. Opening Telephony Studio on PC (#telephony)...");
    await page.evaluate(() => {
      window.location.hash = "telephony";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    await sleep(2000);
    await page.waitForSelector('[data-testid="telephony-studio-modal-root"], [role="dialog"]', { state: "visible", timeout: 10000 }).catch(() => {});

    await setTheme(page, "light");
    await saveProof(page, path.join(OUT_TEL, "01_telephony_studio_pc_light_1440x900.png"), "Telephony Studio PC Light (1440x900)");

    await setTheme(page, "dark");
    await saveProof(page, path.join(OUT_TEL, "02_telephony_studio_pc_dark_1440x900.png"), "Telephony Studio PC Dark (1440x900)");

    // ─────────────────────────────────────────────────────────────
    // 4. RESIZE TO MOBILE (390x844, iPhone 14)
    // ─────────────────────────────────────────────────────────────
    console.log("\n5. Resizing session to Mobile Viewport (390x844)...");
    await page.setViewportSize({ width: 390, height: 844 });
    await sleep(2000);

    // 4.1 TELEPHONY STUDIO MOBILE
    console.log("\n6. Capturing Telephony Studio on Mobile (#telephony)...");
    await setTheme(page, "dark");
    await saveProof(page, path.join(OUT_TEL, "04_telephony_studio_mobile_dark_390x844.png"), "Telephony Studio Mobile Dark (390x844)");

    await setTheme(page, "light");
    await saveProof(page, path.join(OUT_TEL, "03_telephony_studio_mobile_light_390x844.png"), "Telephony Studio Mobile Light (390x844)");

    // Close studio modal & switch to leads
    await page.evaluate(() => {
      window.location.hash = "leads";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    await sleep(2500);
    await suppressOverlays(page);

    // 4.2 LEADS MOBILE FEED
    console.log("\n7. Capturing Leads Mobile Feed on Mobile (#leads)...");
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const allTab = btns.find((b) => b.innerText && b.innerText.includes("Все"));
      if (allTab) allTab.click();
    });
    await sleep(1500);

    await setTheme(page, "light");
    await saveProof(page, path.join(OUT_LEADS, "03_leads_mobile_feed_light_390x844.png"), "Leads Mobile Feed Light (390x844)");

    await setTheme(page, "dark");
    await saveProof(page, path.join(OUT_LEADS, "04_leads_mobile_feed_dark_390x844.png"), "Leads Mobile Feed Dark (390x844)");

    // 4.3 TELEPHONY INCOMING CALL MOBILE
    console.log("\n8. Triggering Incoming Call on Mobile (#leads)...");
    await triggerCall(page);

    const mobExpBtn = page.locator('[data-testid="capsule-expand-btn"]').first();
    if (await mobExpBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log("Expanding mobile call capsule...");
      await mobExpBtn.click();
      await sleep(600);
    }
    await sleep(800);

    await setTheme(page, "dark");
    await saveProof(page, path.join(OUT_TEL, "04_telephony_incoming_call_mobile_dark_390x844.png"), "Incoming Call Mobile Dark (390x844)");

    await setTheme(page, "light");
    await saveProof(page, path.join(OUT_TEL, "03_telephony_incoming_call_mobile_light_390x844.png"), "Incoming Call Mobile Light (390x844)");

    await dismissCall(page);

    // Canonical mirrors (Mandate 8aw)
    copyFileSync(
      path.join(OUT_TEL, "01_telephony_studio_pc_light_1440x900.png"),
      path.join(OUT_TEL, "01_telephony_pc_light_1440x900.png")
    );
    copyFileSync(
      path.join(OUT_TEL, "02_telephony_studio_pc_dark_1440x900.png"),
      path.join(OUT_TEL, "02_telephony_pc_dark_1440x900.png")
    );
    copyFileSync(
      path.join(OUT_TEL, "03_telephony_studio_mobile_light_390x844.png"),
      path.join(OUT_TEL, "03_telephony_mobile_light_390x844.png")
    );
    copyFileSync(
      path.join(OUT_TEL, "04_telephony_studio_mobile_dark_390x844.png"),
      path.join(OUT_TEL, "04_telephony_mobile_dark_390x844.png")
    );

    console.log("\n=== ALL 4-STATE PROOFS CAPTURED SUCCESSFULLY! ===");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR in bulletproof capture:", err);
  process.exit(1);
});
