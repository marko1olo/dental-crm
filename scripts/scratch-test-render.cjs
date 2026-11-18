const { chromium } = require("playwright");

async function test() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();
  page.on("console", (msg) => console.log(`[Browser ${msg.type()}]:`, msg.text()));
  page.on("pageerror", (err) => console.log(`[Browser PageError]:`, err.message));

  await page.goto("http://127.0.0.1:5174/?stand=1&demo=true#patient-card", { waitUntil: "networkidle", timeout: 20000 });
  await page.waitForTimeout(2000);
  const text = await page.evaluate(() => document.body ? document.body.innerText.slice(0, 500) : "empty");
  console.log("Body text:\n", text);
  await browser.close();
}
test().catch(e => console.error(e));
