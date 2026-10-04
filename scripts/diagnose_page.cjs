const { chromium } = require("playwright");

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("pageerror", (e) => console.log("[PAGE_ERROR]", e.message));
  page.on("console", (m) => console.log("[CONSOLE]", m.type(), m.text()));

  await page.route("**/api/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));

  await page.goto("http://127.0.0.1:5173/?cbct=demo", { waitUntil: "networkidle" });
  await page.screenshot({ path: "diag_page.png" });
  console.log("URL:", page.url());
  console.log("HTML:", (await page.content()).slice(0, 500));
  await browser.close();
}

main().catch(console.error);
