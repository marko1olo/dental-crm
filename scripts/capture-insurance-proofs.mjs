import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const OUT_DIR = path.resolve('docs/proofs/insurance');
const BRAIN_DIR = 'C:/Users/Admin/.gemini/antigravity/brain/da26b9e7-9dc9-48fe-bf01-5cf845cbb0a0';
fs.mkdirSync(OUT_DIR, { recursive: true });
if (!fs.existsSync(BRAIN_DIR)) fs.mkdirSync(BRAIN_DIR, { recursive: true });

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const targets = [
  {
    canonicalId: '01_insurance_guarantee_pc_light.png',
    legacyId: '01_insurance_pc_light_1440.png',
    theme: 'light',
    viewport: { width: 1440, height: 900 },
    isMobile: false,
  },
  {
    canonicalId: '02_insurance_guarantee_pc_dark.png',
    legacyId: '02_insurance_pc_dark_1440.png',
    theme: 'dark',
    viewport: { width: 1440, height: 900 },
    isMobile: false,
  },
  {
    canonicalId: '03_insurance_guarantee_mobile_light.png',
    legacyId: '03_insurance_mobile_light_390.png',
    theme: 'light',
    viewport: { width: 390, height: 844 },
    isMobile: true,
  },
  {
    canonicalId: '04_insurance_guarantee_mobile_dark.png',
    legacyId: '04_insurance_mobile_dark_390.png',
    theme: 'dark',
    viewport: { width: 390, height: 844 },
    isMobile: true,
  },
];

async function capture() {
  console.log('Launching browser for 4-state DMS Guarantee Letter verification...');
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  for (const t of targets) {
    console.log(`\n--- Capturing ${t.canonicalId} (${t.theme}, ${t.viewport.width}x${t.viewport.height}) ---`);
    const context = await browser.newContext({
      viewport: t.viewport,
      isMobile: t.isMobile,
      hasTouch: t.isMobile,
    });
    const page = await context.newPage();

    await page.addInitScript(({ theme }) => {
      window.localStorage.setItem('dente_theme_mode', theme);
      window.localStorage.setItem('dente_demo_mode', 'true');
      window.localStorage.setItem('dente_guide_tour_dismissed_v2', 'true');
      window.localStorage.setItem('dente_active_role', 'doctor');
    }, { theme: t.theme });

    await page.goto('http://127.0.0.1:5174/?demo=true#patients', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1000);

    // Wait for loading screen to clear
    await page.waitForFunction(() => !document.body.innerText.includes('Загрузка системы...'), { timeout: 30000 });

    // Apply theme to DOM
    await page.evaluate((theme) => {
      document.documentElement.setAttribute('data-theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
        document.documentElement.style.colorScheme = 'dark';
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
        document.documentElement.style.colorScheme = 'light';
      }

      // Suppress annoying tour overlays
      const style = document.createElement('style');
      style.id = 'suppress-overlays';
      style.innerHTML = `
        .tour-spotlight-root,
        .tour-backdrop-clickable-zone,
        [data-testid="guided-tour-spotlight-overlay"],
        [data-testid="guided-tour-coach-mark-card"],
        [data-testid="demo-mode-banner"],
        .global-toast-container,
        vite-error-overlay {
          display: none !important;
          pointer-events: none !important;
        }
      `;
      document.head.appendChild(style);
    }, t.theme);

    // Open patient card modal
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('dente-open-patient-card-modal', {
        detail: { patientId: '01a00000-0000-0000-0000-000000000001' }
      }));
    });

    const modal = page.locator('[data-testid="patient-card-modal"]');
    await modal.waitFor({ state: 'visible', timeout: 15000 });

    // Find and expand the insurance accordion inside modal
    const modalToggle = modal.locator('[data-testid="accordion-toggle-insurance"]');
    await modalToggle.waitFor({ state: 'visible', timeout: 10000 });
    await modalToggle.scrollIntoViewIfNeeded();

    const dmsPolicyInput = modal.locator('[data-testid="input-dms-policy"]');
    const isInputVisible = await dmsPolicyInput.isVisible().catch(() => false);
    if (!isInputVisible) {
      console.log('Expanding insurance accordion in modal...');
      await modalToggle.click();
      await page.waitForTimeout(600);
    }

    await dmsPolicyInput.waitFor({ state: 'visible', timeout: 5000 });

    // Open Guarantee Letter Modal directly
    const letterBtn = modal.locator('[data-testid="btn-open-dms-letters-tab"]');
    if (await letterBtn.isVisible().catch(() => false)) {
      console.log('Opening Guarantee Letter modal...');
      await letterBtn.click();
      const lettersModal = page.locator('[data-testid="dms-guarantee-letters-modal"]');
      await lettersModal.waitFor({ state: 'visible', timeout: 10000 });
      await page.waitForTimeout(1000);

      // Save Canonical Guarantee Letter Modal proof
      const canonicalPath = path.join(OUT_DIR, t.canonicalId);
      await page.screenshot({ path: canonicalPath, fullPage: false });
      const stats = fs.statSync(canonicalPath);
      console.log(`Saved: ${t.canonicalId} (${stats.size} bytes)`);

      // Copy to brain folder for artifact linking
      const brainPath = path.join(BRAIN_DIR, t.canonicalId);
      fs.copyFileSync(canonicalPath, brainPath);

      // Also copy to legacy ID for backwards compatibility
      const legacyPath = path.join(OUT_DIR, t.legacyId);
      fs.copyFileSync(canonicalPath, legacyPath);

      if (stats.size < 20000) {
        throw new Error(`File ${t.canonicalId} size (${stats.size}) is under 20KB threshold!`);
      }
    } else {
      throw new Error(`Button [data-testid="btn-open-dms-letters-tab"] not found!`);
    }

    await context.close();
  }

  await browser.close();
  console.log('\nAll 4-state DMS Guarantee Letter screenshots successfully captured and verified (>20 KB each)!');
}

capture().catch((err) => {
  console.error('Capture failed:', err);
  process.exit(1);
});
