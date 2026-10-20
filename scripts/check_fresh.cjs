const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) {
      console.log(">>> [MAIN FRAME NAVIGATED] >>>", frame.url());
    }
  });

  console.log("Navigating to http://127.0.0.1:5173/?demo=true ...");
  await page.goto("http://127.0.0.1:5173/?demo=true", { waitUntil: "commit" });

  for (let i = 1; i <= 25; i++) {
    await page.waitForTimeout(1000);
    try {
      const text = await page.evaluate(() => document.body?.innerText?.replace(/\n/g, " ") || "");
      const buttons = await page.evaluate(() =>
        Array.from(document.querySelectorAll("button")).map((b) => b.innerText.trim()).filter(Boolean)
      );
      console.log(`Sec ${i}: [${text.slice(0, 40)}] - Buttons: ${buttons.length}`);
      if (buttons.length > 2 || (!text.includes("Загрузка") && text.length > 50)) {
        console.log(`>>> APP LOADED AT SECOND ${i}! Buttons:`, buttons.slice(0, 10));
        break;
      }
    } catch (e) {
      console.log(`Sec ${i}: evaluation skipped during navigation (${e.message.slice(0, 50)})`);
    }
  }

  await page.screenshot({ path: "scripts/fresh_check_result.png" });
  await browser.close();
})();
