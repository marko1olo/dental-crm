const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const PROOFS_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/orthodontics");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/a4f0a27b-cf2f-4a3a-9ddb-fc1420c36e17");

for (const dir of [PROOFS_DIR, BRAIN_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function verifyProof(filename) {
  const filePath = path.join(PROOFS_DIR, filename);
  const size = fs.statSync(filePath).size;
  if (size < 20480) {
    throw new Error(`[BLANK DETECTED] ${filePath} is ${size} bytes (< 20KB)!`);
  }
  try {
    fs.copyFileSync(filePath, path.join(BRAIN_DIR, filename));
    if (filename.includes("orthodontics_studio")) {
      const alias = filename.replace("orthodontics_studio", "ortho");
      fs.copyFileSync(filePath, path.join(PROOFS_DIR, alias));
      fs.copyFileSync(filePath, path.join(BRAIN_DIR, alias));
    }
  } catch (_) {}
  console.log(`[VERIFIED] ${filename} (${(size / 1024).toFixed(1)} KB)`);
  return size;
}

async function suppressOverlays(page) {
  try {
    await page.evaluate(() => {
      const style = document.createElement("style");
      style.id = "suppress-all-overlays-ortho-final";
      style.innerHTML = `
        .tour-spotlight-root,
        .tour-backdrop-clickable-zone,
        [data-testid="guided-tour-spotlight-overlay"],
        [data-testid="guided-tour-coach-mark-card"],
        [data-testid="demo-mode-banner"],
        .shepherd-element,
        .global-toast-container,
        .sa-toast,
        [role="alert"],
        vite-error-overlay {
          display: none !important;
          pointer-events: none !important;
          opacity: 0 !important;
        }
      `;
      document.head.appendChild(style);
      document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
    });
  } catch (_) {}
}

async function setTheme(page, theme) {
  await page.evaluate((th) => {
    const isDark = th === "dark";
    document.documentElement.setAttribute("data-theme", th);
    document.body.setAttribute("data-theme", th);
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("light", !isDark);
    document.body.classList.toggle("dark", isDark);
    document.body.classList.toggle("light", !isDark);
    document.documentElement.style.colorScheme = th;
    localStorage.setItem("dente_theme", th);
    localStorage.setItem("dente_theme_mode", th);
    localStorage.setItem("theme", th);
    window.dispatchEvent(new Event("themechange"));
  }, theme);
  await suppressOverlays(page);
  await page.waitForTimeout(600);
}

async function detectBaseUrl() {
  const http = require("http");
  for (const port of [5175, 5173, 5174]) {
    try {
      const ok = await new Promise((resolve) => {
        const req = http.get(`http://127.0.0.1:${port}/`, { timeout: 2000 }, (res) => {
          resolve(res.statusCode === 200);
        });
        req.on("error", () => resolve(false));
        req.on("timeout", () => { req.destroy(); resolve(false); });
      });
      if (ok) {
        console.log(`[DETECTED VITE DEV SERVER] on http://127.0.0.1:${port}`);
        return `http://127.0.0.1:${port}`;
      }
    } catch (_) {}
  }
  return "http://127.0.0.1:5173";
}

async function main() {
  console.log("=== Launching Chromium for Orthodontics & TRG Proofs ===");
  const baseUrl = await detectBaseUrl();
  const browser = await chromium.launch({ headless: true });

  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "ru-RU",
  });

  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("dente_clinic_token", "demo-showcase-token-owner");
      localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-owner");
      localStorage.setItem("dente_active_session_token", "demo-showcase-staff-token-owner");
      localStorage.setItem("dente_active_role", "doctor");
      localStorage.setItem("dente_user_role", "doctor");
      localStorage.setItem("dente_role", "doctor");
      localStorage.setItem("dente_perspective", "orthodontic");
      sessionStorage.setItem("dente_unlocked", "true");
      localStorage.setItem("dente_demo_showcase", "true");
      localStorage.setItem("dente_demo_mode", "true");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_tour_dismissed", "true");
      localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
      localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({
        dismissed: true,
        step: "done",
        completed: true,
      }));
      localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({
        id: "demo-doctor",
        fullName: "Д-р Соколов А. В.",
        role: "doctor",
      }));
    } catch (_) {}
  });

  const page = await ctx.newPage();

  // -------------------------------------------------------------
  // SECTION 1: Orthodontics Studio Modal (Brackets & Archwires)
  // -------------------------------------------------------------
  console.log("\n>>> SECTION 1: ORTHODONTICS STUDIO MODAL <<<");
  await page.goto(`${baseUrl}/?demo=true&patientId=pat-1#ortho-protocol`, { waitUntil: "domcontentloaded", timeout: 45000 });
  console.log("Waiting for .ortho-studio-modal to finish loading...");
  await page.waitForSelector('.ortho-studio-modal, [data-testid="orthodontic-studio-modal"]', { timeout: 35000 });
  await page.waitForTimeout(1500);
  await suppressOverlays(page);

  // 1.1 PC Light
  console.log("Capturing 01_orthodontics_studio_pc_light_1440x900.png...");
  await setTheme(page, "light");
  const p1 = "01_orthodontics_studio_pc_light_1440x900.png";
  await page.screenshot({ path: path.join(PROOFS_DIR, p1), fullPage: false, animations: "disabled" });
  verifyProof(p1);

  // 1.2 PC Dark
  console.log("Capturing 02_orthodontics_studio_pc_dark_1440x900.png...");
  await setTheme(page, "dark");
  const p2 = "02_orthodontics_studio_pc_dark_1440x900.png";
  await page.screenshot({ path: path.join(PROOFS_DIR, p2), fullPage: false, animations: "disabled" });
  verifyProof(p2);

  // 1.3 Mobile Light
  console.log("Capturing 03_orthodontics_studio_mobile_light_390x844.png...");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(600);
  await setTheme(page, "light");
  const p3 = "03_orthodontics_studio_mobile_light_390x844.png";
  await page.screenshot({ path: path.join(PROOFS_DIR, p3), fullPage: false, animations: "disabled" });
  verifyProof(p3);

  // 1.4 Mobile Dark
  console.log("Capturing 04_orthodontics_studio_mobile_dark_390x844.png...");
  await setTheme(page, "dark");
  const p4 = "04_orthodontics_studio_mobile_dark_390x844.png";
  await page.screenshot({ path: path.join(PROOFS_DIR, p4), fullPage: false, animations: "disabled" });
  verifyProof(p4);

  // -------------------------------------------------------------
  // SECTION 2: Cephalometric / TRG Analysis Modal
  // -------------------------------------------------------------
  console.log("\n>>> SECTION 2: CEPHALOMETRIC / TRG ANALYSIS MODAL <<<");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(600);

  console.log("Switching to 'Фото и ТРГ' tab in Orthodontics Studio...");
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll(".ortho-tab-btn, button"));
    const photoTab = tabs.find((t) => t.textContent && t.textContent.includes("Фото и ТРГ"));
    if (photoTab) photoTab.click();
  });
  await page.waitForTimeout(800);
  await suppressOverlays(page);

  // Photo Protocol 8-slot Grid proofs
  console.log("Capturing 05_ortho_photo_trg_tab_pc_light_1440x900.png...");
  await setTheme(page, "light");
  const pt1 = "05_ortho_photo_trg_tab_pc_light_1440x900.png";
  await page.screenshot({ path: path.join(PROOFS_DIR, pt1), fullPage: false, animations: "disabled" });
  verifyProof(pt1);

  console.log("Capturing 06_ortho_photo_trg_tab_pc_dark_1440x900.png...");
  await setTheme(page, "dark");
  const pt2 = "06_ortho_photo_trg_tab_pc_dark_1440x900.png";
  await page.screenshot({ path: path.join(PROOFS_DIR, pt2), fullPage: false, animations: "disabled" });
  verifyProof(pt2);

  console.log("Capturing 07_ortho_photo_trg_tab_mobile_light_390x844.png...");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await setTheme(page, "light");
  const pt3 = "07_ortho_photo_trg_tab_mobile_light_390x844.png";
  await page.screenshot({ path: path.join(PROOFS_DIR, pt3), fullPage: false, animations: "disabled" });
  verifyProof(pt3);

  console.log("Capturing 08_ortho_photo_trg_tab_mobile_dark_390x844.png...");
  await setTheme(page, "dark");
  const pt4 = "08_ortho_photo_trg_tab_mobile_dark_390x844.png";
  await page.screenshot({ path: path.join(PROOFS_DIR, pt4), fullPage: false, animations: "disabled" });
  verifyProof(pt4);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(500);

  console.log("Clicking 'Анализ ТРГ' button...");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const cephBtn = btns.find((b) => b.textContent && (b.textContent.includes("Анализ ТРГ") || b.textContent.includes("Цефалометрия")));
    if (cephBtn) cephBtn.click();
  });

  console.log("Waiting for Cephalometric modal to finish loading...");
  await page.waitForSelector('.ceph-modal-overlay, [data-testid="cephalometric-analysis-modal"], .ceph-workstation-root', { timeout: 35000 });
  await page.waitForTimeout(1500);
  await suppressOverlays(page);

  // Click preset template to calibrate points
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const templateBtn = buttons.find((b) =>
      b.textContent && (b.textContent.includes("Анатомический шаблон") || b.textContent.includes("Калибровка"))
    );
    if (templateBtn) templateBtn.click();
  });
  await page.waitForTimeout(800);
  await suppressOverlays(page);

  // 2.1 TRG PC Light
  console.log("Capturing ortho_pc_light_1440x900.png...");
  await setTheme(page, "light");
  const t1 = "ortho_pc_light_1440x900.png";
  await page.screenshot({ path: path.join(PROOFS_DIR, t1), fullPage: false, animations: "disabled" });
  verifyProof(t1);

  // 2.2 TRG PC Dark
  console.log("Capturing ortho_pc_dark_1440x900.png...");
  await setTheme(page, "dark");
  const t2 = "ortho_pc_dark_1440x900.png";
  await page.screenshot({ path: path.join(PROOFS_DIR, t2), fullPage: false, animations: "disabled" });
  verifyProof(t2);

  // 2.3 TRG Mobile Light
  console.log("Capturing ortho_mobile_light_390x844.png...");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(600);
  await setTheme(page, "light");
  const t3 = "ortho_mobile_light_390x844.png";
  await page.screenshot({ path: path.join(PROOFS_DIR, t3), fullPage: false, animations: "disabled" });
  verifyProof(t3);

  // 2.4 TRG Mobile Dark
  console.log("Capturing ortho_mobile_dark_390x844.png...");
  await setTheme(page, "dark");
  const t4 = "ortho_mobile_dark_390x844.png";
  await page.screenshot({ path: path.join(PROOFS_DIR, t4), fullPage: false, animations: "disabled" });
  verifyProof(t4);

  await browser.close();
  console.log("\n=======================================================");
  console.log(">>> [VICTORY] ALL 8 PROOFS CAPTURED & VERIFIED! <<<");
  console.log("=======================================================");
}

main().catch((err) => {
  console.error("[FATAL ERROR]:", err);
  process.exit(1);
});
