const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

async function testUrl() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  const testUrls = [
    { url: "http://127.0.0.1:5173/tgapp?org=00000000-0000-0000-0000-000000000001", name: "tgapp_direct" },
    { url: "http://127.0.0.1:5173/#/portal/cabinet/00000000-0000-0000-0000-000000000001", name: "cabinet_with_org" },
    { url: "http://127.0.0.1:5173/#/portal/booking/00000000-0000-0000-0000-000000000001", name: "booking_with_org" },
  ];

  for (const item of testUrls) {
    console.log(`Opening ${item.url}...`);
    await page.goto(item.url, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    const title = await page.title();
    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 200));
    console.log(`[${item.name}] Body preview: ${bodyText.replace(/\n/g, " ")}`);
    const screenshotPath = `C:\\Clinic_MVP\\dental-crm\\docs\\screenshots\\mobile_portal\\test_${item.name}.png`;
    await page.screenshot({ path: screenshotPath });
    console.log(`Saved screenshot ${screenshotPath} (${fs.statSync(screenshotPath).size} bytes)`);
  }

  await browser.close();
}

testUrl();
