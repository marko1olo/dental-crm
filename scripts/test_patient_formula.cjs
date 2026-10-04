const { chromium } = require("playwright");

async function run() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.addInitScript(() => {
    localStorage.setItem("dente_clinic_token", "audit-token-clinic");
    localStorage.setItem("dente_staff_token", "audit-token-staff");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_demo_showcase", "true");
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_tour_dismissed", "true");
    localStorage.setItem(
      "dente_ui_preferences_v1",
      JSON.stringify({ onboardingDismissed: true, onboardingStep: "done", version: 1 })
    );
  });

  console.log("Loading http://127.0.0.1:5173/#patients ...");
  await page.goto("http://127.0.0.1:5173/#patients", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  // Dismiss any tour modals
  await page.evaluate(() => {
    document.querySelectorAll(
      '.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone'
    ).forEach(el => el.remove());
    const dismissBtn = Array.from(document.querySelectorAll("button")).find(
      b => b.textContent && (b.textContent.includes("Больше не показывать") || b.textContent.includes("Пропустить"))
    );
    if (dismissBtn) dismissBtn.click();
  });
  await page.waitForTimeout(1000);

  // Click patient row / card for Kovalev or first patient
  console.log("Searching for patient row...");
  const patientRow = page.locator('.patient-row, .patient-card, text="Ковалёв", text="Смирнова"').first();
  if (await patientRow.isVisible()) {
    console.log("Clicking patient row...");
    await patientRow.click();
    await page.waitForTimeout(1500);
  }

  // Check if PatientCardModal is open
  const modal = page.locator('[role="dialog"], .patient-card-modal').first();
  console.log("Is modal visible:", await modal.isVisible());

  // Click tab "Зубная формула" in modal
  const formulaTab = page.locator('button:has-text("Зубная формула"), [role="tab"]:has-text("Зубная формула")').first();
  if (await formulaTab.isVisible()) {
    console.log("Clicking tab 'Зубная формула' in modal...");
    await formulaTab.click();
    await page.waitForTimeout(1500);
  }

  // Audit teeth in modal
  const teethInfo = await page.evaluate(() => {
    const teeth = [18, 17, 16, 11, 21, 27, 28, 48, 47, 46, 41, 31, 37, 38];
    const results = {};
    for (const num of teeth) {
      const el = document.querySelector(`[data-tooth-id="${num}"]`);
      if (el) {
        const r = el.getBoundingClientRect();
        results[num] = { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
      } else {
        results[num] = null;
      }
    }
    return {
      results,
      allTeethElements: Array.from(document.querySelectorAll('[data-tooth-id]')).map(el => el.getAttribute('data-tooth-id')),
    };
  });
  console.log("Teeth in modal:", JSON.stringify(teethInfo, null, 2));

  await page.screenshot({ path: "scripts/test_patient_formula.png" });
  console.log("Saved screenshot to scripts/test_patient_formula.png");

  await browser.close();
}

run().catch(console.error);
