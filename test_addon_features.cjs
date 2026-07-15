const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = path.join(require('os').homedir(), '.gemini', 'antigravity', 'brain', '49ca46e2-a0f7-43e5-a510-f484e6e15d21');

async function run() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  const capture = async (name, theme, isMobile) => {
    await page.setViewport(isMobile ? { width: 375, height: 812, deviceScaleFactor: 2 } : { width: 1440, height: 900, deviceScaleFactor: 2 });
    await page.evaluate((t) => {
      if (t === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
      }
    }, theme);
    // Give it a moment to apply styles
    await new Promise(r => setTimeout(r, 1000));
    const filename = `${name}_${isMobile ? 'MOBILE' : 'PC'}_${theme.toUpperCase()}.png`;
    await page.screenshot({ path: path.join(ARTIFACT_DIR, filename), fullPage: false });
    console.log(`Saved ${filename}`);
  };

  try {
    // Navigate to the app
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
    
    // Simulate being logged in
    await page.evaluate(() => {
      localStorage.setItem('dente-token', 'test-token');
      localStorage.setItem('dente-session', JSON.stringify({ userId: 'test-user', role: 'admin' }));
    });
    
    // Test 1: Onboarding Wizard (Force show it)
    await page.evaluate(() => {
      localStorage.removeItem('dente-workspace-flags');
      window.location.href = '/?showOnboarding=true'; // Add custom flag if needed, or we just render it.
    });
    // Wait for reload
    await new Promise(r => setTimeout(r, 2000));
    
    // Wait for something in the wizard
    // In our implementation, we check for "DENTE Setup Wizard"
    const hasWizard = await page.evaluate(() => document.body.innerText.includes('DENTE Setup Wizard'));
    if (hasWizard) {
       for (const theme of ['light', 'dark']) {
         for (const isMobile of [false, true]) {
           await capture('Onboarding_Step1', theme, isMobile);
         }
       }
       // Click Next (Далее)
       await page.evaluate(() => {
           const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Далее'));
           if (btn) btn.click();
       });
       await new Promise(r => setTimeout(r, 1000));
       for (const theme of ['light', 'dark']) {
         for (const isMobile of [false, true]) {
           await capture('Onboarding_Step2', theme, isMobile);
         }
       }
    } else {
       console.log('Wizard not found. Ensure we can force render it.');
    }

    // Force hide wizard
    await page.evaluate(() => {
      localStorage.setItem('dente-workspace-flags', JSON.stringify({ setupComplete: true }));
      window.location.href = '/';
    });
    await new Promise(r => setTimeout(r, 2000));

    // Test 2: Command Palette
    await page.keyboard.down('Control');
    await page.keyboard.press('k');
    await page.keyboard.up('Control');
    await new Promise(r => setTimeout(r, 500));
    for (const theme of ['light', 'dark']) {
      for (const isMobile of [false, true]) {
        await capture('Command_Palette', theme, isMobile);
      }
    }
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 500));

    // Test 3: Voice Overlay
    // Navigate to visit view
    await page.evaluate(() => {
       window.location.hash = '#/visit/123';
    });
    await new Promise(r => setTimeout(r, 2000));
    // Find Mic button (Voice Dictation Button)
    await page.evaluate(() => {
       const btns = Array.from(document.querySelectorAll('button'));
       const micBtn = btns.find(b => b.innerHTML.includes('lucide-mic'));
       if (micBtn) micBtn.click();
    });
    await new Promise(r => setTimeout(r, 1000));
    for (const theme of ['light', 'dark']) {
      for (const isMobile of [false, true]) {
        await capture('Voice_Dictation', theme, isMobile);
      }
    }
    // Close Voice Overlay
    await page.evaluate(() => {
       const btns = Array.from(document.querySelectorAll('button'));
       const closeBtn = btns.find(b => b.innerHTML.includes('lucide-x') && getComputedStyle(b).position === 'absolute');
       if (closeBtn) closeBtn.click();
    });

    // Test 4: Cash Shift Widget in Finance View
    await page.evaluate(() => {
       window.location.hash = '#/finance';
    });
    await new Promise(r => setTimeout(r, 2000));
    for (const theme of ['light', 'dark']) {
      for (const isMobile of [false, true]) {
        await capture('Cash_Shift', theme, isMobile);
      }
    }

  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    await browser.close();
  }
}

run();
