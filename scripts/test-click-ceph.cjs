const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

async function testClickCeph() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log("Navigating to http://127.0.0.1:5173/#ortho-protocol...");
  await page.goto("http://127.0.0.1:5173/#ortho-protocol", { waitUntil: "commit", timeout: 30000 });
  await page.waitForSelector(".boot-state", { state: "detached", timeout: 20000 }).catch(() => {});

  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent("dente:open-ortho"));
  });

  await page.waitForSelector('.ortho-studio-modal', { timeout: 20000 });
  console.log("Ortho studio modal opened!");

  // Click on "Фото и ТРГ" tab
  console.log("Clicking 'Фото и ТРГ' tab...");
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const photoTab = buttons.find((b) => b.textContent && b.textContent.includes("Фото и ТРГ"));
    if (photoTab) photoTab.click();
  });
  await page.waitForTimeout(1000);

  // Take screenshot of photo_trg tab
  const tabBuf = await page.screenshot();
  fs.writeFileSync(path.join(__dirname, "../docs/proofs/orthodontics/05_ortho_trg_tab_pc_light_1440x900.png"), tabBuf);
  console.log("Saved photo_trg tab screenshot!");

  // Click on "Анализ ТРГ" button
  console.log("Clicking 'Анализ ТРГ' button...");
  const clicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const cephBtn = buttons.find((b) => b.textContent && b.textContent.includes("Анализ ТРГ"));
    if (cephBtn) {
      cephBtn.click();
      return true;
    }
    return false;
  });
  console.log("Ceph button found and clicked:", clicked);
  await page.waitForTimeout(2000);

  // Take screenshot after click
  const cephBuf = await page.screenshot();
  fs.writeFileSync(path.join(__dirname, "../docs/proofs/orthodontics/test_ceph_after_click.png"), cephBuf);
  console.log("Saved after click screenshot, size:", fs.statSync(path.join(__dirname, "../docs/proofs/orthodontics/test_ceph_after_click.png")).size);

  await browser.close();
}

testClickCeph().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
