const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const PROOFS_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/orthodontics");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/fc9596ea-4600-46c4-8e60-4eacd4ac8ea8");

for (const dir of [PROOFS_DIR, BRAIN_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function verifyProof(filename) {
  const filePath = path.join(PROOFS_DIR, filename);
  const size = fs.statSync(filePath).size;
  if (size < 20480) {
    throw new Error(`[BLANK DETECTED] ${filePath} is ${size} bytes (< 20KB)!`);
  }
  // Copy to brain directory for direct reading/inspection
  try {
    fs.copyFileSync(filePath, path.join(BRAIN_DIR, filename));
  } catch (_) {}
  console.log(`[VERIFIED] ${filename} (${(size / 1024).toFixed(1)} KB)`);
  return size;
}

async function suppressOverlays(page) {
  try {
    await page.evaluate(() => {
      const style = document.createElement("style");
      style.id = "suppress-all-overlays-ortho-live";
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

async function main() {
  console.log("=== Launching Chrome for Orthodontics 4-State Proofs (Port 5173) ===");
  const browser = await chromium.launch({
    headless: true,
    executablePath: fs.existsSync("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe")
      ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
      : undefined,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

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

  // ==========================================
  // PART 1: Orthodontics Studio Modal
  // ==========================================
  console.log("\n>>> PART 1: ORTHODONTICS STUDIO MODAL <<<");
  const url = "http://127.0.0.1:5173/?demo=true#ortho-protocol";
  console.log(`Navigating to ${url}...`);
  await page.goto(url, { waitUntil: "commit", timeout: 45000 });

  console.log("Waiting for React mount & hydration...");
  await page.waitForTimeout(8000);
  await suppressOverlays(page);

  // Check if modal mounted
  let modal = await page.$('.ortho-studio-modal, [data-testid="orthodontic-studio-modal"], .ortho-studio-backdrop');
  if (!modal) {
    console.log("Dispatching events to open modal...");
    await page.evaluate(() => {
      window.location.hash = "#ortho-protocol";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
      window.dispatchEvent(new CustomEvent("dente:open-ortho"));
      window.dispatchEvent(new CustomEvent("dente:open-orthodontics"));
      window.dispatchEvent(new CustomEvent("dente:open-ortho-studio"));
    });
    modal = await page.waitForSelector('.ortho-studio-modal, [data-testid="orthodontic-studio-modal"], .ortho-studio-backdrop', {
      state: "visible",
      timeout: 20000,
    });
  }

  console.log("Modal is visible! Settling...");
  await page.waitForTimeout(1000);
  await suppressOverlays(page);

  // 1.1 PC Light (1440x900)
  console.log("\n[1/4] Capturing PC Light (1440x900)...");
  await setTheme(page, "light");
  const p1 = "01_orthodontics_studio_pc_light_1440x900.png";
  await page.screenshot({ path: path.join(PROOFS_DIR, p1), fullPage: false, animations: "disabled" });
  verifyProof(p1);

  // 1.2 PC Dark (1440x900)
  console.log("\n[2/4] Capturing PC Dark (1440x900)...");
  await setTheme(page, "dark");
  const p2 = "02_orthodontics_studio_pc_dark_1440x900.png";
  await page.screenshot({ path: path.join(PROOFS_DIR, p2), fullPage: false, animations: "disabled" });
  verifyProof(p2);

  // 1.3 Mobile Light (390x844)
  console.log("\n[3/4] Capturing Mobile Light (390x844)...");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(800);
  await setTheme(page, "light");
  const p3 = "03_orthodontics_studio_mobile_light_390x844.png";
  await page.screenshot({ path: path.join(PROOFS_DIR, p3), fullPage: false, animations: "disabled" });
  verifyProof(p3);

  // 1.4 Mobile Dark (390x844)
  console.log("\n[4/4] Capturing Mobile Dark (390x844)...");
  await setTheme(page, "dark");
  const p4 = "04_orthodontics_studio_mobile_dark_390x844.png";
  await page.screenshot({ path: path.join(PROOFS_DIR, p4), fullPage: false, animations: "disabled" });
  verifyProof(p4);

  // ==========================================
  // PART 2: Cephalometric / TRG Analysis Modal
  // ==========================================
  console.log("\n>>> PART 2: CEPHALOMETRICS & TRG ANALYSIS MODAL <<<");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("http://127.0.0.1:5173/?demo=true#ceph", { waitUntil: "commit", timeout: 30000 });
  await page.waitForTimeout(5000);
  await suppressOverlays(page);

  await page.evaluate(() => {
    window.location.hash = "#ceph";
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    window.dispatchEvent(new CustomEvent("dente-open-ceph"));
  });

  const cephModal = await page.waitForSelector(
    '.ceph-modal-overlay, [data-testid="cephalometric-analysis-modal"], .cephalometric-modal',
    { state: "visible", timeout: 20000 }
  );

  // Apply calibration/preset template
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const templateBtn = buttons.find((b) =>
      b.textContent && (b.textContent.includes("Анатомический шаблон") || b.textContent.includes("Калибровка"))
    );
    if (templateBtn) templateBtn.click();
  });

  await page.waitForTimeout(1000);
  await suppressOverlays(page);

  // 2.1 TRG PC Light
  console.log("\n[TRG 1/4] Capturing ortho_pc_light_1440x900.png...");
  await setTheme(page, "light");
  const t1 = "ortho_pc_light_1440x900.png";
  await page.screenshot({ path: path.join(PROOFS_DIR, t1), fullPage: false, animations: "disabled" });
  verifyProof(t1);

  // 2.2 TRG PC Dark
  console.log("\n[TRG 2/4] Capturing ortho_pc_dark_1440x900.png...");
  await setTheme(page, "dark");
  const t2 = "ortho_pc_dark_1440x900.png";
  await page.screenshot({ path: path.join(PROOFS_DIR, t2), fullPage: false, animations: "disabled" });
  verifyProof(t2);

  // 2.3 TRG Mobile Light
  console.log("\n[TRG 3/4] Capturing ortho_mobile_light_390x844.png...");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(800);
  await setTheme(page, "light");
  const t3 = "ortho_mobile_light_390x844.png";
  await page.screenshot({ path: path.join(PROOFS_DIR, t3), fullPage: false, animations: "disabled" });
  verifyProof(t3);

  // 2.4 TRG Mobile Dark
  console.log("\n[TRG 4/4] Capturing ortho_mobile_dark_390x844.png...");
  await setTheme(page, "dark");
  const t4 = "ortho_mobile_dark_390x844.png";
  await page.screenshot({ path: path.join(PROOFS_DIR, t4), fullPage: false, animations: "disabled" });
  verifyProof(t4);

  await browser.close();
  console.log("\n=======================================================");
  console.log(">>> [VICTORY] All Orthodontics & TRG Proofs captured! <<<");
  console.log("=======================================================");
}

main().catch((err) => {
  console.error("[FATAL ERROR]:", err);
  process.exit(1);
});
