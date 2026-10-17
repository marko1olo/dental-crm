import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const OUT_DIR = path.resolve('docs/proofs/insurance');
fs.mkdirSync(OUT_DIR, { recursive: true });

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const targets = [
  {
    id: '01_insurance_pc_light_1440.png',
    theme: 'light',
    viewport: { width: 1440, height: 900 },
    isMobile: false,
  },
  {
    id: '02_insurance_pc_dark_1440.png',
    theme: 'dark',
    viewport: { width: 1440, height: 900 },
    isMobile: false,
  },
  {
    id: '03_insurance_mobile_light_390.png',
    theme: 'light',
    viewport: { width: 390, height: 844 },
    isMobile: true,
  },
  {
    id: '04_insurance_mobile_dark_390.png',
    theme: 'dark',
    viewport: { width: 390, height: 844 },
    isMobile: true,
  },
];

async function capture() {
  console.log('Launching browser for 4-state DMS and Insurance verification...');
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  for (const t of targets) {
    console.log(`\n--- Capturing ${t.id} (${t.theme}, ${t.viewport.width}x${t.viewport.height}) ---`);
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

    await page.goto('http://127.0.0.1:5173/?demo=true#patients', { waitUntil: 'domcontentloaded', timeout: 30000 });
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

    // Click СОГАЗ chip inside modal
    const sogazChip = modal.locator('button:has-text("СОГАЗ")').first();
    if (await sogazChip.isVisible().catch(() => false)) {
      await sogazChip.click();
      await page.waitForTimeout(150);
    }

    // Fill policy details
    await modal.locator('[data-testid="input-dms-policy"]').fill('ДМС-2026/00123');
    await modal.locator('[data-testid="input-dms-letter-number"]').fill('ГП-8841/26');
    await modal.locator('[data-testid="input-dms-coverage-limit"]').fill('50000');

    // Scroll DMS card into view
    const dmsCompanyInput = modal.locator('[data-testid="input-dms-company"]');
    await dmsCompanyInput.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);

    const screenshotPath = path.join(OUT_DIR, t.id);
    await page.screenshot({ path: screenshotPath, fullPage: false });

    const stats = fs.statSync(screenshotPath);
    console.log(`Saved: ${t.id} (${stats.size} bytes)`);
    if (stats.size < 20000) {
      throw new Error(`File ${t.id} size (${stats.size}) is under 20KB threshold!`);
    }

    // If PC Light, also capture 05_insurance_guarantee_letters_pc_light.png
    if (t.id === '01_insurance_pc_light_1440.png') {
      const letterBtn = modal.locator('[data-testid="btn-open-dms-letters-tab"]');
      if (await letterBtn.isVisible().catch(() => false)) {
        console.log('Opening Guarantee Letter modal...');
        await letterBtn.click();
        const lettersModal = page.locator('[data-testid="dms-guarantee-letters-modal"]');
        await lettersModal.waitFor({ state: 'visible', timeout: 10000 });
        await page.waitForTimeout(800);

        const lettersScreenshotPath = path.join(OUT_DIR, '05_insurance_guarantee_letters_pc_light.png');
        await page.screenshot({ path: lettersScreenshotPath, fullPage: false });
        const letterStats = fs.statSync(lettersScreenshotPath);
        console.log(`Saved: 05_insurance_guarantee_letters_pc_light.png (${letterStats.size} bytes)`);
        if (letterStats.size < 20000) {
          throw new Error(`05_insurance_guarantee_letters_pc_light.png size (${letterStats.size}) is under 20KB!`);
        }
      }
    }

    await context.close();
  }

  await browser.close();
  console.log('\nAll canonical insurance screenshots successfully captured and verified (>20 KB each)!');
}

capture().catch((err) => {
  console.error('Capture failed:', err);
  process.exit(1);
});
