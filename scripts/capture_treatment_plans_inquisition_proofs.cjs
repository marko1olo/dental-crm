/**
 * scripts/capture_treatment_plans_inquisition_proofs.cjs
 *
 * RED TEAM VISUAL PROOF CAPTURE: TREATMENT PLANS & COMMERCIAL PROPOSALS
 * Captures 3 canonical visual proofs at 1440x900 PC Desktop:
 * 1. docs/screenshots/treatment_plans/treatment_plan_roadmap_pc_light.png
 * 2. docs/screenshots/treatment_plans/treatment_plan_roadmap_pc_dark.png
 * 3. docs/screenshots/treatment_plans/treatment_plan_presenter_print_light.png
 */

const { chromium } = require("playwright");
const { spawn } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");
const http = require("node:http");

const BRAIN_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\af800c1e-80fe-4a28-987d-afddc8f87d36";
const DOCS_DIR = path.resolve(__dirname, "../docs/screenshots/treatment_plans");

if (!fs.existsSync(DOCS_DIR)) {
  fs.mkdirSync(DOCS_DIR, { recursive: true });
}
if (!fs.existsSync(BRAIN_DIR)) {
  fs.mkdirSync(BRAIN_DIR, { recursive: true });
}

function checkPort(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const req = http.get(`http://${host}:${port}/treatment_plan_roadmap_preview.html`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const ok = await new Promise((res) => {
        const req = http.get(url, (response) => {
          res(response.statusCode >= 200 && response.statusCode < 400);
        });
        req.on("error", () => res(false));
        req.setTimeout(1200, () => {
          req.destroy();
          res(false);
        });
      });
      if (ok) return true;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 600));
  }
  throw new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`);
}

function computeMd5(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash("md5").update(buf).digest("hex");
}

async function takeProof(page, filename, description) {
  const primaryPath = path.join(DOCS_DIR, filename);
  const brainPath = path.join(BRAIN_DIR, filename);

  await page.screenshot({ path: primaryPath, fullPage: false });
  fs.copyFileSync(primaryPath, brainPath);

  const stats = fs.statSync(primaryPath);
  const hash = computeMd5(primaryPath);

  console.log(`\n📸 CAPTURED PROOF: ${filename}`);
  console.log(`   Description: ${description}`);
  console.log(`   Size: ${Math.round(stats.size / 1024)} KB (${stats.size} bytes)`);
  console.log(`   MD5:  ${hash}`);
  console.log(`   Path: ${primaryPath}`);

  return { filename, primaryPath, brainPath, size: stats.size, hash, description };
}

async function configureTheme(page, mode = "light") {
  await page.evaluate((themeMode) => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(themeMode);
    document.documentElement.setAttribute("data-theme", themeMode);
    document.body.className = `theme-${themeMode} bg-[var(--paper)] text-[var(--ink)] antialiased min-h-screen`;
    localStorage.setItem("dente_theme_mode", themeMode);
  }, mode);
  await page.waitForTimeout(400);
}

async function main() {
  console.log("==================================================================");
  console.log("RED TEAM PLAYWRIGHT SCREENSHOT CAPTURE: TREATMENT PLANS INQUISITION");
  console.log("==================================================================");

  let viteProcess = null;
  let activePort = 5173;

  const is5173 = await checkPort(5173);
  const is5174 = await checkPort(5174);

  if (is5174) {
    activePort = 5174;
    console.log(`>>> Detected active frontend server on port: ${activePort}`);
  } else if (is5173) {
    activePort = 5173;
    console.log(`>>> Detected active frontend server on port: ${activePort}`);
  } else {
    activePort = 5173;
    console.log(`>>> No active server found. Spawning Vite on port ${activePort}...`);
    const viteBin = path.resolve(__dirname, "../node_modules/vite/bin/vite.js");
    const webDir = path.resolve(__dirname, "../apps/web");

    viteProcess = spawn("node", [viteBin, "--host", "127.0.0.1", "--port", "5173"], {
      cwd: webDir,
      stdio: "inherit",
      shell: true,
    });

    await waitForServer(`http://127.0.0.1:${activePort}/treatment_plan_roadmap_preview.html`);
    console.log(`>>> Vite dev server ready on http://127.0.0.1:${activePort}/`);
  }

  let browser;
  try {
    browser = await chromium.launch({
      channel: "msedge",
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  } catch (e) {
    console.log(">>> Falling back to standard chromium launch...");
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }

  const proofs = [];

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1.5,
    });

    const page = await context.newPage();

    // ─── 1. Дорожная карта плана лечения: PC Light ───
    console.log(`\n>>> Step 1: Navigating to Roadmap Light (port ${activePort})...`);
    await page.goto(`http://127.0.0.1:${activePort}/treatment_plan_roadmap_preview.html?view=roadmap&theme=light`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await configureTheme(page, "light");
    await page.waitForSelector('[data-testid="treatment-preview-root"]', { timeout: 15000 });
    await page.waitForTimeout(600);

    const p1 = await takeProof(
      page,
      "treatment_plan_roadmap_pc_light.png",
      "Дорожная карта плана лечения PC Light: клинические цели, сроки, гарантии, прогресс этапов без эмодзи"
    );
    proofs.push(p1);

    // ─── 2. Дорожная карта плана лечения: PC Dark ───
    console.log("\n>>> Step 2: Navigating to Roadmap Dark...");
    await page.goto(`http://127.0.0.1:${activePort}/treatment_plan_roadmap_preview.html?view=roadmap&theme=dark`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await configureTheme(page, "dark");
    await page.waitForSelector('[data-testid="treatment-preview-root"]', { timeout: 15000 });
    await page.waitForTimeout(600);

    const p2 = await takeProof(
      page,
      "treatment_plan_roadmap_pc_dark.png",
      "Дорожная карта плана лечения PC Dark: глубокая тёмная тема, высокая контрастность, валидные дизайн-токены var(--paper-soft) и var(--line)"
    );
    proofs.push(p2);

    // ─── 3. Печатная смета для пациента / Приложение №1: PC Light ───
    console.log("\n>>> Step 3: Navigating to Presenter Print View Light...");
    await page.goto(`http://127.0.0.1:${activePort}/treatment_plan_roadmap_preview.html?view=print&theme=light`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await configureTheme(page, "light");
    await page.waitForSelector('[data-testid="print-view-wrapper"]', { timeout: 15000 });
    await page.waitForSelector('[data-testid="appendix-print-document"]', { timeout: 15000 });
    await page.waitForTimeout(600);

    const p3 = await takeProof(
      page,
      "treatment_plan_presenter_print_light.png",
      "Печатная форма сметы (Приложение №1 к Договору) Light: юридические реквизиты, этапы, суммы в рублях и копейках, святость бланков без эмодзи"
    );
    proofs.push(p3);

    console.log("\n==================================================================");
    console.log(`✅ All ${proofs.length} screenshots successfully captured!`);
    console.log("==================================================================");
  } finally {
    await browser.close();
    if (viteProcess) {
      console.log(">>> Shutting down spawned Vite dev server...");
      viteProcess.kill();
    }
  }
}

main().catch((err) => {
  console.error("FATAL ERROR during capture:", err);
  process.exit(1);
});
