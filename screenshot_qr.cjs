const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1280, height: 800 });

  // Enable request interception to mock API
  await page.setRequestInterception(true);
  page.on('request', request => {
    const url = request.url();
    if (url.includes('/api/')) {
      request.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    } else {
      request.continue();
    }
  });

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });

  // Add temp auth token
  await page.evaluate(() => {
    localStorage.setItem('dente_auth_token', 'temp');
    localStorage.setItem('dente_auth_user', JSON.stringify({
      id: '00000000-0000-0000-0000-000000000000',
      role: 'owner',
      firstName: 'Admin',
      lastName: 'Adminov'
    }));
  });

  await page.reload({ waitUntil: 'networkidle2' });

  // Wait for the QR button to appear (it should have a QrCode icon or title="QR-Доступ")
  try {
    await page.waitForSelector('button[title="QR-Доступ"]', { timeout: 10000 });
    console.log("Found QR button. Clicking it...");
    await page.click('button[title="QR-Доступ"]');
    
    // Wait for popover to animate in
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await page.screenshot({ path: 'QR_Gateway_Panel_PC_LIGHT.png' });
    console.log("Screenshot saved to QR_Gateway_Panel_PC_LIGHT.png");
    
    // Switch to dark mode and take screenshot
    await page.evaluate(() => {
      document.body.setAttribute('data-theme', 'dark');
      document.documentElement.classList.add('dark');
      document.body.classList.add('theme-dark');
    });
    
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.screenshot({ path: 'QR_Gateway_Panel_PC_DARK.png' });
    console.log("Screenshot saved to QR_Gateway_Panel_PC_DARK.png");

  } catch (err) {
    console.error("Failed to screenshot QR panel:", err);
    await page.screenshot({ path: 'ERROR_SCREEN.png' });
  }

  await browser.close();
})();
