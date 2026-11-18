const { chromium } = require("playwright");

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  page.on("console", msg => console.log("[BROWSER CONSOLE]", msg.type(), msg.text()));
  page.on("pageerror", err => console.log("[BROWSER ERROR]", err.message));
  page.on("request", req => {
    if (!req.url().includes("@vite") && !req.url().includes("node_modules")) {
      console.log("[REQ]", req.method(), req.url());
    }
  });
  page.on("requestfailed", req => console.log("[REQ FAILED]", req.url(), req.failure()?.errorText));
  page.on("response", res => { if (res.status() >= 400) console.log("[HTTP ERR]", res.status(), res.url()); });

  await page.goto("http://127.0.0.1:5173/?demo=true&payroll=1#payroll", { waitUntil: "commit" });
  await page.waitForTimeout(10000);

  const modalVis = await page.locator('[data-testid="doctor-payroll-studio-modal"]').isVisible();
  console.log("MODAL VISIBLE:", modalVis);
  if (!modalVis) {
    const modals = await page.evaluate(() => Array.from(document.querySelectorAll('[data-testid], [role="dialog"], .modal')).map(el => el.getAttribute('data-testid') || el.className));
    console.log("FOUND MODALS / TESTIDS:", modals.slice(0, 30));
  }

  await page.screenshot({ path: "docs/proofs/payroll/probe.png" });
  console.log("Probe screenshot saved!");

  await browser.close();
}

main().catch(console.error);
