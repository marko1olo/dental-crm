const { chromium } = require("playwright");

async function run() {
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://127.0.0.1:5173", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  console.log("Initial url:", page.url());

  const demoBtn = page.locator("text=Быстрый вход в Демо-тур").first();
  if (await demoBtn.isVisible()) {
    console.log("Clicking demo tour...");
    await demoBtn.click();
    await page.waitForTimeout(1500);
    const launchBtn = page.locator(".auth-submit-btn--glow").first();
    if (await launchBtn.isVisible()) {
      console.log("Clicking launch role...");
      await launchBtn.click();
      await page.waitForTimeout(3000);
    }
  }
  console.log("After auth url:", page.url());

  // Remove tour spotlights
  await page.evaluate(() => {
    document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone').forEach((el) => el.remove());
  });

  // Navigate to /priem or click Прием
  const visitBtn = page.locator('button:has-text("Прием"), a:has-text("Прием"), [data-testid="nav-visit"]').first();
  if (await visitBtn.isVisible()) {
    console.log("Clicking Прием button...");
    await visitBtn.click();
    await page.waitForTimeout(2500);
  }

  // Remove tour spotlights again
  await page.evaluate(() => {
    document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone').forEach((el) => el.remove());
  });

  // Check tabs on the page
  const tabs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[role="tab"], button')).map(t => t.textContent.trim()).filter(Boolean);
  });
  console.log("Found tabs/buttons in view:", tabs.filter(t => t.includes("формула") || t.includes("ЭМК") || t.includes("043") || t.includes("Прием") || t.includes("зуб")));

  // Click tab "Зубная формула"
  const formulaTab = page.locator('button:has-text("Зубная формула"), [role="tab"]:has-text("Зубная формула")').first();
  if (await formulaTab.isVisible()) {
    console.log("Clicking tab 'Зубная формула'...");
    await formulaTab.click();
    await page.waitForTimeout(2000);
  }

  // Check what teeth or odontogram elements exist
  const odontogramInfo = await page.evaluate(() => {
    const toothChart = document.querySelector(".tooth-chart-container, .odontogram-view-container, .tooth-arch-container");
    const teeth = Array.from(document.querySelectorAll("[data-tooth-id], .tooth-card, .tooth-cell, [data-tooth]")).map(el => {
      return el.getAttribute("data-tooth-id") || el.getAttribute("data-tooth") || el.textContent.trim();
    });
    return {
      hasToothChart: Boolean(toothChart),
      chartClass: toothChart ? toothChart.className : null,
      teethCount: teeth.length,
      sampleTeeth: teeth.slice(0, 10),
    };
  });
  console.log("Odontogram probe info:", odontogramInfo);

  await page.screenshot({ path: "scripts/probe_crm_view.png" });
  console.log("Screenshot saved to scripts/probe_crm_view.png");

  await browser.close();
}

run().catch(console.error);
