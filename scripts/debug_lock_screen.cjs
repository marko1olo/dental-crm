const { chromium } = require("playwright");

async function debug() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:5173", { waitUntil: "domcontentloaded" });
  await new Promise(r => setTimeout(r, 2000));

  // Find all buttons and clickable elements
  const elements = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("button, [role='button'], div, span"))
      .filter(el => el.textContent && (el.textContent.includes("Доктор Демо") || el.textContent.includes("1111") || el.textContent.includes("Войти")))
      .map(el => ({ tag: el.tagName, className: el.className, text: el.textContent.trim().slice(0, 80) }));
  });
  console.log("Clickable elements on lock screen:", JSON.stringify(elements, null, 2));

  await browser.close();
}

debug();
