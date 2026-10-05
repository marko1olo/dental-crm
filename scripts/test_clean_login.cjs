const { chromium } = require("playwright");

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://127.0.0.1:5173/", { waitUntil: "commit" });
  console.log("Waiting for loading splash to detach...");
  await page.waitForSelector("text=Загрузка системы...", { state: "detached", timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1000);

  const loginBtn = page.locator("button:has-text('Войти в систему')").first();
  console.log("Login btn count:", await loginBtn.count());
  if (await loginBtn.count() > 0) {
    await loginBtn.click();
    console.log("Clicked login. Waiting for post-login dashboard loading...");
    await page.waitForTimeout(1000);
    await page.waitForSelector("text=Загрузка системы...", { state: "detached", timeout: 25000 }).catch(() => {});
    await page.waitForTimeout(2000);
  }

  const demoTourBtn = page.locator("button:has-text('Быстрый вход в Демо-тур')").first();
  if (await demoTourBtn.count() > 0) {
    console.log("Demo tour btn found, clicking...");
    await demoTourBtn.click();
    await page.waitForTimeout(800);
    const launchDemoBtn = page.locator("button.auth-submit-btn, button:has-text('Войти в демо-тур')").first();
    if (await launchDemoBtn.count() > 0) {
      console.log("Launching demo tour...");
      await launchDemoBtn.click();
      await page.waitForTimeout(3000);
    }
  }

  await page.screenshot({ path: "test_clean_login.png" });
  console.log("Saved test_clean_login.png");
  await browser.close();
}

main().catch(console.error);
