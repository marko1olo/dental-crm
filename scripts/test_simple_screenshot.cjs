const { chromium } = require("playwright");

async function main() {
  console.log("1. Launching browser...");
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    console.log("2. Navigating to about:blank...");
    await page.goto("about:blank");
    console.log("3. Taking blank screenshot...");
    const t0 = Date.now();
    await page.screenshot({ path: "docs/screenshots/test_blank.png" });
    console.log(`4. Saved blank screenshot in ${Date.now() - t0}ms!`);

    await page.addInitScript(() => {
      localStorage.setItem("dente_clinic_token", "live-token");
      localStorage.setItem("dente_staff_token", "live-token");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_theme_mode", "dark");
    });

    console.log("5. Navigating to http://127.0.0.1:5173/?cbct=demo...");
    await page.goto("http://127.0.0.1:5173/?cbct=demo", { waitUntil: "domcontentloaded" });
    console.log("6. Waiting for [data-testid='cbct-studio-modal']...");
    try {
      const modal = await page.waitForSelector('[data-testid="cbct-studio-modal"]', { timeout: 45000 });
      console.log("7. Modal found! Taking screenshot of modal...");
      await modal.screenshot({ path: "docs/screenshots/test_cbct_modal.png", timeout: 15000 });
      console.log("8. Saved cbct modal screenshot!");
    } catch (err) {
      console.log("WAIT ERROR:", err.message);
      await page.screenshot({ path: "docs/screenshots/what_is_on_screen.png", timeout: 15000 });
      const htmlSnippet = await page.evaluate(() => document.body.innerText.slice(0, 500));
      console.log("Body innerText preview:", htmlSnippet);
    }
  } finally {
    await browser.close();
    console.log("8. Done.");
  }
}

main().catch(console.error);
