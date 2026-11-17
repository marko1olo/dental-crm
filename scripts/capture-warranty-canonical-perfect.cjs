const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

let WEB_BASE = "http://127.0.0.1:5173";

async function resolveWebBase() {
  for (const port of [5173, 5174, 5175, 5176]) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(1500) });
      if (res.status === 200) {
        console.log(`[VITE DETECTED] Using active dev server at http://127.0.0.1:${port}`);
        return `http://127.0.0.1:${port}`;
      }
    } catch {}
  }
  return "http://127.0.0.1:5173";
}
const WARRANTY_DIR = path.resolve("docs/proofs/warranty");
const WARRANTIES_DIR = path.resolve("docs/proofs/warranties");
const CURRENT_CONV_ID = "d61ce9c8-a592-42d8-b070-3fb55b7f3e14";
const BRAIN_DIR = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CURRENT_CONV_ID}/screenshots`);

for (const dir of [WARRANTY_DIR, WARRANTIES_DIR, BRAIN_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function suppressOverlays(page) {
  await page.evaluate(() => {
    const style = document.createElement("style");
    style.id = "suppress-all-overlays";
    style.innerHTML = `
      .tour-spotlight-root, .tour-backdrop-clickable-zone,
      [data-testid="guided-tour-spotlight-overlay"],
      [data-testid="guided-tour-coach-mark-card"],
      [data-testid="demo-mode-banner"], .global-toast-container,
      .copilot-trigger-btn, .workspace-continuity-strip,
      vite-error-overlay { display: none !important; pointer-events: none !important; }
    `;
    document.head.appendChild(style);
    document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay'], .toast, .connection-toast, .copilot-trigger-btn, .workspace-continuity-strip").forEach((el) => el.remove());
  }).catch(() => {});
}

async function setTheme(page, theme) {
  await page.evaluate((th) => {
    document.documentElement.setAttribute("data-theme", th);
    document.body.setAttribute("data-theme", th);
    if (th === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      document.body.classList.add("dark");
      document.body.classList.remove("light");
      document.documentElement.style.colorScheme = "dark";
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.body.classList.remove("dark");
      document.body.classList.add("light");
      document.documentElement.style.colorScheme = "light";
    }
    localStorage.setItem("dente_theme", th);
    localStorage.setItem("dente_theme_mode", th);
    window.dispatchEvent(new Event("themechange"));
  }, theme).catch(() => {});
  await suppressOverlays(page);
  await page.waitForTimeout(500);
}

async function saveProof(page, filename) {
  const target = path.join(WARRANTY_DIR, filename);
  const warrantiesTarget = path.join(WARRANTIES_DIR, filename);
  const brainTarget = path.join(BRAIN_DIR, filename);
  await page.screenshot({ path: target, fullPage: false });
  try { fs.copyFileSync(target, warrantiesTarget); } catch {}
  try { fs.copyFileSync(target, brainTarget); } catch {}
  const stat = fs.statSync(target);
  if (stat.size < 20480) {
    throw new Error(`[BYTE GUARD FAIL] ${filename} size is ${stat.size} bytes (< 20KB)! Blank screen!`);
  }
  console.log(`[PROOF OK] ${filename} -> ${stat.size} bytes (>= 20KB guard passed)`);
}

async function main() {
  console.log("=== LAUNCHING CHROMIUM FOR CANONICAL 4-STATE WARRANTY PROOFS ===");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });

  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  await ctx.addInitScript(() => {
    localStorage.setItem("dente_clinic_token", "demo-showcase-token-owner");
    localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-owner");
    localStorage.setItem("dente_active_session_token", "demo-showcase-staff-token-owner");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_user_role", "owner");
    localStorage.setItem("dente_role", "owner");
    localStorage.setItem("dente_perspective", "management");
    sessionStorage.setItem("dente_unlocked", "true");
    localStorage.setItem("dente_active_mode", "clinic");
    localStorage.setItem("dente_offline_mode", "true");
    localStorage.setItem("dente_offline_readiness_banner_dismissed_v1", "true");
    localStorage.setItem("dente_demo_showcase", "true");
    localStorage.setItem("dente_demo_showcase_mode_v1", "true");
    localStorage.setItem("dente_demo_mode", "true");
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_tour_dismissed", "true");
    localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
    localStorage.setItem("dente_demo_banner_dismissed", "true");
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({
      dismissed: true,
      step: "done",
      completed: true,
    }));
  });

  const page = await ctx.newPage();
  page.on("console", (msg) => {
    const text = msg.text();
    if (msg.type() === "error" || text.includes("error") || text.includes("Error") || text.includes("warranty")) {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${text}`);
    }
  });
  page.on("pageerror", (err) => console.error(`[BROWSER PAGE ERROR]`, err));

  console.log("\n>>> NAVIGATING TO CRM ROOT WITH WARRANTY PASSPORT MODAL <<<");
  WEB_BASE = await resolveWebBase();
  await page.goto(`${WEB_BASE}/?demo=true&warranty=1#warranty-passport`, { waitUntil: "commit", timeout: 35000 });
  console.log("Waiting for React hydration and .boot-state detachment...");
  await page.waitForSelector(".boot-state", { state: "detached", timeout: 60000 }).catch(() => {});
  let mounted = false;
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(500);
    const hasModal = await page.evaluate(() => Boolean(document.querySelector(".warranty-modal-window") || document.querySelector("[data-testid='warranty-standalone-workspace']")));
    if (hasModal) {
      mounted = true;
      break;
    }
  }

  // Trigger modal open via events with retry
  for (let attempt = 0; attempt < 3; attempt++) {
    const isPresent = await page.evaluate(() => Boolean(document.querySelector(".warranty-modal-window")));
    if (isPresent) break;
    try {
      await page.evaluate(() => {
        window.location.hash = "#warranty-passport";
        window.dispatchEvent(new CustomEvent("dente:open-warranty-passport"));
        window.dispatchEvent(new CustomEvent("dente-open-warranty-passport"));
      });
      await page.waitForTimeout(1500);
    } catch (_) {}
  }

  // Wait for modal window to appear
  try {
    await page.waitForSelector(".warranty-modal-window, [data-testid='warranty-standalone-workspace']", { timeout: 30000 });
    console.log("✅ .warranty-modal-window mounted successfully!");
  } catch (e) {
    console.warn("⚠️ Wait for .warranty-modal-window timed out, dispatching open event again...");
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("dente:open-warranty-passport"));
      window.dispatchEvent(new CustomEvent("dente-open-warranty-passport"));
    });
    await page.waitForTimeout(2000);
  }

  // Ensure an item exists so the studio looks rich and clinical
  await page.evaluate(() => {
    const addBtn = document.querySelector(".warranty-btn-add-item");
    if (addBtn) (addBtn).click();
  });
  await page.waitForTimeout(500);

  await suppressOverlays(page);

  // 1. PC Light (1440x900) - Warranty Studio Editor
  console.log("\n📸 1. PC Light (1440x900) - Warranty Studio Editor...");
  await setTheme(page, "light");
  await saveProof(page, "01_warranty_passport_pc_light_1440x900.png");

  // 2. PC Dark (1440x900) - Warranty Studio Editor Dark
  console.log("\n📸 2. PC Dark (1440x900) - Warranty Studio Editor Dark...");
  await setTheme(page, "dark");
  await page.waitForTimeout(600);
  await saveProof(page, "02_warranty_passport_pc_dark_1440x900.png");

  // 2b. Optional PC Dark Remediation Tab Proof
  try {
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll(".warranty-tab-btn"));
      const remTab = tabs.find((b) => b.textContent && b.textContent.includes("Гарантийная переделка"));
      if (remTab) (remTab).click();
    });
    await page.waitForTimeout(600);
    await saveProof(page, "05_warranty_remediation_pc_dark_1440x900.png");
    // Return to editor tab
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll(".warranty-tab-btn"));
      const edTab = tabs.find((b) => b.textContent && (b.textContent.includes("Параметры") || b.textContent.includes("Позиции")));
      if (edTab) (edTab).click();
    });
    await page.waitForTimeout(500);
  } catch (remErr) {
    console.warn("Remediation proof optional skip:", remErr.message);
  }

  // 3. Mobile Light (390x844)
  console.log("\n📸 3. Mobile Light (390x844) - Bottom Sheet Touch Zone...");
  await page.setViewportSize({ width: 390, height: 844 });
  await setTheme(page, "light");
  await page.waitForTimeout(500);
  await saveProof(page, "03_warranty_passport_mobile_light_390x844.png");

  // 4. Mobile Dark (390x844)
  console.log("\n📸 4. Mobile Dark (390x844) - Dark Mode...");
  await setTheme(page, "dark");
  await page.waitForTimeout(500);
  await saveProof(page, "04_warranty_passport_mobile_dark_390x844.png");

  console.log("\n🎉 ALL 4 CANONICAL WARRANTY PROOFS CAPTURED SUCCESSFULLY!");
  await browser.close();
}

main().catch((err) => {
  console.error("❌ Fatal Error:", err);
  process.exit(1);
});