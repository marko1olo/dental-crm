const { chromium } = require("playwright");
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROME_PATH,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://127.0.0.1:5173/#imaging");
  await page.waitForTimeout(3000);
  const info = await page.evaluate(() => {
    return {
      url: window.location.href,
      buttons: Array.from(document.querySelectorAll("button")).map(b => b.textContent?.trim() || b.getAttribute("aria-label")),
      hasAppShell: !!document.querySelector(".app-shell"),
      hasImagingLayout: !!document.querySelector(".imaging-layout"),
      hasLogin: !!document.querySelector(".login-view, .auth-view"),
      bodyText: document.body.innerText.substring(0, 300)
    };
  });
  console.log("Page info:", JSON.stringify(info, null, 2));
  await browser.close();
})();
