const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const OUT_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/patient_portal");
fs.mkdirSync(OUT_DIR, { recursive: true });

const BASE_URL = "http://127.0.0.1:5173/portal_preview.html";

async function run() {
  console.log("[Playwright] Launching browser...");
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
  });

  const targets = [
    // 1. Desktop Light - Overview & Next Visit & Quick Actions
    {
      name: "01_portal_pc_light_overview.png",
      viewport: { width: 1440, height: 900 },
      url: `${BASE_URL}?theme=light&tab=overview`,
      waitMs: 1000,
    },
    // 2. Desktop Dark - Overview & Next Visit & Quick Actions
    {
      name: "02_portal_pc_dark_overview.png",
      viewport: { width: 1440, height: 900 },
      url: `${BASE_URL}?theme=dark&tab=overview`,
      waitMs: 1000,
    },
    // 3. Mobile Light (390x844) - Overview & Next Visit & 1-Tap Booking
    {
      name: "03_portal_mobile_light_overview.png",
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      url: `${BASE_URL}?theme=light&tab=overview`,
      waitMs: 1000,
    },
    // 4. Mobile Dark (390x844) - Overview & Dark Mode Contrast
    {
      name: "04_portal_mobile_dark_overview.png",
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      url: `${BASE_URL}?theme=dark&tab=overview`,
      waitMs: 1000,
    },
    // 5. Mobile Light - 1-Tap Booking Bottom Sheet (iOS HIG)
    {
      name: "05_portal_mobile_light_booking_sheet.png",
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      url: `${BASE_URL}?theme=light&tab=overview&sheet=booking`,
      waitMs: 1200,
    },
    // 6. Mobile Light - Treatment Plan & Odontogram
    {
      name: "06_portal_mobile_light_treatment_plan.png",
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      url: `${BASE_URL}?theme=light&tab=plans`,
      waitMs: 1000,
    },
    // 7. Desktop Light - Treatment Plan & Odontogram 4 Quadrants
    {
      name: "07_portal_pc_light_treatment_plan.png",
      viewport: { width: 1440, height: 900 },
      url: `${BASE_URL}?theme=light&tab=plans`,
      waitMs: 1000,
    },
    // 8. Mobile Light - Invoices & 54-FZ Electronic Receipt / SBP
    {
      name: "08_portal_mobile_light_invoices.png",
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      url: `${BASE_URL}?theme=light&tab=invoices`,
      waitMs: 1000,
    },
    // 9. Mobile Light - Documents & 13% Tax Deduction (KND 1151156) & 63-FZ PEP
    {
      name: "09_portal_mobile_light_documents.png",
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      url: `${BASE_URL}?theme=light&tab=documents`,
      waitMs: 1000,
    },
    // 10. Mobile Dark - Invoices & Dark Theme Tokens
    {
      name: "10_portal_mobile_dark_invoices.png",
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      url: `${BASE_URL}?theme=dark&tab=invoices`,
      waitMs: 1000,
    },
  ];

  for (const t of targets) {
    console.log(`[Playwright] Capturing ${t.name}...`);
    const context = await browser.newContext({
      viewport: t.viewport,
      isMobile: t.isMobile || false,
      hasTouch: t.hasTouch || false,
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    await page.goto(t.url, { waitUntil: "networkidle" });
    await page.waitForTimeout(t.waitMs);

    const outPath = path.join(OUT_DIR, t.name);
    await page.screenshot({ path: outPath, fullPage: false });
    console.log(`[Playwright] Saved ${outPath}`);
    await context.close();
  }

  await browser.close();
  console.log("[Playwright] All screenshots captured successfully!");
}

run().catch((err) => {
  console.error("[Playwright Error]", err);
  process.exit(1);
});
