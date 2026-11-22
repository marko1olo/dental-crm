const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on("console", msg => console.log("PAGE LOG:", msg.type(), msg.text()));
  page.on("pageerror", err => console.log("PAGE ERROR:", err.message));
  
  await page.goto("http://127.0.0.1:5173/?standalone=settings#settings/access", { waitUntil: "commit" });
  await page.waitForTimeout(5000);
  
  const hasOverlay = await page.evaluate(() => !!document.querySelector("vite-error-overlay"));
  const overlayText = await page.evaluate(() => {
    const el = document.querySelector("vite-error-overlay");
    return el ? (el.shadowRoot ? el.shadowRoot.textContent : el.textContent) : null;
  });
  console.log("VITE OVERLAY:", hasOverlay, overlayText);
  
  await browser.close();
})();
