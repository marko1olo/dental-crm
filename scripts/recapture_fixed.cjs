const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const outputDirs = [
  path.resolve('C:/Clinic_MVP/dental-crm/docs/screenshots/audit_cashier_payroll'),
  path.resolve('C:/Users/Admin/.gemini/antigravity/brain/d5458772-cea5-45fe-9b05-2a284dd8ffec')
];

async function save(page, name) {
  for (const d of outputDirs) {
    const p = path.join(d, name);
    await page.screenshot({ path: p, fullPage: false });
    console.log('Saved:', p, fs.statSync(p).size, 'bytes');
  }
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });

  const targets = [
    // Scope 2: Z-Report Mobile
    { view: 'z_report', theme: 'light', isMobile: true, file: '02_cashier_z_report_modal_mobile_light.png' },
    { view: 'z_report', theme: 'dark', isMobile: true, file: '02_cashier_z_report_modal_mobile_dark.png' },
    // Scope 3: Cash Drawer Mobile
    { view: 'cash_register', theme: 'light', isMobile: true, file: '03_cash_register_drawer_modal_mobile_light.png' },
    { view: 'cash_register', theme: 'dark', isMobile: true, file: '03_cash_register_drawer_modal_mobile_dark.png' },
    // Scope 4: Doctor Payout Dashboard PC
    { view: 'doctor_payout_dashboard', theme: 'light', isMobile: false, file: '04_doctor_payout_dashboard_pc_light.png', drilldown: true },
    { view: 'doctor_payout_dashboard', theme: 'dark', isMobile: false, file: '04_doctor_payout_dashboard_pc_dark.png', drilldown: true },
    // Scope 7: Mobile Wallet
    { view: 'mobile_wallet', theme: 'light', isMobile: true, file: '07_doctor_payout_mobile_wallet_light.png' },
    { view: 'mobile_wallet', theme: 'dark', isMobile: true, file: '07_doctor_payout_mobile_wallet_dark.png' }
  ];

  for (const t of targets) {
    const ctx = await browser.newContext({
      viewport: t.isMobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }
    });
    const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:5173/cashier_payroll_preview.html?view=${t.view}&theme=${t.theme}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    if (t.drilldown) {
      const expandBtn = page.locator('button:has-text("Детализация"), .ops-drilldown-toggle').first();
      if (await expandBtn.isVisible()) {
        await expandBtn.click();
        await page.waitForTimeout(600);
      }
    }

    await save(page, t.file);
    await ctx.close();
  }

  await browser.close();
  console.log('RECAPTURE FINISHED SUCCESSFULLY!');
})();
