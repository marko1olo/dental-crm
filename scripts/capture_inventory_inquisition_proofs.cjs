const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const CONV_ID = "973e54aa-4927-4915-b610-6837e5031335";
const PARENT_ID = "df880520-dc90-48e7-ab9e-032bd60d9f31";
const ARTIFACTS_DIRS = [
  path.join("C:/Users/Admin/.gemini/antigravity/brain", CONV_ID),
  path.join("C:/Users/Admin/.gemini/antigravity/brain", PARENT_ID),
];
const LOCAL_DIR = "C:/Clinic_MVP/dental-crm/apps/web/public/screenshots/warehouse_inquisition";
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
      clinicName: "Стоматология ДЕНТЕ Склад Ред Тим",
      email: `redteam-wh2-${uniqueId}@dente-clinic.ru`,
      password: "Password123!",
      ownerName: "Д-р Кузнецов Михаил Сергеевич",
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
  const stat = fs.statSync(localPath);
  console.log(`Saved local: ${localPath} (${stat.size} bytes)`);

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
  console.log("Starting visual capture of Warehouse & Inventory components (PC 1440x900)...");
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

    // 1. WAREHOUSE INVENTORY (#inventory) - PC Light & Dark
    console.log("Navigating to #inventory...");
    await page.goto(`${WEB_BASE}/#inventory`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await wait(3500);

    // Light Theme
    await page.evaluate(() => {
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-theme", "light");
    });
    await wait(1000);
    await saveScreenshots(page, "proof_warehouse_inventory_pc_light");

    // Dark Theme
    await page.evaluate(() => {
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
    });
    await wait(1000);
    await saveScreenshots(page, "proof_warehouse_inventory_pc_dark");

    // Switch back to light
    await page.evaluate(() => {
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-theme", "light");
    });
    await wait(500);

    // 2. Open Warehouse Manager Modal via Operations menu
    console.log("Opening Warehouse Manager Modal...");
    const opsMenuBtn = await page.$("[data-testid='btn-warehouse-ops-menu']");
    if (opsMenuBtn) {
      await opsMenuBtn.click();
      await wait(500);
      const whManagerTrigger = await page.$("[data-testid='warehouse-manager-trigger']");
      if (whManagerTrigger) {
        await whManagerTrigger.click();
        await wait(1500);
        await saveScreenshots(page, "proof_warehouse_manager_pc_light");

        // Dark Theme
        await page.evaluate(() => {
          document.documentElement.classList.add("dark");
          document.documentElement.setAttribute("data-theme", "dark");
        });
        await wait(800);
        await saveScreenshots(page, "proof_warehouse_manager_pc_dark");

        // Switch back to light and close
        await page.evaluate(() => {
          document.documentElement.classList.remove("dark");
          document.documentElement.setAttribute("data-theme", "light");
        });
        const closeBtn = await page.$("button[aria-label='Закрыть'], [data-testid='close-modal-btn'], button:has-text('Отмена')");
        if (closeBtn) await closeBtn.click();
        await wait(500);
      }
    }

    // 3. Open Nurse Carpule Disposal Modal via Operations menu
    console.log("Opening Nurse Carpule Disposal Modal...");
    const opsMenuBtn2 = await page.$("[data-testid='btn-warehouse-ops-menu']");
    if (opsMenuBtn2) {
      await opsMenuBtn2.click();
      await wait(500);
      const nurseTrigger = await page.$("[data-testid='nurse-carpule-disposal-modal-trigger']");
      if (nurseTrigger) {
        await nurseTrigger.click();
        await wait(1500);
        await saveScreenshots(page, "proof_nurse_carpule_modal_pc_light");

        // Dark Theme
        await page.evaluate(() => {
          document.documentElement.classList.add("dark");
          document.documentElement.setAttribute("data-theme", "dark");
        });
        await wait(800);
        await saveScreenshots(page, "proof_nurse_carpule_modal_pc_dark");

        // Switch back to light and close
        await page.evaluate(() => {
          document.documentElement.classList.remove("dark");
          document.documentElement.setAttribute("data-theme", "light");
        });
        const closeBtn = await page.$("button:has-text('Отмена'), button[aria-label='Закрыть']");
        if (closeBtn) await closeBtn.click();
        await wait(500);
      }
    }

    console.log(">>> All visual proofs captured successfully!");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("FATAL ERROR in capture runner:", err);
  process.exit(1);
});
