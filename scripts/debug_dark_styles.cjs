const { chromium } = require("playwright");

async function check() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => {
    localStorage.setItem("dente_clinic_token", "dental_live_token");
    localStorage.setItem("dente_staff_token", "staff_live_token");
    localStorage.setItem("dente_active_session_token", "session_token_123");
    localStorage.setItem("dente_organization_id", "org_dental_1");
    localStorage.setItem("dente_user_role", "doctor");
    localStorage.setItem("dente_role", "doctor");
    localStorage.setItem("dente_perspective", "doctor");
    localStorage.setItem("dente_theme", "dark");
    localStorage.setItem("dente_theme_mode", "dark");
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:5173/?demo=true#documents", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    document.documentElement.classList.add("dark");
    document.body.classList.add("dark");
  });
  const contractBtn = page.locator('[data-testid="btn-open-treatment_contract_paid"]').first();
  await contractBtn.click();
  await page.waitForTimeout(2000);

  const colors = await page.evaluate(() => {
    const title = document.querySelector(".a4-doc-title");
    const heading = document.querySelector(".a4-section-heading");
    const p = document.querySelector(".a4-p");
    const sheet = document.querySelector(".pro-a4-physical-sheet");
    const tableHeader = document.querySelector(".a4-table th");
    const tableCell = document.querySelector(".a4-table td");
    return {
      title: title ? window.getComputedStyle(title).color : null,
      heading: heading ? window.getComputedStyle(heading).color : null,
      p: p ? window.getComputedStyle(p).color : null,
      tableHeaderBg: tableHeader ? window.getComputedStyle(tableHeader).backgroundColor : null,
      tableHeaderColor: tableHeader ? window.getComputedStyle(tableHeader).color : null,
      tableCellBg: tableCell ? window.getComputedStyle(tableCell).backgroundColor : null,
      tableCellColor: tableCell ? window.getComputedStyle(tableCell).color : null,
      sheetBg: sheet ? window.getComputedStyle(sheet).backgroundColor : null,
    };
  });
  console.log("ACTUAL COMPUTED COLORS:", colors);
  await browser.close();
}

check().catch(console.error);
