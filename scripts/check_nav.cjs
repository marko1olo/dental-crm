const { chromium } = require("playwright");

async function checkNav() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://127.0.0.1:5173/?demo=true", { waitUntil: "commit", timeout: 30000 });
  await page.waitForTimeout(6000);

  // Find all nav items
  const navs = await page.$$eval("nav button, nav a, header button, .app-navigation button, .sidebar-nav button", (els) =>
    els.map((e) => ({
      text: e.innerText?.trim().replace(/\n/g, " "),
      testId: e.getAttribute("data-testid"),
      className: e.className,
    }))
  );
  console.log("Found nav elements:", JSON.stringify(navs, null, 2));

  // Find elements with text "Документы" or "Прием"
  const targets = await page.$$eval("*", (els) =>
    els
      .filter((e) => e.children.length === 0 && (e.innerText?.includes("Прием") || e.innerText?.includes("Документы")))
      .map((e) => ({
        tag: e.tagName,
        text: e.innerText?.trim(),
        parentTag: e.parentElement?.tagName,
        parentTestId: e.parentElement?.getAttribute("data-testid"),
      }))
  );
  console.log("Targets:", JSON.stringify(targets.slice(0, 10), null, 2));

  await browser.close();
}

checkNav().catch(console.error);
