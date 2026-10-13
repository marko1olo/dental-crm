const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const { Pool } = require("pg");

const OUT_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/imaging");
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function seedDatabase() {
  console.log("Seeding PostgreSQL 18 demo imaging studies and annotations...");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgres://dental@127.0.0.1:5432/dental_crm",
  });
  try {
    const orgId = "01a00000-0000-0000-0000-000000000000";
    const patientId = "01a00000-0000-0000-0000-000000000001";
    const now = new Date();

    await pool.query("DELETE FROM imaging_viewer_sessions WHERE organization_id = $1", [orgId]);
    await pool.query("DELETE FROM imaging_annotations WHERE organization_id = $1", [orgId]);
    await pool.query("DELETE FROM imaging_studies WHERE organization_id = $1", [orgId]);

    const rvgId = "01a00000-0000-0000-0000-000000000036";
    await pool.query(`
      INSERT INTO imaging_studies (
        id, organization_id, patient_id, kind, title, tooth_code, region,
        captured_at, source_kind, source_name, status, storage_path, ai_summary,
        binding_status, binding_confidence
      ) VALUES (
        $1, $2, $3, 'periapical', $4, '36', '36 нижний левый моляр',
        $5, 'sensor_bridge', 'Vatech EzSensor HD', 'available',
        'radiology/sample_rvg_tooth36_periapical.jpg',
        'Периапикальный очаг разрежения костной ткани в области верхушки дистального корня 36 зуба. Кариес дентина K02.1.',
        'auto_bound', 100
      )
    `, [rvgId, orgId, patientId, "Прицельный RVG снимок зуба 36", now]);

    const cbctId = "01a00000-0000-0000-0000-000000000037";
    await pool.query(`
      INSERT INTO imaging_studies (
        id, organization_id, patient_id, kind, title, tooth_code, region,
        captured_at, source_kind, source_name, status, storage_path, ai_summary,
        binding_status, binding_confidence
      ) VALUES (
        $1, $2, $3, 'cbct', $4, '36', '36-37 область имплантации',
        $5, 'dicom_file', 'Planmeca ProMax 3D Mid', 'available',
        'studies/demo_cbct',
        'Толщина кортикальной пластинки 1.8 мм. Доступная высота кости до нижнечелюстного канала: 14.2 мм.',
        'auto_bound', 100
      )
    `, [cbctId, orgId, patientId, "КЛКТ 3D челюстно-лицевой области (Romexis)", now]);

    await pool.query(`
      INSERT INTO imaging_annotations (
        organization_id, study_id, patient_id, tooth_code,
        annotation_type, coordinates, measurements, notes
      ) VALUES (
        $1, $2, $3, '36',
        'distance',
        $4, $5, $6
      )
    `, [
      orgId,
      rvgId,
      patientId,
      JSON.stringify({ startX: 180, startY: 150, endX: 230, endY: 340 }),
      JSON.stringify({ lengthMm: 19.5, distanceMm: 19.5 }),
      "Рабочая длина дистального корня: 19.5 мм (WL)",
    ]);

    console.log("PostgreSQL 18 database seeded successfully.");
  } finally {
    await pool.end();
  }
}

async function performLogin(page) {
  await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded", timeout: 20000 });
  const demoBtn = await page.waitForSelector(".auth-demo-btn", { timeout: 15000 });
  await demoBtn.click();
  await page.waitForTimeout(800);

  const submitDemoBtn = await page.waitForSelector(".auth-demo-tour-actions .auth-submit-btn", { timeout: 15000 });
  await submitDemoBtn.click();
  await page.waitForTimeout(3000);
}

async function suppressOverlays(page) {
  await page.evaluate(() => {
    const style = document.createElement("style");
    style.id = "audit-suppress-overlays";
    style.innerHTML = `
      .tour-spotlight-root, .shepherd-element, [data-testid="guided-tour-coach-mark-card"], .driver-popover {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  });
}

async function main() {
  console.log("=== Capturing 4 Real X-Ray & Radiology Viewer Proofs ===");
  await seedDatabase();

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-web-security",
      "--js-flags=--max-old-space-size=2048",
    ],
  });

  try {
    // ═══════════════════════════════════════════════════════════════════════
    // 1. PC VIEWPORT (1440x900)
    // ═══════════════════════════════════════════════════════════════════════
    console.log("\n--- Capturing PC Viewport (1440x900) ---");
    const pcContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const pcPage = await pcContext.newPage();

    await performLogin(pcPage);

    console.log("Navigating PC to #imaging...");
    await pcPage.goto("http://127.0.0.1:5173/#imaging", { waitUntil: "domcontentloaded", timeout: 20000 });
    await pcPage.waitForTimeout(3000);
    await suppressOverlays(pcPage);

    // Select the 2D RVG study to ensure 2D viewer with ShadowAnalyst is active
    const selectBtn = await pcPage.$(".imaging-row .imaging-row-select");
    if (selectBtn) {
      const btnText = await selectBtn.innerText();
      if (btnText !== "Выбрано") {
        console.log("Clicking first study select button...");
        await selectBtn.click();
        await pcPage.waitForTimeout(1500);
      }
    }

    // Capture PC Light
    console.log("Setting theme: light");
    await pcPage.evaluate(() => {
      localStorage.setItem("dente_theme_mode", "light");
      document.documentElement.setAttribute("data-theme", "light");
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
      document.body.setAttribute("data-theme", "light");
      document.body.classList.add("light");
      document.body.classList.remove("dark");
    });
    await pcPage.waitForTimeout(1000);

    const pcLightPath = path.join(OUT_DIR, "xray_viewer_pc_light.png");
    await pcPage.screenshot({ path: pcLightPath });
    const pcLightSize = fs.statSync(pcLightPath).size;
    console.log(`[SAVED] xray_viewer_pc_light.png: ${(pcLightSize / 1024).toFixed(1)} KB`);

    // Capture PC Dark
    console.log("Setting theme: dark");
    await pcPage.evaluate(() => {
      localStorage.setItem("dente_theme_mode", "dark");
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      document.body.setAttribute("data-theme", "dark");
      document.body.classList.add("dark");
      document.body.classList.remove("light");
    });
    await pcPage.waitForTimeout(1000);

    const pcDarkPath = path.join(OUT_DIR, "xray_viewer_pc_dark.png");
    await pcPage.screenshot({ path: pcDarkPath });
    const pcDarkSize = fs.statSync(pcDarkPath).size;
    console.log(`[SAVED] xray_viewer_pc_dark.png: ${(pcDarkSize / 1024).toFixed(1)} KB`);

    await pcContext.close();

    // ═══════════════════════════════════════════════════════════════════════
    // 2. MOBILE VIEWPORT (390x844) Apple iPhone HIG
    // ═══════════════════════════════════════════════════════════════════════
    console.log("\n--- Capturing Mobile Viewport (390x844) ---");
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    });
    const mobilePage = await mobileContext.newPage();

    await performLogin(mobilePage);

    console.log("Navigating Mobile to #imaging...");
    await mobilePage.goto("http://127.0.0.1:5173/#imaging", { waitUntil: "domcontentloaded", timeout: 20000 });
    await mobilePage.waitForTimeout(3000);
    await suppressOverlays(mobilePage);

    // Capture Mobile Light
    console.log("Setting mobile theme: light");
    await mobilePage.evaluate(() => {
      localStorage.setItem("dente_theme_mode", "light");
      document.documentElement.setAttribute("data-theme", "light");
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
      document.body.setAttribute("data-theme", "light");
      document.body.classList.add("light");
      document.body.classList.remove("dark");
    });
    await mobilePage.waitForTimeout(1000);

    const mobileLightPath = path.join(OUT_DIR, "xray_viewer_mobile_light.png");
    await mobilePage.screenshot({ path: mobileLightPath });
    const mobileLightSize = fs.statSync(mobileLightPath).size;
    console.log(`[SAVED] xray_viewer_mobile_light.png: ${(mobileLightSize / 1024).toFixed(1)} KB`);

    // Capture Mobile Dark
    console.log("Setting mobile theme: dark");
    await mobilePage.evaluate(() => {
      localStorage.setItem("dente_theme_mode", "dark");
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      document.body.setAttribute("data-theme", "dark");
      document.body.classList.add("dark");
      document.body.classList.remove("light");
    });
    await mobilePage.waitForTimeout(1000);

    const mobileDarkPath = path.join(OUT_DIR, "xray_viewer_mobile_dark.png");
    await mobilePage.screenshot({ path: mobileDarkPath });
    const mobileDarkSize = fs.statSync(mobileDarkPath).size;
    console.log(`[SAVED] xray_viewer_mobile_dark.png: ${(mobileDarkSize / 1024).toFixed(1)} KB`);

    await mobileContext.close();

    console.log("\n=== Screenshot Verification Summary ===");
    const results = [
      { name: "xray_viewer_pc_light.png", size: pcLightSize, path: pcLightPath },
      { name: "xray_viewer_pc_dark.png", size: pcDarkSize, path: pcDarkPath },
      { name: "xray_viewer_mobile_light.png", size: mobileLightSize, path: mobileLightPath },
      { name: "xray_viewer_mobile_dark.png", size: mobileDarkSize, path: mobileDarkPath },
    ];

    let allPass = true;
    for (const r of results) {
      const kb = (r.size / 1024).toFixed(1);
      const pass = r.size > 40 * 1024;
      if (!pass) allPass = false;
      console.log(`- ${r.name}: ${kb} KB [${pass ? "PASS >40KB" : "FAIL <40KB"}]`);
    }

    if (!allPass) {
      console.error("FAILED: One or more screenshots were smaller than 40 KB.");
      process.exit(1);
    }

    console.log("ALL 4 SCREENSHOTS SUCCESSFULLY VERIFIED AND PASS >40KB REQUIREMENT!");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
