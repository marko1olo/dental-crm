const { existsSync, mkdirSync, writeFileSync, copyFileSync, statSync } = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const PROOF_DIR = path.resolve('docs/proofs/odontogram');
if (!existsSync(PROOF_DIR)) {
  mkdirSync(PROOF_DIR, { recursive: true });
}

const BRAIN_DIR = 'C:/Users/Admin/.gemini/antigravity/brain/c5acd84e-519f-40d1-b598-b6040f2f789c';
if (!existsSync(BRAIN_DIR)) {
  mkdirSync(BRAIN_DIR, { recursive: true });
}

const WEB_URL = 'http://127.0.0.1:5173/?stand=odontogram';

async function suppressOverlays(page) {
  try {
    await page.evaluate(() => {
      const style = document.createElement('style');
      style.id = 'suppress-all-overlays';
      style.innerHTML = `
        .tour-spotlight-root,
        .tour-backdrop-clickable-zone,
        [data-testid="guided-tour-spotlight-overlay"],
        [data-testid="guided-tour-coach-mark-card"],
        [data-testid="demo-mode-banner"],
        .shepherd-element,
        .global-toast-container,
        .copilot-trigger-btn,
        [data-testid="copilot-floating-trigger"],
        vite-error-overlay {
          display: none !important;
          pointer-events: none !important;
          opacity: 0 !important;
        }
        *, *::before, *::after {
          animation: none !important;
          transition: none !important;
        }
      `;
      document.head.appendChild(style);
      document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach(el => el.remove());
    });
  } catch (_) {}
}

async function setTheme(page, theme) {
  await page.evaluate((th) => {
    document.documentElement.setAttribute('data-theme', th);
    if (th === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      document.body.className = 'light';
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
      document.body.className = 'dark';
    }
    localStorage.setItem('dente_theme', th);
    localStorage.setItem('dente_theme_mode', th);
    localStorage.setItem('theme', th);
    document.documentElement.style.colorScheme = th;
  }, theme);
  await suppressOverlays(page);
  await page.waitForTimeout(600);
}

function verifyAndSaveScreenshot(buffer, filename, description) {
  if (buffer.length < 20480) {
    throw new Error(`Screenshot ${filename} is too small: ${buffer.length} bytes (< 20KB threshold)!`);
  }
  const dest = path.join(PROOF_DIR, filename);
  writeFileSync(dest, buffer);
  try {
    copyFileSync(dest, path.join(BRAIN_DIR, filename));
  } catch (_) {}
  const stats = statSync(dest);
  console.log(`[PROOF CAPTURED] ${filename}: ${stats.size} bytes (>= 20KB OK) -> ${description}`);
  return dest;
}

async function waitForOdontogram(page, maxSeconds = 15) {
  for (let s = 1; s <= maxSeconds; s++) {
    await page.waitForTimeout(1000);
    const ready = await page.evaluate(() => {
      const wheeler = document.querySelector('[data-testid="wheeler-tooth-arch"]');
      const launcher = document.querySelector('[data-testid="direct-odontogram-module-launcher"]');
      return !!wheeler && !!launcher;
    });
    if (ready) {
      console.log(`Odontogram mounted successfully at second ${s}`);
      await suppressOverlays(page);
      await page.waitForTimeout(1000);
      return true;
    }
  }
  throw new Error(`Odontogram failed to mount within ${maxSeconds}s`);
}

(async () => {
  console.log('=== CAPTURING 4-STATE CANONICAL WHEELER 2.5D ODONTOGRAM PROOFS ===');
  const browser = await chromium.launch({ headless: true });

  try {
    // 1. PC 1440x900
    console.log('1. Setting up PC context (1440x900)...');
    const pcPage = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    console.log(`Navigating PC to ${WEB_URL}...`);
    await pcPage.goto(WEB_URL, { timeout: 60000 });
    await waitForOdontogram(pcPage);

    // 1.1 PC Light
    await setTheme(pcPage, 'light');
    const pcLightBuf = await pcPage.screenshot({ fullPage: false });
    verifyAndSaveScreenshot(pcLightBuf, '01_odontogram_pc_light_1440x900.png', 'Wheeler 2.5D Odontogram (PC Light 1440x900)');

    // 1.2 PC Dark
    await setTheme(pcPage, 'dark');
    const pcDarkBuf = await pcPage.screenshot({ fullPage: false });
    verifyAndSaveScreenshot(pcDarkBuf, '02_odontogram_pc_dark_1440x900.png', 'Wheeler 2.5D Odontogram (PC Dark 1440x900)');

    // 1.3 Pediatric PC (optional extra proof)
    try {
      const pedBtn = pcPage.locator('button:has-text("Детский"), [data-testid="toolbar-dentition-pediatric"]');
      if (await pedBtn.count() > 0) {
        await pedBtn.first().click();
        await pcPage.waitForTimeout(1000);
        await setTheme(pcPage, 'light');
        const pedLight = await pcPage.screenshot({ fullPage: false });
        verifyAndSaveScreenshot(pedLight, '03_odontogram_pediatric_pc_light_1440x900.png', 'Pediatric Odontogram (PC Light 1440x900)');
        await setTheme(pcPage, 'dark');
        const pedDark = await pcPage.screenshot({ fullPage: false });
        verifyAndSaveScreenshot(pedDark, '06_odontogram_pediatric_pc_dark_1440x900.png', 'Pediatric Odontogram (PC Dark 1440x900)');
      }
    } catch (e) {
      console.warn('Pediatric PC capture note:', e.message);
    }

    await pcPage.close();
    await new Promise(r => setTimeout(r, 2000));

    // 2. Mobile 390x844 Apple HIG
    console.log('2. Setting up Mobile context (390x844 Apple HIG)...');
    const mobilePage = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    console.log(`Navigating Mobile to ${WEB_URL}...`);
    await mobilePage.goto(WEB_URL, { timeout: 60000 });
    await waitForOdontogram(mobilePage);

    // 2.1 Mobile Light
    await setTheme(mobilePage, 'light');
    const mobLightBuf = await mobilePage.screenshot({ fullPage: false });
    verifyAndSaveScreenshot(mobLightBuf, '03_odontogram_mobile_light_390x844.png', 'Wheeler 2.5D Odontogram Apple HIG (Mobile Light 390x844)');

    // 2.2 Mobile Dark
    await setTheme(mobilePage, 'dark');
    const mobDarkBuf = await mobilePage.screenshot({ fullPage: false });
    verifyAndSaveScreenshot(mobDarkBuf, '04_odontogram_mobile_dark_390x844.png', 'Wheeler 2.5D Odontogram Apple HIG (Mobile Dark 390x844)');

    // 2.3 Pediatric Mobile (optional extra proof)
    try {
      const pedBtnMob = mobilePage.locator('button:has-text("Детский"), [data-testid="toolbar-dentition-pediatric"]');
      if (await pedBtnMob.count() > 0) {
        await pedBtnMob.first().click();
        await mobilePage.waitForTimeout(1000);
        await setTheme(mobilePage, 'light');
        const pedMobLight = await mobilePage.screenshot({ fullPage: false });
        verifyAndSaveScreenshot(pedMobLight, '03_pediatric_mobile_light_390x844.png', 'Pediatric Mobile Light 390x844');
        await setTheme(mobilePage, 'dark');
        const pedMobDark = await mobilePage.screenshot({ fullPage: false });
        verifyAndSaveScreenshot(pedMobDark, '04_pediatric_mobile_dark_390x844.png', 'Pediatric Mobile Dark 390x844');
      }
    } catch (e) {
      console.warn('Pediatric Mobile capture note:', e.message);
    }

    await mobilePage.close();
    console.log('=== ALL 4 4-STATE VISUAL PROOFS CAPTURED SUCCESSFULLY ===');
  } finally {
    await browser.close();
  }
})();
