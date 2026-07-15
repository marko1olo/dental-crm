const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = process.env.ARTIFACT_DIR || "C:/Users/Admin/.gemini/antigravity/brain/49ca46e2-a0f7-43e5-a510-f484e6e15d21";

async function runTest() {
  const browser = await chromium.launch({ headless: true });
  
  const capture = async (name, viewport, isDark) => {
    const context = await browser.newContext({ viewport, colorScheme: isDark ? 'dark' : 'light' });
    const page = await context.newPage();
    
    // Set cookie or localstorage if needed, but OnboardingWizard opens on / if onboardingCompleted is false
    // We'll navigate to localhost:5173
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 60000 });
    
    // If not in onboarding, trigger it somehow? Wait, it should be in onboarding if the db was cleared.
    // Let's force dark mode if needed via JS
    if (isDark) {
      await page.evaluate(() => document.documentElement.classList.add('dark'));
    } else {
      await page.evaluate(() => document.documentElement.classList.remove('dark'));
    }

    // Wait for the "Далее" button to click through the steps until step 5
    for(let i=1; i<5; i++) {
        await page.waitForTimeout(500);
        const nextBtn = page.getByRole('button', { name: 'Далее' });
        if (await nextBtn.isVisible()) {
            await nextBtn.click();
        } else {
            break;
        }
    }
    
    await page.waitForTimeout(1000); // Wait for animations
    
    const filePath = path.join(ARTIFACT_DIR, `${name}.png`);
    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`Saved screenshot: ${filePath}`);
    await context.close();
  };

  const PC = { width: 1280, height: 800 };
  const MOBILE = { width: 375, height: 812 };

  await capture("Onboarding_Staff_PC_LIGHT", PC, false);
  await capture("Onboarding_Staff_PC_DARK", PC, true);
  await capture("Onboarding_Staff_MOBILE_LIGHT", MOBILE, false);
  await capture("Onboarding_Staff_MOBILE_DARK", MOBILE, true);

  await browser.close();
}

runTest().catch(e => { console.error(e); process.exit(1); });
