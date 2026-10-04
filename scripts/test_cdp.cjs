const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
    console.log("Navigating to http://127.0.0.1:5173/?cbct=demo...");
    try {
      await page.goto("http://127.0.0.1:5173/?cbct=demo", { waitUntil: "domcontentloaded", timeout: 15000 });
      console.log("Navigation finished!");
    } catch (e) {
      console.log("page.goto error:", e.message);
    }
    console.log("Waiting 3s...");
    await page.waitForTimeout(3000);

    const cdp = await page.context().newCDPSession(page);
    const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
    
    const outPath = path.resolve("C:/Clinic_MVP/dental-crm/scripts/cdp_test.png");
    fs.writeFileSync(outPath, Buffer.from(data, "base64"));
    console.log("CDP Screenshot saved! Size:", fs.statSync(outPath).size);

    await browser.close();
    console.log("Browser closed successfully.");
  } catch (err) {
    console.log("MAIN TRY-CATCH ERROR:", err.stack || err.message || err);
  }
}

main().then(() => console.log("PROCESS COMPLETED.")).catch(err => console.log("FATAL:", err));
