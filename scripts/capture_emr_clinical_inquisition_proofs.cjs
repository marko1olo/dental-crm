const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const ARTIFACTS_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\beb92312-c6d7-426d-a438-12dcad022abc";
const LOCAL_DIR = "C:\\Clinic_MVP\\dental-crm\\apps\\web\\public\\screenshots\\clinical_emr";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function captureProofs() {
  console.log("Launching Playwright Chromium (channel: chrome) for EMR Clinical Visual Proofs...");
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  fs.mkdirSync(LOCAL_DIR, { recursive: true });

  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  try {
    const pcContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      isMobile: false
    });
    const page = await pcContext.newPage();
    page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));
    page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));

    // Warm-up / 1. Protocols Catalog - PC Light
    console.log("1. Protocols Catalog - PC Light...");
    await page.goto("http://127.0.0.1:5173/clinical_emr_inquisition_preview.html?view=protocols&theme=light", {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });
    await wait(2500);
    const p1 = path.join(ARTIFACTS_DIR, "proof_emr_protocols_pc_light.png");
    const l1 = path.join(LOCAL_DIR, "proof_emr_protocols_pc_light.png");
    await page.screenshot({ path: p1 });
    await page.screenshot({ path: l1 });
    console.log("Saved:", p1);

    // 2. Clinical Protocols Catalog Modal - PC Dark
    console.log("2. Protocols Catalog - PC Dark...");
    await page.goto("http://127.0.0.1:5173/clinical_emr_inquisition_preview.html?view=protocols&theme=dark", {
      waitUntil: "domcontentloaded",
      timeout: 30000
    });
    await wait(1500);
    const p2 = path.join(ARTIFACTS_DIR, "proof_emr_protocols_pc_dark.png");
    const l2 = path.join(LOCAL_DIR, "proof_emr_protocols_pc_dark.png");
    await page.screenshot({ path: p2 });
    await page.screenshot({ path: l2 });
    console.log("Saved:", p2);

    // 3. Clinical Service Bundles Modal - PC Light
    console.log("3. Service Bundles - PC Light...");
    await page.goto("http://127.0.0.1:5173/clinical_emr_inquisition_preview.html?view=bundles&theme=light", {
      waitUntil: "domcontentloaded",
      timeout: 30000
    });
    await wait(1500);
    const p3 = path.join(ARTIFACTS_DIR, "proof_emr_bundles_pc_light.png");
    const l3 = path.join(LOCAL_DIR, "proof_emr_bundles_pc_light.png");
    await page.screenshot({ path: p3 });
    await page.screenshot({ path: l3 });
    console.log("Saved:", p3);

    // 4. Clinical Service Bundles Modal - PC Dark
    console.log("4. Service Bundles - PC Dark...");
    await page.goto("http://127.0.0.1:5173/clinical_emr_inquisition_preview.html?view=bundles&theme=dark", {
      waitUntil: "domcontentloaded",
      timeout: 30000
    });
    await wait(1500);
    const p4 = path.join(ARTIFACTS_DIR, "proof_emr_bundles_pc_dark.png");
    const l4 = path.join(LOCAL_DIR, "proof_emr_bundles_pc_dark.png");
    await page.screenshot({ path: p4 });
    await page.screenshot({ path: l4 });
    console.log("Saved:", p4);

    // 5. ICD-10 Clinical Selector - PC Light
    console.log("5. ICD-10 Selector - PC Light...");
    await page.goto("http://127.0.0.1:5173/clinical_emr_inquisition_preview.html?view=icd10&theme=light", {
      waitUntil: "domcontentloaded",
      timeout: 30000
    });
    await wait(1500);
    const p5 = path.join(ARTIFACTS_DIR, "proof_emr_icd10_pc_light.png");
    const l5 = path.join(LOCAL_DIR, "proof_emr_icd10_pc_light.png");
    await page.screenshot({ path: p5 });
    await page.screenshot({ path: l5 });
    console.log("Saved:", p5);

    // 6. Clinical Diary Templates Modal - PC Light
    console.log("6. Templates Modal - PC Light...");
    await page.goto("http://127.0.0.1:5173/clinical_emr_inquisition_preview.html?view=templates&theme=light", {
      waitUntil: "domcontentloaded",
      timeout: 30000
    });
    await wait(1500);
    const p6 = path.join(ARTIFACTS_DIR, "proof_emr_templates_pc_light.png");
    const l6 = path.join(LOCAL_DIR, "proof_emr_templates_pc_light.png");
    await page.screenshot({ path: p6 });
    await page.screenshot({ path: l6 });
    console.log("Saved:", p6);

    await pcContext.close();

    // 7. Mobile Viewport (390x844) - Protocols Light & Dark
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true
    });
    const mobPage = await mobileContext.newPage();

    console.log("7. Protocols Catalog - Mobile Light...");
    await mobPage.goto("http://127.0.0.1:5173/clinical_emr_inquisition_preview.html?view=protocols&theme=light", {
      waitUntil: "domcontentloaded",
      timeout: 30000
    });
    await wait(1500);
    const p7 = path.join(ARTIFACTS_DIR, "proof_emr_protocols_mobile_light.png");
    const l7 = path.join(LOCAL_DIR, "proof_emr_protocols_mobile_light.png");
    await mobPage.screenshot({ path: p7 });
    await mobPage.screenshot({ path: l7 });
    console.log("Saved:", p7);

    console.log("8. Protocols Catalog - Mobile Dark...");
    await mobPage.goto("http://127.0.0.1:5173/clinical_emr_inquisition_preview.html?view=protocols&theme=dark", {
      waitUntil: "domcontentloaded",
      timeout: 30000
    });
    await wait(1500);
    const p8 = path.join(ARTIFACTS_DIR, "proof_emr_protocols_mobile_dark.png");
    const l8 = path.join(LOCAL_DIR, "proof_emr_protocols_mobile_dark.png");
    await mobPage.screenshot({ path: p8 });
    await mobPage.screenshot({ path: l8 });
    console.log("Saved:", p8);

    await mobileContext.close();
    console.log("SUCCESS: All 8 EMR clinical visual proofs successfully captured!");
  } catch (err) {
    console.error("Capture error:", err);
  } finally {
    await browser.close();
  }
}

captureProofs();
