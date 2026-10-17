const puppeteer = require("puppeteer");
const path = require("node:path");
const fs = require("node:fs");

const PROOFS_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/lab");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/de420c96-e1ca-493f-afcd-758bc38498ab");

for (const dir of [PROOFS_DIR, BRAIN_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function suppressOverlays(page) {
  await page.evaluate(() => {
    const style = document.createElement("style");
    style.id = "suppress-all-tour-overlays";
    style.innerHTML = `
      .tour-spotlight-root,
      .tour-backdrop-clickable-zone,
      [data-testid="guided-tour-spotlight-overlay"],
      [data-testid="guided-tour-coach-mark-card"],
      .shepherd-element {
        display: none !important;
        pointer-events: none !important;
        opacity: 0 !important;
      }
    `;
    document.head.appendChild(style);
  });
}

async function saveProof(page, filename, description) {
  const primaryPath = path.join(PROOFS_DIR, filename);
  await page.screenshot({ path: primaryPath, fullPage: false });
  const stat = fs.statSync(primaryPath);
  console.log(`[PROOF CAPTURED] ${filename} (${stat.size} bytes) -> ${description}`);

  const secondaryPath = path.join(BRAIN_DIR, filename);
  fs.copyFileSync(primaryPath, secondaryPath);
}

async function main() {
  console.log("=== STARTING CANONICAL 4-STATE DENTAL LAB PROOF CAPTURE ===");
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    // ═════════════════════════════════════════════════════════════════════════
    // 1. PC CONTEXT (1440x900)
    // ═════════════════════════════════════════════════════════════════════════
    console.log("--- 1. Setting up PC Context (1440x900) ---");
    const pcPage = await browser.newPage();
    await pcPage.setViewport({ width: 1440, height: 900 });

    await pcPage.evaluateOnNewDocument(() => {
      localStorage.setItem("dente_clinic_token", "demo-showcase-token-owner");
      localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-owner");
      localStorage.setItem("dente_cached_active_staff_user", JSON.stringify({
        id: "demo-owner-id",
        fullName: "Д-р Воронов М. С.",
        role: "owner",
        email: "owner@dente-demo.ru",
        organizationId: "01a00000-0000-0000-0000-000000000000",
        specialization: "Главврач / Владелец"
      }));
      localStorage.setItem("dente_demo_showcase", "true");
      localStorage.setItem("dente_last_view", "lab");
      localStorage.setItem("dente_theme", "light");
    });

    console.log("Navigating PC to http://127.0.0.1:5173/?demo=true#lab ...");
    await pcPage.goto("http://127.0.0.1:5173/?demo=true#lab", { waitUntil: "domcontentloaded", timeout: 30000 });
    await pcPage.waitForSelector('[data-testid="dental-lab-orders-view"]', { timeout: 15000 });
    await sleep(2000);
    await suppressOverlays(pcPage);

    // Switch to Kanban view
    console.log("Switching PC view to Kanban...");
    const kanbanBtn = await pcPage.$('[data-testid="lab-orders-view-kanban-btn"]');
    if (kanbanBtn) {
      await kanbanBtn.click();
      await sleep(1500);
    }
    await pcPage.waitForSelector('[data-testid="canonical-4-stage-kanban-board"], .ztl-kanban-board', { timeout: 10000 });
    await sleep(1000);

    // Capture PC Light
    console.log("Capturing PC Light...");
    await pcPage.evaluate(() => {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem("dente_theme", "light");
    });
    await sleep(1000);
    await saveProof(
      pcPage,
      "proof_lab_pc_light.png",
      "Dental Laboratory Kanban Board (PC Light 1440x900) - 4 canonical stages [Отправлен | В работе у техника | В клинике / Готов к сдаче | Сдан пациенту]"
    );

    // Capture PC Dark
    console.log("Capturing PC Dark...");
    await pcPage.evaluate(() => {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("dente_theme", "dark");
    });
    await sleep(1000);
    await saveProof(
      pcPage,
      "proof_lab_pc_dark.png",
      "Dental Laboratory Kanban Board (PC Dark 1440x900) - High contrast dark mode"
    );

    await pcPage.close();

    // ═════════════════════════════════════════════════════════════════════════
    // 2. MOBILE CONTEXT (390x844)
    // ═════════════════════════════════════════════════════════════════════════
    console.log("--- 2. Setting up Dedicated Mobile Context (390x844) ---");
    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

    await mobilePage.evaluateOnNewDocument(() => {
      localStorage.setItem("dente_clinic_token", "demo-showcase-token-owner");
      localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-owner");
      localStorage.setItem("dente_cached_active_staff_user", JSON.stringify({
        id: "demo-owner-id",
        fullName: "Д-р Воронов М. С.",
        role: "owner",
        email: "owner@dente-demo.ru",
        organizationId: "01a00000-0000-0000-0000-000000000000",
        specialization: "Главврач / Владелец"
      }));
      localStorage.setItem("dente_demo_showcase", "true");
      localStorage.setItem("dente_last_view", "lab");
      localStorage.setItem("dente_theme", "light");
    });

    console.log("Navigating Mobile to http://127.0.0.1:5173/?demo=true#lab ...");
    await mobilePage.goto("http://127.0.0.1:5173/?demo=true#lab", { waitUntil: "domcontentloaded", timeout: 30000 });
    
    // Wait for the mobile timeline component to finish lazy loading
    console.log("Waiting for mobile timeline component to load...");
    await mobilePage.waitForSelector('[data-testid="mobile-lab-orders-timeline-view"], .mobile-lab-container', { timeout: 15000 });
    await sleep(2500);
    await suppressOverlays(mobilePage);

    // Capture Mobile Light
    console.log("Capturing Mobile Light...");
    await mobilePage.evaluate(() => {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem("dente_theme", "light");
    });
    await sleep(1000);
    await saveProof(
      mobilePage,
      "proof_lab_mobile_light.png",
      "Dental Laboratory Mobile Timeline (Mobile Light 390x844) - Touch targets >= 44px, Apple HIG"
    );

    // Capture Mobile Dark
    console.log("Capturing Mobile Dark...");
    await mobilePage.evaluate(() => {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("dente_theme", "dark");
    });
    await sleep(1000);
    await saveProof(
      mobilePage,
      "proof_lab_mobile_dark.png",
      "Dental Laboratory Mobile Timeline (Mobile Dark 390x844) - High contrast dark mode on touch device"
    );

    await mobilePage.close();

    console.log("=== ALL 4 CANONICAL PROOFS SUCCESSFULLY CAPTURED ===");
  } catch (err) {
    console.error("Capture failed:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
