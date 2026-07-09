const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = 'C:/Clinic_MVP/dental-crm/docs/proofs/ui_audit';

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const browser = await chromium.launch({ headless: true });
  
  const states = [
    { name: "PC_LIGHT",    width: 1366, height: 900,  theme: "light" },
    { name: "PC_DARK",     width: 1366, height: 900,  theme: "dark"  },
    { name: "MOBILE_LIGHT",width: 390,  height: 844,  theme: "light" },
    { name: "MOBILE_DARK", width: 390,  height: 844,  theme: "dark"  }
  ];

  for (const state of states) {
    const context = await browser.newContext({ viewport: { width: state.width, height: state.height }, colorScheme: state.theme });
    const page = await context.newPage();

    await page.addInitScript((t) => {
      localStorage.setItem("dente_theme", t);
      localStorage.setItem("dente_dev_bypass_auth", "true");
      const jwt = "eyJvcmdhbml6YXRpb25JZCI6ImNsaW5pYy0xIiwicm9sZSI6ImFkbWluIiwiZXhwIjoxNzgzOTc2MzM4fQ.X";
      localStorage.setItem("dente_auth_token", jwt);
    }, state.theme);

    const mockDashboardData = fs.readFileSync(path.join(__dirname, 'mock-dashboard.json'), 'utf8');
    await page.route(/\/api\//, async (route) => {
      const url = route.request().url();
      if (url.includes('/api/dashboard')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: mockDashboardData });
      } else if (url.includes('/api/auth/user/me')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'u-123', role: 'doctor', name: 'Dr. House', organizationId: 'clinic-1' }) });
      } else if (url.includes('/api/odontogram/tooth-history')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
          { id: 'h1', toothId: 36, eventDate: '2023-01-15T10:00:00Z', title: 'Осмотр', doctorName: 'Dr. House', summary: 'Patient complained of pain in lower left quadrant. X-ray taken.' },
          { id: 'h2', toothId: 36, eventDate: '2023-02-15T10:00:00Z', title: 'Лечение кариеса', doctorName: 'Dr. House', summary: 'Caries removed. Composite filling placed.' }
        ])});
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, id: 'mock-123', hash: 'mock-hash-123', data: [] }) });
      }
    });

    // Tooth History & Signature Canvas (both on Odontogram page)
    await page.goto('http://127.0.0.1:5173/');
    await wait(2000);
    await page.evaluate(() => { window.location.hash = "#/odontogram"; });
    await wait(2000);
    
    // History
    await page.evaluate(() => {
      const tooth36 = document.querySelector('[data-tooth-id="36"]');
      if (tooth36) tooth36.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    });
    await wait(1000);
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const histBtn = btns.find(b => b.textContent && b.textContent.includes('История зуба'));
      if (histBtn) histBtn.click();
    });
    await wait(1000);
    await page.screenshot({ path: path.join(OUTPUT_DIR, `ToothHistory_Opened_${state.name}.png`), fullPage: true });

    // Close History if open
    await page.evaluate(() => {
      const closeBtn = document.querySelector('.w-80 button');
      if (closeBtn) closeBtn.click();
    });
    await wait(500);

    // Signature Canvas (in TreatmentEstimator)
    await page.evaluate(() => {
      const signBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Подписать'));
      if (signBtn) signBtn.click();
    });
    await wait(1000);
    await page.screenshot({ path: path.join(OUTPUT_DIR, `Signature_Canvas_Drawn_${state.name}.png`), fullPage: true });

    // Visit CoSign
    await page.goto('http://127.0.0.1:5173/');
    await wait(2000);
    await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll("a, button, [role='button'], nav *"));
        const target = links.find(el => {
          const text = (el.textContent || "").toLowerCase().trim();
          return text.includes("прием");
        });
        if (target) target.click();
    });
    await wait(2000);
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('ПОДПИСАТЬ'));
      if (btn) btn.click();
    });
    await wait(1000);
    await page.evaluate(() => {
      const pinBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Подтвердить'));
      if (pinBtn) pinBtn.click();
    });
    await wait(1000);
    await page.screenshot({ path: path.join(OUTPUT_DIR, `Diary_CoSigned_${state.name}.png`), fullPage: true });

    await context.close();
  }

  await browser.close();
  console.log('Screenshots done');
})();
