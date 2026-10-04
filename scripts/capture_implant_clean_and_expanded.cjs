const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const targetDirs = [
  path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/inquisition_live"),
  path.resolve("C:/Users/Admin/.gemini/antigravity/brain/5cbdd8b0-1a44-41e4-8bbf-039b9627b5ad"),
];

for (const d of targetDirs) {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
  }
}

async function setupPageRoutes(page) {
  await page.route("**/api/**", async (route) => {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });
}

const addAuthInitScript = (ctx) =>
  ctx.addInitScript(() => {
    localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
    localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_theme_mode", "light");
    localStorage.setItem("dente_active_patient_id", "demo_cbct_patient");
    localStorage.setItem("dente_tour_completed", "true");
  });

async function applyTheme(page, theme) {
  console.log(`[THEME] Applying ${theme}...`);
  await page.evaluate((th) => {
    localStorage.setItem("dente_theme_mode", th);
    document.documentElement.setAttribute("data-theme", th);
    document.body.setAttribute("data-theme", th);
    const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(th);
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("light", !isDark);
    document.body.classList.toggle("dark", isDark);
    document.body.classList.toggle("light", !isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  }, theme);
  await page.waitForTimeout(800);
}

async function takeScreen(page, fileName, description) {
  const p1 = path.join(targetDirs[0], fileName);
  if (fs.existsSync(p1)) {
    try { fs.unlinkSync(p1); } catch {}
  }
  await page.screenshot({ path: p1, fullPage: false, animations: "disabled", timeout: 30000 });
  for (let i = 1; i < targetDirs.length; i++) {
    fs.copyFileSync(p1, path.join(targetDirs[i], fileName));
  }
  const stat = fs.statSync(p1);
  console.log(`[CAPTURED] ${fileName} (${description}) — ${(stat.size / 1024).toFixed(1)} KB`);
}

async function main() {
  console.log("=== STARTING AUTONOMOUS CAPTURE OF IMPLANT WORKSPACE (DOCTOR AUTONOMY MANDATE 8e) ===");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    await addAuthInitScript(ctx);
    const page = await ctx.newPage();

    page.on("pageerror", (err) => console.error("[BROWSER ERROR]:", err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") console.error("[BROWSER CONSOLE ERROR]:", msg.text());
    });

    await setupPageRoutes(page);

    console.log("Navigating to http://127.0.0.1:5173/?cbct=demo...");
    await page.goto("http://127.0.0.1:5173/?cbct=demo", { waitUntil: "domcontentloaded", timeout: 30000 });

    console.log("Waiting for CBCT Studio modal...");
    try {
      await page.waitForSelector('[data-testid="cbct-studio-modal"]', { timeout: 25000 });
      console.log("CBCT Studio modal mounted successfully!");
    } catch (e) {
      console.log("WAIT MODAL FAILED. Current URL:", page.url());
      const bodyHtml = await page.content();
      console.log("HTML length:", bodyHtml.length);
      console.log("HTML snippet:", bodyHtml.slice(0, 500));
      await page.screenshot({ path: "scripts/failed_modal.png" });
      throw e;
    }

    // Wait for demo volume slices to finish decoding
    console.log("Waiting for slices to decode...");
    await page.waitForSelector("text=Загрузка центрального среза", { state: "detached", timeout: 45000 }).catch(() => {
      console.log("Loader detached or already completed.");
    });

    console.log("Waiting 3 seconds for canvas rasterization...");
    await page.waitForTimeout(3000);

    // Switch to Implant tab
    console.log("Switching to Implant Studio tab...");
    const implantTab = await page.waitForSelector(
      '[data-testid="cbct-nav-tab-implant"], [data-mode-testid="cbct-mode-implant-btn"]',
      { timeout: 15000 }
    );
    await implantTab.click();
    await page.waitForSelector(
      '[data-testid="cbct-workspace-implant-root"], [data-testid="cbct-implant-surgeon-station-panel"]',
      { timeout: 20000 }
    );
    await page.waitForTimeout(2000);

    const themes = ["light", "dark"];

    for (const theme of themes) {
      console.log(`\n==================================================`);
      console.log(`>>> PROCESSING THEME: ${theme.toUpperCase()} <<<`);
      console.log(`==================================================`);

      await applyTheme(page, theme);

      // 1. Clean Uncluttered Doctor Cockpit (Assistant Accordion Closed)
      console.log(`Capturing Clean Workspace (${theme})...`);
      await takeScreen(
        page,
        `proof_implant_workspace_${theme}_clean.png`,
        `Станция имплантолога: чистый лаконичный вид, нулевая перегрузка ИИ (Мандат 8e) — ${theme}`
      );

      // 2. Expand Clinical AI Assistant Accordion
      console.log(`Expanding Clinical AI Assistant Accordion (${theme})...`);
      const accordionSummary = await page.waitForSelector(
        '[data-testid="cbct-implant-ai-assistant-accordion"] summary',
        { timeout: 10000 }
      );
      await accordionSummary.click();
      await page.waitForTimeout(1000);

      // Verify that Misch HUD and Nerve badge are visible in expanded state
      await page.waitForSelector('[data-testid="cbct-implant-live-telemetry-hud"]', { timeout: 8000 });
      await page.waitForSelector('[data-testid="cbct-implant-nerve-safety-badge"]', { timeout: 8000 });

      console.log(`Capturing Expanded Telemetry (${theme})...`);
      await takeScreen(
        page,
        `proof_implant_workspace_${theme}_expanded.png`,
        `Станция имплантолога: раскрытый опциональный ИИ-ассистент (Миш D1-D5, торк, сверление, IAN нерв) — ${theme}`
      );

      // Close accordion back
      await accordionSummary.click();
      await page.waitForTimeout(500);
    }

    console.log("\nALL PROOF SCREENSHOTS CAPTURED AND VERIFIED SUCCESSFULLY!");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR IN CAPTURE SCRIPT:", err);
  process.exit(1);
});
