import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

page.on("console", (m) => console.log("PAGE LOG:", m.type(), m.text()));
page.on("pageerror", (e) => console.error("PAGE ERR:", e.message));

console.log("Navigating to http://127.0.0.1:5173/ ...");
await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2000);

const text = await page.evaluate(() => document.body.innerText);
console.log("INITIAL TEXT:", text.slice(0, 300));

const demoBtn = page.locator("text=Быстрый вход в Демо-тур").first();
if (await demoBtn.isVisible()) {
  console.log("Clicking Быстрый вход...");
  await demoBtn.click();
  await page.waitForTimeout(1000);
}

const launchBtn = page.locator(".auth-submit-btn--glow").first();
if (await launchBtn.isVisible()) {
  console.log("Clicking launch button...");
  await launchBtn.click();
  await page.waitForTimeout(4000);
}

const afterText = await page.evaluate(() => document.body.innerText);
console.log("AFTER TEXT:", afterText.slice(0, 300));

await page.screenshot({ path: "scratch-boot-check.png" });
await browser.close();
