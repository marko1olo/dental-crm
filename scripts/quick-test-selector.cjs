const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("pageerror", err => console.log("PAGE ERROR:", err.message));
  page.on("console", msg => console.log("PAGE LOG:", msg.type(), msg.text()));

  await page.goto("http://127.0.0.1:5173/?stand=cashbox#checkout", { waitUntil: "commit" });

  for (let i = 0; i < 15; i++) {
    await page.waitForTimeout(1000);
    const html = await page.evaluate(() => document.body ? document.body.innerHTML : "");
    if (!html.includes("boot-state") && html.length > 500) {
      console.log(`Mounted after ${i+1}s! Length: ${html.length}`);
      break;
    }
  }

  const finalHtml = await page.evaluate(() => document.body.innerHTML);
  console.log("Final HTML snippet:", finalHtml.slice(0, 500));

  await browser.close();
})();
