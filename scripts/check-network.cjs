const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log(`HTTP ${response.status()} ${response.url()}`);
    }
  });

  await page.setViewport({ width: 1440, height: 900 });

  try {
    console.log("Navigating to app...");
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
    
    await new Promise(r => setTimeout(r, 2000));
    const demoBtn = await page.$('.wizard-card');
    if (demoBtn) {
        console.log("Clicking Demo Mode...");
        const cards = await page.$$('.wizard-card');
        if (cards.length > 0) {
            await cards[0].click();
            await new Promise(r => setTimeout(r, 1000));
            const proceedBtn = await page.$('.primary-button');
            if (proceedBtn) await proceedBtn.click();
            await new Promise(r => setTimeout(r, 5000));
        }
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await browser.close();
  }
})();
