const { chromium } = require("playwright");

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto("http://127.0.0.1:5173/?cbct=demo", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: "scripts/debug_dump.png" });

  const modal = await page.$('[data-testid="cbct-studio-modal"]');
  console.log("cbct-studio-modal exists:", !!modal);

  const buttons = await page.$$eval("button", (btns) =>
    btns.map((b) => ({
      text: b.innerText.trim().slice(0, 30),
      testid: b.getAttribute("data-testid"),
      visible: b.offsetWidth > 0 && b.offsetHeight > 0,
    }))
  );
  console.log("Buttons count:", buttons.length);
  for (const b of buttons) {
    if (b.testid || b.text) {
      console.log(`- testid: ${b.testid} | text: "${b.text}" | visible: ${b.visible}`);
    }
  }

  await browser.close();
}

main().catch(console.error);
