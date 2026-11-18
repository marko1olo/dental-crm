const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:5173/?demo=true&patientId=pat-1#ceph");
  await page.waitForTimeout(4000);
  const selector = await page.$('.ceph-modal-overlay, [data-testid="cephalometric-analysis-modal"], .cephalometric-modal');
  console.log("Ceph selector found:", Boolean(selector));
  const text = await page.evaluate(() => document.body.innerText.slice(0, 300));
  console.log("Body:", text);
  await page.screenshot({ path: "C:/Users/Admin/.gemini/antigravity/brain/fc9596ea-4600-46c4-8e60-4eacd4ac8ea8/debug_ceph.png" });
  await browser.close();
})();
