const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:5173/?demo=true#visit', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  const startNextBtn = page.locator('#btn-intake-start-next');
  if (await startNextBtn.isVisible()) {
    console.log("Found #btn-intake-start-next, clicking...");
    await startNextBtn.click();
    await page.waitForTimeout(2000);
  } else {
    console.log("Looking for patient cards in cockpit queue...");
    const patientItem = page.locator('.intake-queue-item, [data-testid^="queue-item-"]').first();
    if (await patientItem.isVisible()) {
      console.log("Found patient item in queue, clicking...");
      await patientItem.click();
      await page.waitForTimeout(2000);
    }
  }

  const hasMoreBtn = await page.locator('[data-testid="visit-header-more-actions-btn"]').count();
  console.log("After click, hasMoreBtn:", hasMoreBtn);

  if (hasMoreBtn > 0) {
    console.log("Clicking visit-header-more-actions-btn...");
    await page.locator('[data-testid="visit-header-more-actions-btn"]').click();
    await page.waitForTimeout(1000);
    const hasWarrantyBtn = await page.locator('[data-testid="visit-more-action-warranty-passport"]').count();
    console.log("hasWarrantyBtn:", hasWarrantyBtn);
    if (hasWarrantyBtn > 0) {
      console.log("Clicking visit-more-action-warranty-passport...");
      await page.locator('[data-testid="visit-more-action-warranty-passport"]').click();
      await page.waitForTimeout(1500);
      const modalVisible = await page.locator('.warranty-modal-window').isVisible();
      console.log("Modal visible:", modalVisible);
    }
  }

  await browser.close();
})();
