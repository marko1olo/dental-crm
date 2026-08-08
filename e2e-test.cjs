const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function run() {
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome', // Use local chrome
    args: ['--no-sandbox']
  });
  
  const page = await browser.newPage();
  
  page.on('pageerror', error => {
    console.error(`PAGE_ERROR: ${error.message}`);
  });
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error(`CONSOLE_ERROR: ${msg.text()}`);
    }
  });

  page.on('response', async (res) => {
      if (res.url().includes('/api/dashboard')) {
          console.log('Dashboard response status:', res.status());
          try {
              console.log('Dashboard response body:', await res.text());
          } catch (e) {}
      }
  });

  try {
    console.log('Navigating to http://127.0.0.1:5173...');
    await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' });
    
    console.log('Filling clinic login form...');
    await page.fill('input[type="email"]', 'doctor@clinic.com');
    await page.fill('input[type="password"]', 'anypassword');
    
    console.log('Clicking clinic login...');
    const [loginResponse] = await Promise.all([
        page.waitForResponse('**/api/auth/login'),
        page.click('button:has-text("Войти")')
    ]);
    console.log('Login response status:', loginResponse.status());
    console.log('Login response body:', await loginResponse.text());
    
    console.log('Waiting for Staff PIN screen...');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Click on the first staff member (e.g. Доктор И.И. Иванов or Сисадмин) if it's a list,
    // or maybe the PIN input is already visible. Let's look for a button containing "Доктор" or "Сисадмин"
    try {
        const staffButton = await page.locator('button:has-text("Доктор"), button:has-text("Сисадмин"), button:has-text("Иванов")').first();
        if (await staffButton.isVisible()) {
            await staffButton.click();
        }
    } catch (e) {
        console.log("No staff button found, maybe input is already focused");
    }
    
    await page.waitForTimeout(500);

    console.log('Typing PIN...');
    // Assuming it's a password or number input for PIN, or a custom keypad.
    // Let's try filling the first password/tel input with '0000', then '1234'
    const pinInput = page.locator('input[type="password"], input[type="tel"]').first();
    if (await pinInput.isVisible()) {
        await pinInput.fill('1234');
        // Let's see if we need to press enter or it auto-submits
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);
        // If still visible, try 0000
        if (await pinInput.isVisible()) {
            await pinInput.fill('0000');
            await page.keyboard.press('Enter');
        }
    } else {
        // Maybe it's a custom keypad
        // we can type keys directly if window listens
        await page.keyboard.type('1234');
        await page.waitForTimeout(1000);
    }
    
    console.log('Waiting for app to load...');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Give React some time

    const scratchDir = 'C:\\\\Users\\\\Admin\\\\.gemini\\\\antigravity\\\\brain\\\\afc46ccd-3c31-4b85-bb71-acc459335dff\\\\scratch';
    
    console.log('Taking dashboard screenshot...');
    await page.screenshot({ path: path.join(scratchDir, 'dashboard.png') });
    
    console.log('Navigating to Patients...');
    // Assuming there's a link or button with text "Пациенты"
    await page.click('text="Пациенты"');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(scratchDir, 'patients.png') });
    
    console.log('Navigating to Schedule...');
    // Assuming there's a link or button with text "Расписание"
    await page.click('text="Расписание"');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(scratchDir, 'schedule.png') });
    
    console.log('SUCCESS: All steps completed.');
  } catch (err) {
    console.error(`SCRIPT_ERROR: ${err.message}`);
  } finally {
    await browser.close();
  }
}

run();
