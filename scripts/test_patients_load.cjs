const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().includes('PatientsView')) {
      console.log('PAGE LOG [' + msg.type() + ']:', msg.text());
    }
  });
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  // 1. Устанавливаем авторизацию
  await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_theme_mode", "light");
    localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
    localStorage.setItem("dente_guide_tour_seen_roles_v2", '["admin","doctor","director"]');
    document.documentElement.setAttribute("data-theme", "light");
    document.documentElement.className = "";
  });

  // 2. Открываем картотеку
  console.log("Navigating to #patients...");
  await page.goto("http://127.0.0.1:5173/#patients", { waitUntil: "domcontentloaded" });

  // 3. Ждем, пока исчезнет "загрузка" и появится реальный контент картотеки
  try {
    await page.waitForFunction(() => {
      const busy = document.querySelector('[aria-busy="true"]');
      const createBtn = document.querySelector('[data-testid="open-create-patient-modal-btn"]');
      const segmented = document.querySelector('[data-testid="patients-category-segmented-bar"]');
      return !busy && (createBtn || segmented);
    }, { timeout: 15000 });
    console.log("SUCCESS: PatientsView is fully mounted and ready!");
  } catch (e) {
    console.log("TIMEOUT waiting for PatientsView mount:", e.message);
    const content = await page.evaluate(() => document.body.innerText.slice(0, 500));
    console.log("Page text sample:", content);
  }

  await page.screenshot({ path: "docs/screenshots/audit_patients_booking/test_patients_pc_real.png" });
  await browser.close();
})();
