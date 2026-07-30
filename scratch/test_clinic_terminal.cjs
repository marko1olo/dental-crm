const { chromium } = require('playwright');
const path = require('path');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:5173/#shift');
  await page.waitForTimeout(1000);

  // Click "Общий терминал клиники" if on UserLogin
  const clinicTerminalBtn = await page.$('button:has-text("Общий терминал клиники")');
  if (clinicTerminalBtn) {
    console.log('Switching to clinic terminal mode...');
    await clinicTerminalBtn.click();
    await page.waitForTimeout(1000);
  }

  const emailInput = await page.$('input[type="email"]');
  if (emailInput) {
    console.log('Filling clinic terminal credentials...');
    await emailInput.fill('clinic@example.com');
    const passInput = await page.$('input[type="password"]');
    if (passInput) await passInput.fill('admin123');
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) await submitBtn.click();
    await page.waitForTimeout(2500);
  }

  const ssPath = path.join(__dirname, 'real_workspace_test.png');
  await page.screenshot({ path: ssPath });
  console.log('Saved workspace screenshot:', ssPath);

  await browser.close();
}

run();
