const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const CONV_ID = "45ebee44-9391-4430-8998-d4e1f238103f";
const PARENT_ID = "beb92312-c6d7-426d-a438-12dcad022abc";
const ARTIFACTS_DIRS = [
  path.join("C:/Users/Admin/.gemini/antigravity/brain", CONV_ID),
  path.join("C:/Users/Admin/.gemini/antigravity/brain", PARENT_ID),
];
const LOCAL_DIR = "C:/Clinic_MVP/dental-crm/apps/web/public/screenshots/warehouse_sanpin";
const API_BASE = "http://127.0.0.1:4100";
const WEB_BASE = "http://127.0.0.1:5173";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function provisionLiveSession() {
  const uniqueId = Date.now();
  console.log(">>> [Provisioning] Setting up live authenticated session on Fastify 4100...");

  const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicName: "Стоматология ДЕНТЕ Склад и СанПиН",
      email: `chief-inq-${uniqueId}@dente-clinic.ru`,
      password: "Password123!",
      ownerName: "Д-р Воронов Алексей Владимирович",
      ownerPin: "1234",
    }),
  });

  if (!initRes.ok) {
    throw new Error(`Clinic setup failed: ${await initRes.text()}`);
  }
  const initData = await initRes.json();

  const unlockRes = await fetch(`${API_BASE}/api/auth/staff/unlock`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-dente-clinic-token": initData.clinicToken,
    },
    body: JSON.stringify({ userId: initData.ownerUserId, pinCode: "1234" }),
  });

  if (!unlockRes.ok) {
    throw new Error(`Staff unlock failed: ${await unlockRes.text()}`);
  }
  const unlockData = await unlockRes.json();

  return {
    clinicToken: initData.clinicToken,
    staffToken: unlockData.staffToken,
    ownerUserId: initData.ownerUserId,
  };
}

async function saveScreenshots(page, baseName) {
  const localPath = path.join(LOCAL_DIR, `${baseName}.png`);
  await page.screenshot({ path: localPath, fullPage: false });
  console.log(`Saved local: ${localPath}`);

  for (const artDir of ARTIFACTS_DIRS) {
    try {
      fs.mkdirSync(artDir, { recursive: true });
      const artPath = path.join(artDir, `${baseName}.png`);
      fs.copyFileSync(localPath, artPath);
      console.log(`Copied artifact: ${artPath}`);
    } catch (e) {
      console.warn(`Artifact copy error: ${e.message}`);
    }
  }
}

async function run() {
  console.log("Starting visual capture of Warehouse, SanPiN and Lab modules...");
  fs.mkdirSync(LOCAL_DIR, { recursive: true });

  const auth = await provisionLiveSession();

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });

    await context.addInitScript(({ clinicToken, staffToken, ownerUserId }) => {
      localStorage.setItem("dente_clinic_token", clinicToken);
      localStorage.setItem("dente_staff_token", staffToken);
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_user_id", ownerUserId);
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
      localStorage.setItem("dente_guide_tour_seen_roles_v2", JSON.stringify(["admin", "doctor", "director"]));
      localStorage.setItem("dente_quest_progress_v2", JSON.stringify({
        isDismissedPermanently: true,
        isTourActive: false,
        tracksProgress: {
          solo_doctor: { completed: true, completedStepIds: ["schedule_overview", "odontogram_status", "visit_diary_043", "fast_cashier_54fz"] },
          reception_admin: { completed: true, completedStepIds: [] },
          imaging_diagnostics: { completed: true, completedStepIds: [] }
        }
      }));
      localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
      localStorage.setItem("dente_theme_mode", "light");
    }, auth);

    const page = await context.newPage();

    // 1. WAREHOUSE (Inventory) - PC Light & Dark
    console.log("Capturing Warehouse Inventory (#inventory)...");
    await page.goto(`${WEB_BASE}/#inventory`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await wait(3000);

    // Light theme
    await page.evaluate(() => {
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-theme", "light");
    });
    await wait(1000);
    await saveScreenshots(page, "proof_warehouse_inventory_pc_light");

    // Dark theme
    await page.evaluate(() => {
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
    });
    await wait(1000);
    await saveScreenshots(page, "proof_warehouse_inventory_pc_dark");

    // Click on FEFO tab to capture FEFO batch panel
    console.log("Capturing FEFO Batch panel...");
    const fefoTab = await page.$("[data-testid='tab-inventory-fefo']");
    if (fefoTab) {
      await fefoTab.click();
      await wait(1500);
      await saveScreenshots(page, "proof_warehouse_fefo_panel_dark");

      await page.evaluate(() => {
        document.documentElement.classList.remove("dark");
        document.documentElement.setAttribute("data-theme", "light");
      });
      await wait(1000);
      await saveScreenshots(page, "proof_warehouse_fefo_panel_light");
    }

    // Mobile view for Warehouse (390x844)
    console.log("Capturing Mobile Warehouse (390x844)...");
    await page.setViewportSize({ width: 390, height: 844 });
    await wait(1200);
    await saveScreenshots(page, "proof_warehouse_mobile_light");

    await page.evaluate(() => {
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
    });
    await wait(1000);
    await saveScreenshots(page, "proof_warehouse_mobile_dark");

    // Restore desktop viewport
    await page.setViewportSize({ width: 1440, height: 900 });

    // 2. SANPIN REGISTERS (#sanpin)
    console.log("Navigating to SanPiN Registers (#sanpin)...");
    await page.evaluate(() => {
      window.location.hash = "#sanpin";
    });

    // Wait until SanPiN content or tabs are rendered
    await page.waitForSelector("[data-testid='tab-autoclave-btn'], .sanpin-category-nav, .sanpin-kpi-grid", { timeout: 30000 });
    await wait(1000);

    // Light theme
    await page.evaluate(() => {
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-theme", "light");
    });
    await wait(1000);
    await saveScreenshots(page, "proof_sanpin_registers_pc_light");

    // Dark theme
    await page.evaluate(() => {
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
    });
    await wait(1000);
    await saveScreenshots(page, "proof_sanpin_registers_pc_dark");

    // Click on PSO tab (Пробы чистоты)
    console.log("Capturing SanPiN PSO Register tab...");
    const psoBtn = await page.$("[data-testid='tab-pso-btn']");
    if (psoBtn) {
      await psoBtn.click();
      await wait(1500);
      await saveScreenshots(page, "proof_sanpin_pso_tab_dark");

      await page.evaluate(() => {
        document.documentElement.classList.remove("dark");
        document.documentElement.setAttribute("data-theme", "light");
      });
      await wait(1000);
      await saveScreenshots(page, "proof_sanpin_pso_tab_light");
    }

    // 3. DENTAL LAB HUB
    console.log("Navigating to Dental Lab Orders Hub...");
    await page.goto(`${WEB_BASE}/lab_orders_preview.html?tab=hub&theme=light`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector(".ztl-filter-bar, .ztl-modal-inner, .ztl-search-input", { timeout: 30000 });
    await wait(1000);
    await saveScreenshots(page, "proof_dental_lab_orders_pc_light");

    await page.goto(`${WEB_BASE}/lab_orders_preview.html?tab=hub&theme=dark`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector(".ztl-filter-bar, .ztl-modal-inner, .ztl-search-input", { timeout: 30000 });
    await wait(1000);
    await saveScreenshots(page, "proof_dental_lab_orders_pc_dark");

    console.log("Visual capture completed successfully!");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("Capture script error:", err);
  process.exit(1);
});
