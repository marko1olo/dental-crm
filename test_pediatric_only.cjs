const puppeteer = require('puppeteer');
const path = require('path');
const OUTPUT_DIR = path.join(require('os').homedir(), '.gemini', 'antigravity', 'brain', '49ca46e2-a0f7-43e5-a510-f484e6e15d21');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const testStates = [
    { name: "PEDIATRIC_PC_LIGHT", theme: "light", pediatricMode: true, isMobile: false },
    { name: "PEDIATRIC_PC_DARK", theme: "dark", pediatricMode: true, isMobile: false },
    { name: "PEDIATRIC_MOBILE_LIGHT", theme: "light", pediatricMode: true, isMobile: true },
    { name: "PEDIATRIC_MOBILE_DARK", theme: "dark", pediatricMode: true, isMobile: true }
  ];
  
  for (const state of testStates) {
    const page = await browser.newPage();
    if (state.isMobile) {
      await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
    } else {
      await page.setViewport({ width: 1440, height: 900 });
    }
    
    // Set theme and mode
    await page.evaluateOnNewDocument((theme, pediatric) => {
      localStorage.setItem("theme", theme);
      if (pediatric) {
        localStorage.setItem("dental-crm-pediatric-mode", "true");
      }
    }, state.theme, state.pediatricMode);

    await page.goto('http://127.0.0.1:5173/#/odontogram');
    await new Promise(r => setTimeout(r, 2000));
    
    await page.screenshot({ path: path.join(OUTPUT_DIR, `Odontogram_MultiSelect_${state.name}.png`), fullPage: true });
    console.log(`Saved ${state.name}`);
    await page.close();
  }
  await browser.close();
})();
